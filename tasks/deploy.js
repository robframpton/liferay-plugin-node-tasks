'use strict';

var gutil = require('gulp-util');
var path = require('path');

module.exports = function(options) {
	var gulp = options.gulp;

	var store = gulp.storage;

	gulp.task('plugin:deploy', function() {
		var deployPath = store.get('deployPath');

		var stream = gulp.src(path.join(options.pathDist, options.distName + '.war'))
			.pipe(gulp.dest(deployPath));

		gutil.log('Deploying to ' + gutil.colors.cyan(deployPath));

		stream.on('end', function() {
			store.set('deployed', true);
		});

		return stream;
	});

	gulp.task('plugin:deploy-gogo', function(done) {
		var contextPath = require(path.join(process.cwd(), 'package.json')).name;
		var filePath = path.join(process.cwd(), options.pathDist, options.distName + '.war');

		var GogoDeployer = require('./lib/gogo_deploy').GogoDeployer;

		new GogoDeployer().deploy(filePath, contextPath)
			.then(function(data) {
				console.log(data);

				store.set('deployed', true);
			});
	});
};
