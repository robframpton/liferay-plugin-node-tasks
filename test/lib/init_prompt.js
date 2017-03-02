'use strict';

var _ = require('lodash');
var chai = require('chai');
var path = require('path');
var sinon = require('sinon');
var test = require('ava');

var initCwd = process.cwd();
var InitPrompt;
var prototype;

function getDefaultAnswers() {
	return {
		appServerPath: path.join(__dirname, '../fixtures/server/tomcat'),
		deployPath: path.join(__dirname, '../fixtures/server/deploy'),
		url: 'http://localhost:8080',
		webappsPath: path.join(__dirname, '../fixtures/server/tomcat/webapps')
	};
}

test.before(function() {
	process.chdir(path.join(__dirname, '../..'));

	InitPrompt = require('../../lib/init_prompt');
});

test.after(function() {
	process.chdir(initCwd);
});

test.beforeEach(function() {
	prototype = _.create(InitPrompt.prototype);
});

test('_afterPrompt should store normalized answers', function(t) {
	prototype.store = {
		store: sinon.spy()
	};

	var defaultAnswers = getDefaultAnswers();

	prototype.done = sinon.spy();

	prototype._afterPrompt(defaultAnswers);

	var storeArgs = prototype.store.store.args[0][0];

	t.is(storeArgs.appServerPath, defaultAnswers.appServerPath, 'normalized answer equals what it was passed');
	t.is(storeArgs.deployPath, defaultAnswers.deployPath, 'normalized answer equals what it was passed');
	t.is(storeArgs.url, defaultAnswers.url, 'normalized answer equals what it was passed');

	t.true(!_.isUndefined(storeArgs.appServerPathPlugin), 'appServerPathPlugin is defined');
	t.true(!_.isUndefined(storeArgs.deployed), 'deployed is defined');
	t.true(!_.isUndefined(storeArgs.pluginName), 'themeName is defined');

	t.is(prototype.done.callCount, 1, 'done is invoked after store');

	prototype.done = null;

	prototype._afterPrompt(defaultAnswers);
});

test.cb('_deployPathWhen should return false and add deployPath to answers', function(t) {
	var defaultAnswers = getDefaultAnswers();

	var answers = {
		appServerPath: defaultAnswers.appServerPath
	};

	prototype.async = function() {
		return function(ask) {
			t.is(answers.deployPath, defaultAnswers.deployPath, 'deployPath is correct');
			t.true(!ask, 'ask is false');

			t.end();
		}
	};

	prototype._deployPathWhen(answers);
});

test.cb('_deployPathWhen should return true when deploy path is not a sibling with provided appServerPath', function(t) {
	var defaultAnswers = getDefaultAnswers();

	var answers = {
		appServerPath: path.join(defaultAnswers.appServerPath, '..')
	};

	prototype.async = function() {
		return function(ask) {
			t.true(_.isUndefined(answers.deployPath), 'deployPath has not been set');
			t.truthy(ask, 'ask is true');

			t.end();
		}
	};

	prototype._deployPathWhen(answers);
});

test('_getDefaultDeployPath should return defualy deploy path value based on answers', function(t) {
	var defaultPath = prototype._getDefaultDeployPath({
		appServerPath: '/path-to/appserver/tomcat'
	});

	t.is(path.join('/path-to', 'appserver', 'deploy'), defaultPath);
});

test('_normalizeAnswers should normalize prompt answers', function(t) {
	var defaultAnswers = getDefaultAnswers();
	var answers = getDefaultAnswers();

	prototype._normalizeAnswers(answers);

	t.is(answers.appServerPath, defaultAnswers.appServerPath, 'normalized answer equals what it was passed');
	t.is(answers.deployPath, defaultAnswers.deployPath, 'normalized answer equals what it was passed');
	t.is(answers.url, defaultAnswers.url, 'normalized answer equals what it was passed');

	t.is(answers.pluginName, 'liferay-plugin-node-tasks', 'pluginName is root dir of plugin');
	t.is(answers.deployed, false, 'deployed is set to false');
	t.is(answers.appServerPathPlugin, path.join(defaultAnswers.appServerPath, 'webapps/liferay-plugin-node-tasks'));

	answers = _.assign({}, defaultAnswers);

	answers.appServerPath = defaultAnswers.webappsPath;

	prototype._normalizeAnswers(answers);

	t.is(answers.appServerPathPlugin, path.join(defaultAnswers.appServerPath, 'webapps/liferay-plugin-node-tasks'));
});

test('_prompt should invoke inquirer.prompt with correct args', function(t) {
	var inquirer = require('inquirer');

	var prompt = inquirer.prompt;

	inquirer.prompt = sinon.spy();

	prototype._prompt({});

	var args = inquirer.prompt.args[0];

	_.forEach(args[0], function(item, index) {
		t.true(_.isObject(item), 'question is object');
	});

	t.true(_.isFunction(args[1]), 'second argument is a callback function');

	inquirer.prompt = prompt;
});

test('_validateAppServerPath should properly validate path and return appropriate messages if invalid', function(t) {
	var defaultAnswers = getDefaultAnswers();

	var retVal = prototype._validateAppServerPath();

	t.true(!retVal, 'retVal is false');

	retVal = prototype._validateAppServerPath('/fake/path');

	t.is(retVal, '"/fake/path" does not exist', 'error message');

	retVal = prototype._validateAppServerPath(path.join(__dirname, 'init_prompt.js'));

	t.true(/is not a directory/.test(retVal));

	retVal = prototype._validateAppServerPath(path.join(defaultAnswers.appServerPath, '..'));

	t.true(/doesn't appear to be an app server directory/.test(retVal));

	retVal = prototype._validateAppServerPath(path.join(__dirname, '../fixtures/server/glassfish'));

	t.true(retVal, 'glassfish path is valid');

	retVal = prototype._validateAppServerPath(path.join(__dirname, '../fixtures/server/jboss'));

	t.true(retVal, 'jboss path is valid');

	retVal = prototype._validateAppServerPath(path.join(__dirname, '../fixtures/server/tomcat'));

	t.true(retVal, 'tomcat path is valid');

	retVal = prototype._validateAppServerPath(path.join(__dirname, '../fixtures/server/wildfly'));

	t.true(retVal, 'wildfly path is valid');
});
