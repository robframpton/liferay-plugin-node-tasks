'use strict';

var InitPrompt = require('../lib/init_prompt');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));

var TASK_PLUGIN_INIT = 'plugin:init';

module.exports = function(options) {
	var gulp = options.gulp;

	var store = gulp.storage;

	gulp.task(TASK_PLUGIN_INIT, function(cb) {
		new InitPrompt({
			appServerPathDefault: store.get('appServerPath') || path.join(path.dirname(process.cwd()), 'tomcat'),
			store: store,
			appServerPathArgv: argv.appServerPath,
			urlArgv: argv.url
		}, cb);
	});

	gulp.task('init', [TASK_PLUGIN_INIT]);
};
