'use strict';

var InitPrompt = require('../lib/init_prompt');
var path = require('path');
var argv = require('yargs').argv;
var gutil = require('gulp-util');

var TASK_PLUGIN_INIT = 'plugin:init';
var TASK_PLUGIN_INIT_PARAMETERIZED = 'plugin:initParameterized';

module.exports = function(options) {
	var gulp = options.gulp;

	var store = gulp.storage;

	gulp.task(TASK_PLUGIN_INIT, function(cb) {
		new InitPrompt({
			appServerPathDefault: store.get('appServerPath') || path.join(path.dirname(process.cwd()), 'tomcat'),
			store: store,
			shouldPrompt: true
		}, cb);
	});

	gulp.task(TASK_PLUGIN_INIT_PARAMETERIZED, function(cb) {
		var appServerPath = argv.appServerPath || false;
		var url = argv.url || false;
		
		if(appServerPath && url){
			new InitPrompt({
				appServerPath: appServerPath,
				url: url,
				store: store,
				shouldPrompt: false
			}, cb);
		} else {
			gutil.log("Missing Parameters.  Please run 'gulp plugin:initParameterized' with --appServerPath and --url parameters");
			process.exit();
		}
	});

	gulp.task('init', [TASK_PLUGIN_INIT]);
};
