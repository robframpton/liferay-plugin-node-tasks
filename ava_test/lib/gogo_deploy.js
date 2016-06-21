'use strict';

var _ = require('lodash');
var GogoShellHelper = require('gogo-shell-helper');
var path = require('path');
var sinon = require('sinon');
var test = require('ava');

var GogoDeployer = require('../../lib/gogo_deploy').GogoDeployer;

var helper;
var prototype;

test.before(function() {
	helper = GogoShellHelper.start({
		commands: [
			{
				command: 'install webbundle',
				response: 'Bundle ID: 123'
			}
		],
		host: '0.0.0.0',
		port: 1337
	});
});

test.cb.after(function(t) {
	try {
		helper.close(t.end);
	}
	catch (err) {
		t.end();
	}
});

test.beforeEach(function() {
	prototype = _.create(GogoDeployer.prototype);
});

test('constructor should set connect config', function(t) {
	var gogoDeployer = new GogoDeployer({
		connectConfig: {
			port: 1234
		}
	});

	t.deepEqual(gogoDeployer.connectConfig, {
		port: 1234
	});

	t.true(!gogoDeployer.ready, 'is not ready yet');

	gogoDeployer = new GogoDeployer();

	t.true(!gogoDeployer.connectConfig, 'there is no connectConfig');
});

test.cb('deploy should run sequence of commands', function(t) {
	var gogoDeployer = new GogoDeployer({
		connectConfig: {
			host: '0.0.0.0',
			port: 1337
		}
	});

	gogoDeployer.deploy()
		.then(function(data) {
			t.true(data.indexOf('start 123') > -1);

			gogoDeployer.destroy();

			t.end();
		});
});

test('_formatWebBundleURL should create web bundle install command', function(t) {
	var webBundleURL = prototype._formatWebBundleURL('/some/path/to/file.war', 'context-path');

	t.is(webBundleURL, 'webbundle:file:///some/path/to/file.war?Web-ContextPath=/context-path');
});

test('_formatWebBundleURL should properly format windows path', function(t) {
	var sep = path.sep;

	path.sep = '\\';

	prototype._isWin = function() {
		return true;
	};

	var webBundleURL = prototype._formatWebBundleURL('c:\\some\\path\\to\\file.war', 'context-path');

	t.is(webBundleURL, 'webbundle:file:/c:/some/path/to/file.war?Web-ContextPath=/context-path');

	path.sep = sep;
});

test('_formatWebBundleURL should escape whitespace', function(t) {
	var webBundleURL = prototype._formatWebBundleURL('/Users/person/path to/theme.war', 'context-path');

	t.is(webBundleURL, 'webbundle:file:///Users/person/path%20to/theme.war?Web-ContextPath=/context-path');
});

test('_getWebBundleIdFromResponse should either return web bundle id from response data or return 0', function(t) {
	var webBundleId = prototype._getWebBundleIdFromResponse('Here is some data\n g!');

	t.is(webBundleId, 0);

	webBundleId = prototype._getWebBundleIdFromResponse('Bundle ID: 123 \n g!');

	t.is(webBundleId, '123');

	webBundleId = prototype._getWebBundleIdFromResponse('123\nBundle ID: 456 \n 123 g!');

	t.is(webBundleId, '456');
});

test('_installWebBundle should call sendCommand with formatted install command string', function(t) {
	prototype.sendCommand = sinon.stub().returns('promise');

	var promise = prototype._installWebBundle('/some/path/to/file.war', 'context-path');

	t.is(promise, 'promise');

	t.true(prototype.sendCommand.calledWith('install', 'webbundle:file:///some/path/to/file.war?Web-ContextPath=/context-path'));
});

test('_startBundle should call sendCommand with bundle id arg', function(t) {
	prototype.sendCommand = sinon.stub().returns('promise');

	var promise = prototype._startBundle('123');

	t.is(promise, 'promise');

	t.true(prototype.sendCommand.calledWith('start', '123'));
});
