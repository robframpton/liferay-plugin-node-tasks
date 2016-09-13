'use strict';

var gutil = require('gulp-util');
var path = require('path');

var chalk = gutil.colors;

var TASK_BUILD = 'build';

var TASK_PLUGIN_DEPLOY = 'plugin:deploy';

var TASK_PLUGIN_DEPLOY_GOGO = 'plugin:deploy-gogo';

module.exports = function(options) {
	var gulp = options.gulp;

	var runSequence = require('run-sequence').use(gulp);

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

		var GogoDeployer = require('../lib/gogo_deploy').GogoDeployer;

		var gogoDeployer = new GogoDeployer({
			connectConfig: options.gogoShellConfig
		});

		var finish = function() {
			gogoDeployer.destroy();

			done();
		};

		gogoDeployer.on('error', function(err) {
			gutil.log(chalk.red(err.message));

			finish();
		});

		gogoDeployer.deploy(filePath, contextPath)
			.then(function(data) {
				var match = data.match(/(start|update)\s(\d+)/);

				if (match && match[2] != 0) {
					store.set('deployed', true);

					gutil.log('Deployed via gogo shell');
				}
				else {
					gutil.log(chalk.red('Something went wrong'));
				}

				finish();
			});
	});

	gulp.task('deploy', function(cb) {
		runSequence(TASK_BUILD, TASK_PLUGIN_DEPLOY, cb);
	});

	gulp.task('deploy:gogo', function(cb) {
		runSequence(TASK_BUILD, TASK_PLUGIN_DEPLOY_GOGO, cb);
	});
};
