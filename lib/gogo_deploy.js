'use strict';

var _ = require('lodash');
var GogoShell = require('gogo-shell');
var gutil = require('gulp-util');

var GogoDeployer = function(config) {
	GogoShell.call(this, config);

	config = config || {};

	this.connectConfig = _.assign({
		port: 11311
	}, config.connectConfig);
};

GogoDeployer.prototype = _.create(GogoShell.prototype, {
	deploy: function(webBundlePath, contextPath) {
		var instance = this;

		return this.connect(this.connectConfig)
			.then(function() {
				return instance._installWebBundle(webBundlePath, contextPath);
			})
			.then(function(data) {
				var bundleId = instance._getWebBundleIdFromResponse(data);

				return instance._startBundle(bundleId);
			});
	},

	_formatWebBundleURL: function(webBundlePath, contextPath) {
		return 'webbundle:file://' + webBundlePath + '?Web-ContextPath=' + contextPath;
	},

	_getWebBundleIdFromResponse: function(response) {
		var match = response.match(/Bundle\sID:\s*([0-9]+)/);

		return match ? match[1] : 0;
	},

	_installWebBundle: function(webBundlePath, contextPath) {
		return this.sendCommand('install', this._formatWebBundleURL(webBundlePath, contextPath));
	},

	_startBundle: function(bundleId) {
		return this.sendCommand('start', bundleId);
	}
});

module.exports.GogoDeployer = GogoDeployer;
