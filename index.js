'use strict';

var _ = require('lodash');
var gutil = require('gulp-util');
var help = require('gulp-help');
var InitPrompt = require('./lib/init_prompt');
var minimist = require('minimist');
var path = require('path');
var RegisterHooks = require('./lib/register_hooks');
var storage = require('gulp-storage');

var CWD = process.cwd();

module.exports.registerTasks = function(options) {
	options.argv = minimist(process.argv.slice(2));
	options.distName = options.distName || path.basename(CWD);
	options.pathDist = options.pathDist || 'dist';
	options.rootDir = options.rootDir || 'docroot';
	options.storeConfig = _.assign({
		name: 'LiferayPlugin',
		path: 'liferay-plugin.json'
	}, options.storeConfig);

	var gulp = options.gulp;

	gulp = help(options.gulp);

	storage(gulp);

	var store = gulp.storage;

	store.create(options.storeConfig.name, path.join(CWD, options.storeConfig.path));

	var tasks = require('./tasks/index');

	_.forEach(tasks, function(task, index) {
		task(options);
	});

	if (options.extensions) {
		if (!_.isArray(options.extensions)) {
			options.extensions = [options.extensions];
		}

		_.forEach(options.extensions, function(extension) {
			extension(options);
		});
	}

	RegisterHooks.hook(gulp, {
		hookFn: options.hookFn,
		hookModules: options.hookModules
	});
};
