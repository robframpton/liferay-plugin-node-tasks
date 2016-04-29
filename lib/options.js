'use strict';

var _ = require('lodash');
var minimist = require('minimist');
var path = require('path');

module.exports = function(options) {
	var argv = minimist(process.argv.slice(2));

	var CWD = process.cwd();

	var distName = path.basename(CWD);

	try {
		var pkg = require(path.join(CWD, 'package.json'));

		distName = pkg.name;
	}
	catch(e) {
	}

	options.argv = argv;
	options.distName = options.distName || distName;
	options.gogoShellConfig = _.assign({
		port: argv.p || argv.port || 11311
	}, options.gogoShellConfig);
	options.pathDist = options.pathDist || 'dist';
	options.rootDir = options.rootDir || 'docroot';
	options.storeConfig = _.assign({
		name: 'LiferayPlugin',
		path: 'liferay-plugin.json'
	}, options.storeConfig);

	return options;
};
