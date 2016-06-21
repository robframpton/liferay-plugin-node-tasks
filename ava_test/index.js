'use strict';

var chai = require('chai');
var del = require('del');
var fs = require('fs-extra');
var Gulp = require('gulp').Gulp;
var os = require('os');
var path = require('path');
var sinon = require('sinon');
var test = require('ava');

var gulp = new Gulp();

chai.use(require('chai-fs'));

var assert = chai.assert;

var tempPath = path.join(os.tmpdir(), 'liferay-plugin-tasks', 'test-plugin-layouttpl');

var deployPath = path.join(tempPath, '../appserver/deploy');

var initCwd = process.cwd();
var registerTasks;
var runSequence;

test.cb.before(function(t) {
	fs.copy(path.join(__dirname, './fixtures/plugins/test-plugin-layouttpl'), tempPath, function(err) {
		if (err) {
			throw err;
		}

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

test.cb.serial('registerTasks should invoke extension functions', function(t) {
	gulp = new Gulp();

	var extFunction = function(options) {
		t.deepEqual(options, {
			argv: require('minimist')(process.argv.slice(2)),
			distName: 'test-plugin-layouttpl',
			extensions: [extFunction],
			gogoShellConfig: {
				port: 11311
			},
			gulp: gulp,
			pathDist: 'dist',
			rootDir: 'docroot',
			storeConfig: {
				name: 'LiferayPlugin',
				path: 'liferay-plugin.json'
			}
		});

		t.end();
	};

	registerTasks({
		extensions: extFunction,
		gulp: gulp
	});
});

test.cb.serial('registerTasks should accept array of extension function', function(t) {
	gulp = new Gulp();

	var extFunction = function(options) {
		t.is(options.gulp, gulp);

		t.end();
	};

	registerTasks({
		extensions: [extFunction],
		gulp: gulp
	});
});

test.cb.serial('registerTasks should register hooks', function(t) {
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

		t.true(gulp.storage.get('deployed'), 'deployed is set to true');

		t.true(hookSpy.getCall(0).calledWith('before:plugin:war'));
		t.true(hookSpy.getCall(1).calledWith('after:plugin:war'));
		t.true(hookSpy.getCall(2).calledWith('after:plugin:deploy'));

		t.end();
	});
});

test.cb.serial('registerTasks should register hooks for extension tasks', function(t) {
	gulp = new Gulp();

	var hookSpy = sinon.spy();

	var hookFn = function(gulp) {
		gulp.hook('before:plugin:war', function(cb) {
			hookSpy('before:plugin:war');

			cb();
		});

		gulp.hook('after:my-custom:task', function(cb) {
			hookSpy('after:my-custom:task');

			cb();
		});
	};

	registerTasks({
		extensions: function(options) {
			options.gulp.task('my-custom:task', function(cb) {
				hookSpy('my-custom:task');

				cb();
			});
		},
		gulp: gulp,
		hookFn: hookFn
	});

	runSequence = require('run-sequence').use(gulp);

	runSequence('plugin:war', 'my-custom:task', function() {
		t.true(hookSpy.getCall(0).calledWith('before:plugin:war'));
		t.true(hookSpy.getCall(1).calledWith('my-custom:task'));
		t.true(hookSpy.getCall(2).calledWith('after:my-custom:task'));

		t.end();
	});
});

test.cb.serial('registerTasks should overwrite task', function(t) {
	gulp = new Gulp();

	var hookSpy = sinon.spy();

	var hookFn = function(gulp) {
		gulp.hook('before:plugin:war', function(cb) {
			hookSpy('before:plugin:war');

			cb();
		});

		gulp.task('plugin:war', function(cb) {
			hookSpy('plugin:war');

			cb();
		});
	};

	registerTasks({
		gulp: gulp,
		hookFn: hookFn
	});

	runSequence = require('run-sequence').use(gulp);

	runSequence('plugin:war', function() {
		t.true(hookSpy.getCall(0).calledWith('before:plugin:war'));
		t.true(hookSpy.getCall(1).calledWith('plugin:war'));

		t.end();
	});
});

test.cb.serial('registerTasks should use distName as template if delimiters are present', function(t) {
	gulp = new Gulp();

	registerTasks({
		distName: '${name}-${version}-${liferayPlugin.version}',
		extensions: function(options) {
			t.is(options.distName, 'test-plugin-layouttpl-1.2.3-7.0');

			t.end();
		},
		gulp: gulp
	});
});
