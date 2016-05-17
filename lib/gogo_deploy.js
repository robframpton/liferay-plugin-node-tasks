'use strict';

var _ = require('lodash');
var GogoShell = require('gogo-shell');
var gutil = require('gulp-util');
var os = require('os');
var path = require('path');

var REGEX_WIN = /^win/;

var GogoDeployer = function(config) {
	GogoShell.call(this, config);

	config = config || {};

	this.connectConfig = config.connectConfig;
};

GogoDeployer.prototype = _.create(GogoShell.prototype, {
	deploy: function(webBundlePath, contextPath) {
		var instance = this;

		return this.connect(this.connectConfig)
			.then(function() {
				return instance._getBundleStatusByContextPath(contextPath);
			})
			.then(function(data) {
				if (data.length) {
					return instance._updateWebBundle(data[0].id, webBundlePath, contextPath);
				}
				else {
					return instance._installWebBundle(webBundlePath, contextPath);
				}
			})
			.then(function(data) {
				if (data.indexOf('Bundle ID') > -1) {
					var bundleId = instance._getWebBundleIdFromResponse(data);

					return instance._startBundle(bundleId);
				}

				return data;
			});
	},

	_updateWebBundle: function(webBundleId, webBundlePath, contextPath) {
		return this.sendCommand('update', webBundleId, this._formatWebBundleURL(webBundlePath, contextPath));
	},

	_getBundleStatusByContextPath: function(contextPath) {
		return this.sendCommand('lb -u | grep', contextPath)
			.then(function(data) {
				return _.reduce(data.split('\n'), function(result, item, index) {
					var fields = item.split('|');

					if (fields.length == 4) {
						result.push({
							id: _.trim(fields[0]),
							level: _.trim(fields[2]),
							status: _.trim(fields[1]),
							updateLocation: _.trim(fields[3])
						});
					}

					return result;
				}, []);
			});
	},

	_formatWebBundleURL: function(webBundlePath, contextPath) {
		if (this._isWin()) {
			webBundlePath = '/' + webBundlePath.split(path.sep).join('/');
		}
		else {
			webBundlePath = '//' + webBundlePath;
		}

		webBundlePath = webBundlePath.replace(/\s/g, '%20');

		return 'webbundle:file:' + webBundlePath + '?Web-ContextPath=/' + contextPath;
	},

	_getWebBundleIdFromResponse: function(response) {
		var match = response.match(/Bundle\sID:\s*([0-9]+)/);

		return match ? match[1] : 0;
	},

	_installWebBundle: function(webBundlePath, contextPath) {
		return this.sendCommand('install', this._formatWebBundleURL(webBundlePath, contextPath));
	},

	_isWin: function() {
		return REGEX_WIN.test(os.platform());
	},

	_startBundle: function(bundleId) {
		return this.sendCommand('start', bundleId);
	}
});

module.exports.GogoDeployer = GogoDeployer;
