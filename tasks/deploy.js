'use strict';

var gutil = require('gulp-util');
var path = require('path');

var TASK_PLUGIN_DEPLOY = 'plugin:deploy';

var TASK_PLUGIN_DEPLOY_GOGO = 'plugin:deploy-gogo';

module.exports = function(options) {
	var gulp = options.gulp;

	var store = gulp.storage;

	gulp.task(TASK_PLUGIN_DEPLOY, function() {
		var deployPath = store.get('deployPath');

		var stream = gulp.src(path.join(options.pathDist, options.distName + '.war'))
			.pipe(gulp.dest(deployPath));

		gutil.log('Deploying to ' + gutil.colors.cyan(deployPath));

		stream.on('end', function() {
			store.set('deployed', true);
		});

		return stream;
	});

	gulp.task(TASK_PLUGIN_DEPLOY_GOGO, function(done) {
		var contextPath = require(path.join(process.cwd(), 'package.json')).name;
		var filePath = path.join(process.cwd(), options.pathDist, options.distName + '.war');

		var GogoDeployer = require('./lib/gogo_deploy').GogoDeployer;

		new GogoDeployer().deploy(filePath, contextPath)
			.then(function(data) {
				console.log(data);

				store.set('deployed', true);
			});
	});

	gulp.task('deploy', TASK_PLUGIN_DEPLOY);
	gulp.task('deploy:gogo', TASK_PLUGIN_DEPLOY_GOGO);
};
