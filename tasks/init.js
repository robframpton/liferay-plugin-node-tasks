'use strict';

var InitPrompt = require('../lib/init_prompt');
var path = require('path');

module.exports = function(options) {
	var gulp = options.gulp;

	var store = gulp.storage;

	gulp.task('plugin:init', function(cb) {
		new InitPrompt({
			appServerPathDefault: store.get('appServerPath') || path.join(path.dirname(process.cwd()), 'tomcat'),
			store: store
		}, cb);
	});
};
