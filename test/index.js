'use strict';

var _ = require('lodash');
var chai = require('chai');
var fs = require('fs-extra');
var Gulp = require('gulp').Gulp;
var os = require('os');
var path = require('path');
var registerTasks = require('../index').registerTasks;
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

			registerTasks({
				gulp: gulp
			});

			runSequence = require('run-sequence').use(gulp);

			var store = gulp.storage;

			store.set('deployPath', deployPath);

			fs.mkdirsSync(deployPath);

			done();
		});
	});

	after(function() {
		fs.removeSync(deployPath);
		fs.removeSync(tempPath);

		process.chdir(this._initCwd);
	});

	describe('plugin:deploy', function() {
		it('should deploy war file to specified appserver', function(done) {
			runSequence('plugin:deploy', function() {
				assert.isFile(path.join(deployPath, 'liferay-plugin-tasks.war'));

				assert(gulp.storage.get('deployed'), 'deployed is set to true');

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
				assert.isFile(path.join(tempPath, 'dist', 'liferay-plugin-tasks.war'));

				done();
			});
		});

		it('should use name for war file and pathDist for alternative dist location', function(done) {
			gulp = new Gulp();

			registerTasks({
				gulp: gulp,
				pathDist: 'dist_alternative',
				name: 'my-plugin-name'
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
					gulp: gulp,
					name: 'liferay-plugin-tasks',
					pathDist: 'dist',
					rootDir: 'docroot'
				});

				done();
			};

			registerTasks({
				gulp: gulp
			})(extFunction);
		});
	});
});
