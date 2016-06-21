'use strict';

var chai = require('chai');
var del = require('del');
var fs = require('fs-extra');
var Gulp = require('gulp').Gulp;
var os = require('os');
var path = require('path');
var test = require('ava');

var gulp = new Gulp();

chai.use(require('chai-fs'));

var assert = chai.assert;

var tempPath = path.join(os.tmpdir(), 'liferay-plugin-tasks', 'war-task', 'test-plugin-layouttpl');

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

test.cb('plugin:war should build war file', function(t) {
	runSequence('plugin:war', function() {
		assert.isFile(path.join(tempPath, 'dist', 'test-plugin-layouttpl.war'));

		t.end();
	});
});

test.cb('plugin:war should use name for war file and pathDist for alternative dist location', function(t) {
	gulp = new Gulp();

	registerTasks({
		distName: 'my-plugin-name',
		gulp: gulp,
		pathDist: 'dist_alternative'
	});

	runSequence = require('run-sequence').use(gulp);

	runSequence('plugin:war', function() {
		assert.isFile(path.join(tempPath, 'dist_alternative', 'my-plugin-name.war'));

		t.end();
	});
});
