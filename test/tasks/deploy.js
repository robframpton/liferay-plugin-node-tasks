'use strict';

var chai = require('chai');
var del = require('del');
var fs = require('fs-extra');
var GogoShellHelper = require('gogo-shell-helper');
var Gulp = require('gulp').Gulp;
var os = require('os');
var path = require('path');
var sinon = require('sinon');
var test = require('ava');

var gulp = new Gulp();

chai.use(require('chai-fs'));

var assert = chai.assert;

var tempPath = path.join(os.tmpdir(), 'liferay-plugin-tasks', 'deploy-task', 'test-plugin-layouttpl');

var deployPath = path.join(tempPath, '../appserver/deploy');

var helper;
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

		helper = GogoShellHelper.start({
			commands: [
				{
					command: 'install webbundle',
					response: 'Bundle ID: 123'
				},
				{
					command: 'lb -u',
					response: '501|Active     |    1|webbundle:file:/portal/osgi/war/april-13-theme.war?Web-ContextPath=/april-13-theme'
				}
			]
		});

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

test.afterEach(function() {
	del.sync(path.join(deployPath, '**'), {
		force: true
	});
});

test.cb.serial('deploy task should deploy war file to specified appserver', function(t) {
	runSequence('deploy', function() {
		assert.isFile(path.join(deployPath, 'test-plugin-layouttpl.war'));

		t.true(gulp.storage.get('deployed'), 'deployed is set to true');

		t.end();
	});
});

test.cb.serial('plugin:deploy-gogo should attempt to deploy via gogo shell', function(t) {
	runSequence('deploy:gogo', function() {
		t.end();
	});
});

test.cb.serial('plugin:deploy-gogo should log error', function(t) {
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

	runSequence('deploy:gogo', function() {
		t.true(gutil.log.getCall(0).args[0].indexOf('Something went wrong') > -1);

		gutil.log = log;

		t.end();
	});
});

test.cb.serial('plugin:deploy-gogo should log error due to disconnection', function(t) {
	helper.close(function() {
		var gutil = require('gulp-util');

		var log = gutil.log;

		gutil.log = sinon.spy();

		runSequence('plugin:war', 'plugin:deploy-gogo', function() {
			t.true(gutil.log.getCall(0).args[0].indexOf('ECONNREFUSED') > -1);

			gutil.log = log;

			t.end();
		});
	});
});
