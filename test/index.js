'use strict';

var _ = require('lodash');
var chai = require('chai');
var fs = require('fs-extra');
var gulp = require('gulp');
var os = require('os');
var path = require('path');
var registerTasks = require('../index').registerTasks;
var sinon = require('sinon');

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
		it('should pass', function(done) {
			runSequence('plugin:deploy', function() {
				assert.isFile(path.join(deployPath, 'liferay-plugin-tasks.war'));

				done();
			});
		});
	});

	describe('plugin:init', function() {
		it('should pass', function() {
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
		it('should pass', function(done) {
			runSequence('plugin:war', function() {
				assert.isFile(path.join(tempPath, 'dist', 'liferay-plugin-tasks.war'));

				done();
			});
		});
	});
});
