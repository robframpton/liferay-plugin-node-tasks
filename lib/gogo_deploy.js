'use strict';

var GogoShell = require('gogo-shell');
var gutil = require('gulp-util');

var config = {
	port: 11311
};

var gogoShell = new GogoShell();

module.exports = function(filePath, contextPath, cb) {
	gogoShell.connect(config)
		.then(function() {
			return gogoShell.sendCommand(
				'install',
				'webbundle:file://' + filePath + '?Web-ContextPath=' + contextPath
			);
		})
		.then(function(data) {
			var match = data.match(/Bundle ID:\s(\d+)/);

			if (!match) {
				throw new Error(data);
			}

			var bundleId = match[1];

			return gogoShell.sendCommand('start', bundleId);
		})
		.then(function(data) {
			cb(null, data);

			gogoShell.end();
		})
		.catch(function(err) {
			cb(gutil.colors.red(err));
		});

	gogoShell.on('error', function(err) {
		cb(gutil.colors.red(err.message));
	});
};