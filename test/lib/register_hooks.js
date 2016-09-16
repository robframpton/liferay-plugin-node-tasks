'use strict';

var _ = require('lodash');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var Gulp = require('gulp').Gulp;
var gutil = require('gulp-util');
var path = require('path');
var sinon = require('sinon');
var test = require('ava');

var RegisterHooks = require('../../lib/register_hooks');

var STR_NOT_A_FUNCTION = 'not a function';

var prototype;

test.beforeEach(function() {
	prototype = _.create(RegisterHooks.prototype);
});

test.cb('_addToSequence should add function to sequence differently based on if cb is expected or stream is returned', function(t) {
	var sequence = [];

	var spy = sinon.spy();

	prototype._addToSequence(sequence, function(cb) {
		spy();

		cb();
	});

	prototype._addToSequence(sequence, function() {
		var eventEmitter = new EventEmitter();

		setTimeout(function() {
			spy();

			eventEmitter.emit('end');
		}, 200);

		return eventEmitter;
	});

	prototype._addToSequence(sequence, STR_NOT_A_FUNCTION);

	t.is(sequence.length, 2);

	async.series(sequence, function() {
		t.is(spy.callCount, 2);

		t.end();
	});
});

test('_applyHooks should pass', function(t) {
	prototype.gulp = new Gulp();

	prototype.gulp.task('test', ['test2'], function(cb) {
		cb();
	});

	prototype.gulp.task('test2', function(cb) {
		cb();
	});

	prototype.hooks = {
		'after:test2': _.noop,
		'after:test3': _.noop,
		'before:test': _.noop,
		'invalid:test': _.noop
	};

	prototype.gulp.task = sinon.spy();

	prototype._applyHooks();

	t.true(prototype.gulp.task.calledTwice);
	t.true(prototype.gulp.task.getCall(0).calledWith('test2', []));
	t.true(prototype.gulp.task.getCall(1).calledWith('test', ['test2']));
});

test.cb('_createTaskSequence should create sequences that work with async methods', function(t) {
	var sequence = prototype._createTaskSequence(_.noop, {});

	t.is(sequence.length, 1);
	t.true(_.isFunction(sequence[0]));

	var hookSpy = sinon.spy();

	sequence = prototype._createTaskSequence(_.noop, {
		after: [
			function(cb) {
				hookSpy();

				cb();
			}
		]
	});

	t.is(sequence.length, 2);
	t.true(_.isFunction(sequence[0]));
	t.true(_.isFunction(sequence[1]));

	async.series(sequence, function() {
		t.true(hookSpy.calledOnce);

		t.end();
	});
});

test('_getTaskHookMap should create valid taskHookMap', function(t) {
	prototype.hooks = {
		'after:build': _.noop,
		'before:deploy': _.noop,
		'somethingbuild:build': _.noop
	};

	var taskHookMap = prototype._getTaskHookMap();

	t.deepEqual(taskHookMap, {
		build: {
			after: _.noop
		},
		deploy: {
			before: _.noop
		}
	});
});

test('_getTaskName should split hook name into correct sections', function(t) {
	var array = prototype._getTaskName('after:build');

	t.is(array[0], 'after');
	t.is(array[1], 'build');

	array = prototype._getTaskName('after:build:src');

	t.is(array[0], 'after');
	t.is(array[1], 'build:src');

	array = prototype._getTaskName('something-else:build:base');

	t.is(array[0], 'something-else');
	t.is(array[1], 'build:base');
});

test.cb('_logHookRegister should log message only if fn is a function', function(t) {
	gutil.log = sinon.spy();

	prototype._logHookRegister('test', _.noop);
	prototype._logHookRegister('test', STR_NOT_A_FUNCTION);

	t.is(gutil.log.callCount, 1);

	t.end();
});

test.cb('_registerHookFn should register hookFn if it is a function and log message if defined as anything else', function(t) {
	gutil.log = sinon.spy();

	prototype._registerHookFn();

	t.is(gutil.log.callCount, 0);

	prototype.hookFn = STR_NOT_A_FUNCTION;

	prototype._registerHookFn();

	t.is(gutil.log.callCount, 1);

	prototype.gulp = 'gulp';
	prototype.hookFn = sinon.spy();
	prototype.options = 'options';

	prototype._registerHookFn();

	t.is(gutil.log.callCount, 1);
	t.true(prototype.hookFn.calledWithExactly('gulp', 'options'));

	t.end();
});

test.cb('_registerHookModule should register hook or log appropriate log messages', function(t) {
	gutil.log = sinon.spy();

	prototype._registerHookModule('non-existent-module');

	t.true(gutil.log.calledWithMatch('There was an issue registering'));
	t.is(gutil.log.callCount, 1);

	var moduleHook = require(path.join(__dirname, '../fixtures/hook_modules/hook-module-1'));

	prototype.gulp = {
		hook: sinon.spy()
	};

	prototype._registerHookModule(path.join(__dirname, '../fixtures/hook_modules/hook-module-1'));

	t.true(prototype.gulp.hook.calledWith('before:build'));
	t.is(prototype.gulp.hook.callCount, 1);

	gutil.log.reset();

	prototype._registerHookModule(path.join(__dirname, '../fixtures/hook_modules/hook-module-3'));

	t.true(gutil.log.calledWithMatch('does not return a function. All hook modules must return a function.'));
	t.is(gutil.log.callCount, 1);

	t.end();
});

test('_registerHookModule should pass correct arguments to hook modules', function(t) {
	var hookModulePath = path.join(__dirname, '../fixtures/hook_modules/hook-module-4');

	var moduleHook = require(hookModulePath)().reset();

	prototype.gulp = 'gulp';
	prototype.options = 'options';

	prototype._registerHookModule(hookModulePath);

	t.true(moduleHook.calledWithExactly('gulp', 'options'));
	t.is(moduleHook.callCount, 1);
});

test.cb('_registerHookModules should accept single or multiple hook modules and register them', function(t) {
	var hookModule1Path = path.join(__dirname, '../fixtures/hook_modules/hook-module-1');
	var hookModule2Path = path.join(__dirname, '../fixtures/hook_modules/hook-module-2');
	var hookModule3Path = path.join(__dirname, '../fixtures/hook_modules/hook-module-3');

	prototype._registerHookModule = sinon.spy();
	prototype.hookModules = hookModule1Path;

	prototype._registerHookModules();

	t.true(prototype._registerHookModule.calledWithMatch(hookModule1Path));
	t.is(prototype._registerHookModule.callCount, 1);

	prototype._registerHookModule = sinon.spy();
	prototype.hookModules = [hookModule1Path, hookModule2Path, hookModule3Path];

	prototype._registerHookModules();

	t.true(prototype._registerHookModule.getCall(0).calledWith(hookModule1Path), 'called with module 1 path');
	t.true(prototype._registerHookModule.getCall(1).calledWith(hookModule2Path), 'called with module 2 path');
	t.true(prototype._registerHookModule.getCall(2).calledWith(hookModule3Path), 'called with module 3 path');
	t.is(prototype._registerHookModule.callCount, 3);

	t.end();
});

test.cb('_registerHooks should create gulp.hook function that adds hook to hooks object', function(t) {
	prototype.gulp = {};
	prototype._registerHooks();

	t.true(_.isFunction(prototype.gulp.hook))

	prototype.hooks = {};

	prototype.gulp.hook('hook1', _.noop);
	prototype.gulp.hook('hook2', _.noop);
	prototype.gulp.hook('hook2', _.noop);

	t.deepEqual(prototype.hooks.hook1, [_.noop]);
	t.deepEqual(prototype.hooks.hook2, [_.noop, _.noop]);

	t.end();
});
