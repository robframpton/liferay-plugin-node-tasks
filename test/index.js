'use strict';

var _ = require('lodash');
var chai = require('chai');
var del = require('del');
var fs = require('fs-extra');
var GogoShellHelper = require('gogo-shell-helper');
var Gulp = require('gulp').Gulp;
var os = require('os');
var path = require('path');
var registerTasks;
var sinon = require('sinon');

var gulp = new Gulp();

chai.use(require('chai-fs'));
var assert = chai.assert;

var tempPath = path.join(os.tmpdir(), 'liferay-plugin-tasks', 'test-plugin-layouttpl');

var deployPath = path.join(tempPath, '../appserver/deploy');

describe('Lifray Plugin Tasks', function() {
	var runSequence;

	before(function(done) {
		this.timeout(10000);

		var instance = this;

		instance._initCwd = process.cwd();

		fs.copy(path.join(__dirname, './fixtures/plugins/test-plugin-layouttpl'), tempPath, function(err) {
			if (err) throw err;

			process.chdir(tempPath);

			registerTasks = require('../index').registerTasks;

			registerTasks({
				gulp: gulp,
				gogoShellConfig: {
					host: '0.0.0.0',
					port: 1337
				}
			});

			runSequence = require('run-sequence').use(gulp);

			var store = gulp.storage;

			store.set('deployPath', deployPath);

			fs.mkdirsSync(deployPath);

			done();
		});
	});

	after(function(done) {
		var instance = this;

		del([path.join(tempPath, '**')], {
			force: true
		}).then(function() {
			process.chdir(instance._initCwd);

			done();
		});
	});

	afterEach(function() {
		del.sync(path.join(deployPath, '**'), {
			force: true
		});
	});

	describe('plugin:deploy', function() {
		it('should deploy war file to specified appserver', function(done) {
			runSequence('plugin:war', 'plugin:deploy', function() {
				assert.isFile(path.join(deployPath, 'test-plugin-layouttpl.war'));

				assert(gulp.storage.get('deployed'), 'deployed is set to true');

				done();
			});
		});
	});

	describe('plugin:deploy-gogo', function() {
		var helper;

		before(function() {
			helper = GogoShellHelper.start({
				commands: [
					{
						command: 'install webbundle',
						response: 'Bundle ID: 123'
					},
					{
						command: 'start'
					}
				]
			});
		});

		after(function() {
			try {
				helper.close();
			}
			catch (e) {
			}
		});

		it('should attempt to deploy via gogo shell', function(done) {
			runSequence('plugin:war', 'plugin:deploy-gogo', function() {
				done();
			});
		});

		it('should log error', function(done) {
			helper.setCommands([
				{
					command: 'install webbundle'
				},
				{
					command: 'start'
				}
			]);

			var gutil = require('gulp-util');

			var log = gutil.log;

			gutil.log = sinon.spy();

			runSequence('plugin:war', 'plugin:deploy-gogo', function() {
				assert(gutil.log.getCall(0).args[0].indexOf('Something went wrong') > -1);

				gutil.log = log;

				done();
			});
		});

		it('should log error due to disconnection', function(done) {
			helper.close();

			var gutil = require('gulp-util');

			var log = gutil.log;

			gutil.log = sinon.spy();

			runSequence('plugin:war', 'plugin:deploy-gogo', function() {
				assert(gutil.log.getCall(0).args[0].indexOf('ECONNREFUSED') > -1);

				gutil.log = log;

				done();
			});
		});
	});

	describe('plugin:init', function() {
		it('should prompt user for appserver information', function() {
			var InitPrompt = require('../lib/init_prompt');

			var _prompt = InitPrompt.prototype._prompt;

			InitPrompt.prototype._prompt = sinon.spy();

			runSequence('plugin:init', _.noop);

			assert(InitPrompt.prototype._prompt.calledOnce, '_prompt was invoked');

			var args = InitPrompt.prototype._prompt.getCall(0).args;

			assert.deepEqual(args[0].store, gulp.storage);
			assert(_.endsWith(args[0].appServerPathDefault, 'tomcat'), 'it adds tomcat to default path');

			InitPrompt.prototype._prompt = _prompt;
		});
	});

	describe('plugin:war', function() {
		it('should build war file', function(done) {
			runSequence('plugin:war', function() {
				assert.isFile(path.join(tempPath, 'dist', 'test-plugin-layouttpl.war'));

				done();
			});
		});

		it('should use name for war file and pathDist for alternative dist location', function(done) {
			gulp = new Gulp();

			registerTasks({
				distName: 'my-plugin-name',
				gulp: gulp,
				pathDist: 'dist_alternative'
			});

			runSequence = require('run-sequence').use(gulp);

			runSequence('plugin:war', function() {
				assert.isFile(path.join(tempPath, 'dist_alternative', 'my-plugin-name.war'));

				done();
			});
		});
	});

	describe('registerTasks', function() {
		it('should invoke ext functions', function(done) {
			gulp = new Gulp();

			var extFunction = function(options) {
				assert.deepEqual(options, {
					distName: 'test-plugin-layouttpl',
					gulp: gulp,
					pathDist: 'dist',
					rootDir: 'docroot'
				});

				done();
			};

			registerTasks({
				gulp: gulp
			})(extFunction);
		});

		it('should register hooks', function(done) {
			gulp = new Gulp();

			var hookSpy = sinon.spy();

			var hookFn = function(gulp) {
				gulp.hook('before:plugin:war', function(cb) {
					hookSpy('before:plugin:war');

					cb();
				});

				gulp.hook('after:plugin:war', function(cb) {
					hookSpy('after:plugin:war');

					cb();
				});

				gulp.hook('after:plugin:deploy', function(cb) {
					hookSpy('after:plugin:deploy');

					cb();
				});
			};

			registerTasks({
				gulp: gulp,
				hookFn: hookFn
			});

			gulp.storage.set('deployPath', deployPath);

			runSequence = require('run-sequence').use(gulp);

			runSequence('plugin:war', 'plugin:deploy', function() {
				assert.isFile(path.join(deployPath, 'test-plugin-layouttpl.war'));

				assert(gulp.storage.get('deployed'), 'deployed is set to true');

				assert(hookSpy.getCall(0).calledWith('before:plugin:war'));
				assert(hookSpy.getCall(1).calledWith('after:plugin:war'));
				assert(hookSpy.getCall(2).calledWith('after:plugin:deploy'));

				done();
			});
		});

		it('should overwrite task', function(done) {
			gulp = new Gulp();

			var hookSpy = sinon.spy();

			var hookFn = function(gulp) {
				gulp.task('plugin:war', function(cb) {
					hookSpy('plugin:war');

					cb();
				});

				gulp.hook('before:plugin:war', function(cb) {
					hookSpy('before:plugin:war');

					cb();
				});
			};

			registerTasks({
				gulp: gulp,
				hookFn: hookFn
			});

			runSequence = require('run-sequence').use(gulp);

			runSequence('plugin:war', function() {
				assert(hookSpy.getCall(0).calledWith('plugin:war'));
				assert(hookSpy.calledOnce);

				done();
			});
		});
	});
});
