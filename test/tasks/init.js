'use strict';

var _ = require('lodash');
var del = require('del');
var fs = require('fs-extra');
var Gulp = require('gulp').Gulp;
var os = require('os');
var path = require('path');
var sinon = require('sinon');
var test = require('ava');

var gulp = new Gulp();

var tempPath = path.join(os.tmpdir(), 'liferay-plugin-tasks', 'init-task', 'test-plugin-layouttpl');

var initCwd = process.cwd();
var registerTasks;
var runSequence;

test.cb.before(function(t) {
	fs.copy(path.join(__dirname, '../fixtures/plugins/test-plugin-layouttpl'), tempPath, function(err) {
		if (err) {
			throw err;
		}

		process.chdir(tempPath);

		registerTasks = require('../../index').registerTasks;

		registerTasks({
			gulp: gulp
		});

		runSequence = require('run-sequence').use(gulp);

		t.end();
	});
});

test.cb.after(function(t) {
	del([path.join(tempPath, '**')], {
		force: true
	}).then(function() {
		process.chdir(initCwd);

		t.end();
	});
});

test('plugin:init should prompt user for appserver information', function(t) {
	var InitPrompt = require('../../lib/init_prompt');

	var _prompt = InitPrompt.prototype._prompt;

	InitPrompt.prototype._prompt = sinon.spy();

	runSequence('plugin:init', _.noop);

	t.true(InitPrompt.prototype._prompt.calledOnce, '_prompt was invoked');

	var args = InitPrompt.prototype._prompt.getCall(0).args;

	t.deepEqual(args[0].store, gulp.storage);
	t.true(_.endsWith(args[0].appServerPathDefault, 'tomcat'), 'it adds tomcat to default path');

	InitPrompt.prototype._prompt = _prompt;
});
