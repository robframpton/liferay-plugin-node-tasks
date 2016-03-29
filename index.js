'use strict';

var _ = require('lodash');
var gutil = require('gulp-util');
var InitPrompt = require('./lib/init_prompt');
var path = require('path');
var RegisterHooks = require('./lib/register_hooks');
var storage = require('gulp-storage');
var zip = require('gulp-zip');

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

	storage(gulp);

	var store = gulp.storage;

	store.create('LiferayPlugin', path.join(process.cwd(), 'liferay-plugin.json'));

	gulp.task('plugin:deploy', ['plugin:war'], function() {
		var deployPath = store.get('deployPath');

		var stream = gulp.src(path.join(options.pathDist, options.distName + '.war'))
			.pipe(gulp.dest(deployPath));

		gutil.log('Deploying to ' + gutil.colors.cyan(deployPath));

		stream.on('end', function() {
			store.set('deployed', true);
		});

		return stream;
	});

	gulp.task('plugin:init', function(cb) {
		new InitPrompt({
			appServerPathDefault: store.get('appServerPath') || path.join(path.dirname(CWD), 'tomcat'),
			store: store
		}, cb);
	});

	gulp.task('plugin:war', function() {
		return gulp.src(path.join(options.rootDir, '**/*'))
			.pipe(zip(options.distName + '.war'))
			.pipe(gulp.dest(options.pathDist));
	});

	return function() {
		_.forEach(arguments, function(ext) {
			ext(options);
		});
	};
};
