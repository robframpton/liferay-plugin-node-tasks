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

var tempPath = path.join(os.tmpdir(), 'liferay-plugin-tasks', 'version-task', 'test-plugin-layouttpl');

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

test.serial.cb('plugin:version should add package.json version to liferay-plugin-package.properties', function(t) {
	runSequence('plugin:version', function() {
		assert.fileContentMatch(path.join(tempPath, 'docroot/WEB-INF/liferay-plugin-package.properties'), /module-version=1\.2\.3/);

		t.end();
	});
});

test.serial.cb('plugin:version should add package.json version to liferay-plugin-package.properties', function(t) {
	var pkgPath = path.join(tempPath, 'package.json');

	var pkg = require(pkgPath);

	pkg.version = '1.2.4';

	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t'));

	runSequence('plugin:version', function() {
		assert.fileContentMatch(path.join(tempPath, 'docroot/WEB-INF/liferay-plugin-package.properties'), /module-version=1\.2\.4/);

		t.end();
	});
});
