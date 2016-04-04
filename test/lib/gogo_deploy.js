'use strict';

var _ = require('lodash');
var chai = require('chai');
var GogoDeployer = require('../../lib/gogo_deploy').GogoDeployer;
var GogoShellHelper = require('gogo-shell-helper');
var path = require('path');
var sinon = require('sinon');

var assert = chai.assert;

describe('GogoDeployer', function() {
	var prototype;

	beforeEach(function() {
		prototype = _.create(GogoDeployer.prototype);
	});

	describe('constructor', function() {
		it('should construct without any custom config and set defaults', function() {
			var gogoDeployer = new GogoDeployer();

			assert.deepEqual(gogoDeployer.connectConfig, {
				port: 11311
			});

			assert(!gogoDeployer.ready, 'is not ready yet');
		});
	});

	describe('deploy', function() {
		var helper;

		before(function() {
			helper = GogoShellHelper.start({
				dummyData: [
					{
						command: 'install webbundle',
						response: 'Bundle ID: 123'
					},
					{
						command: 'start'
					}
				],
				host: '0.0.0.0',
				port: 1337
			});
		});

		after(function() {
			try {
				helper.close();
			}
			catch (e) {
			}
		});

		it('should run sequence of commands', function(done) {
			var gogoDeployer = new GogoDeployer({
				connectConfig: {
					host: '0.0.0.0',
					port: 1337
				}
			});

			gogoDeployer.deploy()
				.then(function(data) {
					assert(data.indexOf('start 123') > -1);

					gogoDeployer.destroy();

					done();
				});
		});
	});

	describe('_formatWebBundleURL', function() {
		it('should create web bundle install command', function() {
			var webBundleURL = prototype._formatWebBundleURL('/some/path/to/file.war', 'context-path');

			assert.equal(webBundleURL, 'webbundle:file:///some/path/to/file.war?Web-ContextPath=context-path');
		});
	});

	describe('_getWebBundleIdFromResponse', function() {
		it('should either return web bundle id from response data or return 0', function() {
			var webBundleId = prototype._getWebBundleIdFromResponse('Here is some data\n g!');

			assert.equal(webBundleId, 0);

			webBundleId = prototype._getWebBundleIdFromResponse('Bundle ID: 123 \n g!');

			assert.equal(webBundleId, 123);

			webBundleId = prototype._getWebBundleIdFromResponse('123\nBundle ID: 456 \n 123 g!');

			assert.equal(webBundleId, 456);
		});
	});

	describe('_installWebBundle', function() {
		it('should call sendCommand with formatted install command string', function() {
			prototype.sendCommand = sinon.stub().returns('promise');

			var promise = prototype._installWebBundle('/some/path/to/file.war', 'context-path');

			assert.equal(promise, 'promise');

			assert(prototype.sendCommand.calledWith('install', 'webbundle:file:///some/path/to/file.war?Web-ContextPath=context-path'));
		});
	});

	describe('_startBundle', function() {
		it('should call sendCommand with bundle id arg', function() {
			prototype.sendCommand = sinon.stub().returns('promise');

			var promise = prototype._startBundle('123');

			assert.equal(promise, 'promise');

			assert(prototype.sendCommand.calledWith('start', '123'));
		});
	});
});
