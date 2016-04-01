'use strict';

var _ = require('lodash');
var gutil = require('gulp-util');
var InitPrompt = require('./lib/init_prompt');
var path = require('path');
var RegisterHooks = require('./lib/register_hooks');
var help = require('gulp-help');
var storage = require('gulp-storage');

var CWD = process.cwd();

module.exports.registerTasks = function(options) {
	options.distName = options.distName || path.basename(CWD);
	options.pathDist = options.pathDist || 'dist';
	options.rootDir = options.rootDir || 'docroot';

	var gulp = options.gulp;

	gulp.tasks = {};

	RegisterHooks.hook(gulp, {
		hookFn: options.hookFn,
		hookModules: options.hookModules
	});

	gulp = help(options.gulp);

	storage(gulp);

	var store = gulp.storage;

	store.create('LiferayPlugin', path.join(CWD, 'liferay-plugin.json'));

	var tasks = require('./tasks/index');

	_.forEach(tasks, function(task, index) {
		task(options);
	});

	return function() {
		_.forEach(arguments, function(ext) {
			ext(options);
		});
	};
};
