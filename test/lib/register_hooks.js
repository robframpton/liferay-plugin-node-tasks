'use strict';

var _ = require('lodash');
var async = require('async');
var chai = require('chai');
var EventEmitter = require('events').EventEmitter;
var Gulp = require('gulp').Gulp;
var gutil = require('gulp-util');
var path = require('path');
var RegisterHooks = require('../../lib/register_hooks');
var sinon = require('sinon');

var assert = chai.assert;

var STR_NOT_A_FUNCTION = 'not a function';

describe('RegisterHooks', function() {
	var prototype;

	beforeEach(function() {
		prototype = _.create(RegisterHooks.prototype);
	});

	describe('_addToSequence', function() {
		it('should add function to sequence differently based on if cb is expected or stream is returned', function(done) {
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

			assert.equal(sequence.length, 2);

			async.series(sequence, function() {
				assert.equal(spy.callCount, 2);

				done();
			});
		});
	});

	describe('_applyHooks', function() {
		it('should pass', function() {
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

			assert(prototype.gulp.task.calledTwice);
			assert(prototype.gulp.task.getCall(0).calledWith('test2', []));
			assert(prototype.gulp.task.getCall(1).calledWith('test', ['test2']));
		});
	});

	describe('_createTaskSequence', function() {
		it('should create sequences that work with async methods', function(done) {
			var sequence = prototype._createTaskSequence(_.noop, {});

			assert.equal(sequence.length, 1);
			assert(_.isFunction(sequence[0]));

			var hookSpy = sinon.spy();

			sequence = prototype._createTaskSequence(_.noop, {
				after: function(cb) {
					hookSpy();

					cb();
				}
			});

			assert.equal(sequence.length, 2);
			assert(_.isFunction(sequence[0]));
			assert(_.isFunction(sequence[1]));

			async.series(sequence, function() {
				assert(hookSpy.calledOnce);

				done();
			});
		});
	});

	describe('_getTaskHookMap', function() {
		it('should create valid taskHookMap', function() {
			prototype.hooks = {
				'after:build': _.noop,
				'before:deploy': _.noop,
				'somethingbuild:build': _.noop
			};

			var taskHookMap = prototype._getTaskHookMap();

			assert.deepEqual(taskHookMap, {
				build: {
					after: _.noop
				},
				deploy: {
					before: _.noop
				}
			});
		});
	});

	describe('_getTaskName', function() {
		it('should split hook name into correct sections', function() {
			var array = prototype._getTaskName('after:build');

			assert.equal(array[0], 'after');
			assert.equal(array[1], 'build');

			array = prototype._getTaskName('after:build:src');

			assert.equal(array[0], 'after');
			assert.equal(array[1], 'build:src');

			array = prototype._getTaskName('something-else:build:base');

			assert.equal(array[0], 'something-else');
			assert.equal(array[1], 'build:base');
		});
	});

	describe('_logHookRegister', function() {
		it('should log message only if fn is a function', function(done) {
			gutil.log = sinon.spy();

			prototype._logHookRegister('test', _.noop);
			prototype._logHookRegister('test', STR_NOT_A_FUNCTION);

			assert.equal(gutil.log.callCount, 1);

			done();
		});
	});

	describe('_registerHookFn', function() {
		it('should register hookFn if it is a function and log message if defined as anything else', function(done) {
			gutil.log = sinon.spy();

			prototype._registerHookFn();

			assert.equal(gutil.log.callCount, 0);

			prototype.hookFn = STR_NOT_A_FUNCTION;

			prototype._registerHookFn();

			assert.equal(gutil.log.callCount, 1);

			prototype.gulp = 'gulp';
			prototype.hookFn = sinon.spy();

			prototype._registerHookFn();

			assert.equal(gutil.log.callCount, 1);
			assert(prototype.hookFn.calledWith('gulp'));

			done();
		});
	});

	describe('_registerHookModule', function() {
		it('should register hook or log appropriate log messages', function(done) {
			gutil.log = sinon.spy();

			prototype._registerHookModule('non-existent-module');

			assert(gutil.log.calledWithMatch('There was an issue registering'));
			assert.equal(gutil.log.callCount, 1);

			var moduleHook = require(path.join(__dirname, '../fixtures/hook_modules/hook-module-1'));

			prototype.gulp = {
				hook: sinon.spy()
			};

			prototype._registerHookModule(path.join(__dirname, '../fixtures/hook_modules/hook-module-1'));

			assert(prototype.gulp.hook.calledWith('before:build'));
			assert.equal(prototype.gulp.hook.callCount, 1);

			gutil.log = sinon.spy();

			prototype._registerHookModule(path.join(__dirname, '../fixtures/hook_modules/hook-module-3'));

			assert(gutil.log.calledWithMatch('does not return a function. All hook modules must return a function.'));
			assert.equal(gutil.log.callCount, 1);

			done();
		});
	});

	describe('_registerHookModules', function() {
		it('should accept single or multiple hook modules and register them', function(done) {
			var hookModule1Path = path.join(__dirname, '../fixtures/hook_modules/hook-module-1');
			var hookModule2Path = path.join(__dirname, '../fixtures/hook_modules/hook-module-2');
			var hookModule3Path = path.join(__dirname, '../fixtures/hook_modules/hook-module-3');

			prototype._registerHookModule = sinon.spy();
			prototype.hookModules = hookModule1Path;

			prototype._registerHookModules();

			assert(prototype._registerHookModule.calledWithMatch(hookModule1Path));
			assert.equal(prototype._registerHookModule.callCount, 1);

			prototype._registerHookModule = sinon.spy();
			prototype.hookModules = [hookModule1Path, hookModule2Path, hookModule3Path];

			prototype._registerHookModules();

			assert(prototype._registerHookModule.getCall(0).calledWith(hookModule1Path), 'called with module 1 path');
			assert(prototype._registerHookModule.getCall(1).calledWith(hookModule2Path), 'called with module 2 path');
			assert(prototype._registerHookModule.getCall(2).calledWith(hookModule3Path), 'called with module 3 path');
			assert.equal(prototype._registerHookModule.callCount, 3);

			done();
		});
	});

	describe('_registerHooks', function() {
		it('should create gulp.hook function that adds hook to hooks object', function(done) {
			prototype.gulp = {};
			prototype._registerHooks();

			assert(_.isFunction(prototype.gulp.hook))

			prototype.hooks = {};

			prototype.gulp.hook('hook1', _.noop);
			prototype.gulp.hook('hook2', _.noop);

			assert.equal(prototype.hooks.hook1, _.noop);
			assert.equal(prototype.hooks.hook2, _.noop);

			done();
		});
	});
});
