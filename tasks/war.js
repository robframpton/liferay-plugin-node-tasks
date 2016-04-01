'use strict';

var path = require('path');
var zip = require('gulp-zip');

module.exports = function(options) {
	var gulp = options.gulp;

	gulp.task('plugin:war', function() {
		return gulp.src(path.join(options.rootDir, '**/*'))
			.pipe(zip(options.distName + '.war'))
			.pipe(gulp.dest(options.pathDist));
	});
};
