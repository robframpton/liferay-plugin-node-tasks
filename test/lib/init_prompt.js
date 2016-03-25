'use strict';

var _ = require('lodash');
var chai = require('chai');
var InitPrompt = require('../../lib/init_prompt');
var path = require('path');
var sinon = require('sinon');

var assert = chai.assert;

describe('Init Prompt', function() {
	var prototype;

	function getDefaultAnswers() {
		return {
			appServerPath: path.join(__dirname, '../fixtures/server/tomcat'),
			deployPath: path.join(__dirname, '../fixtures/server/deploy'),
			url: 'http://localhost:8080',
			webappsPath: path.join(__dirname, '../fixtures/server/tomcat/webapps')
		};
	}

	beforeEach(function() {
		prototype = _.create(InitPrompt.prototype);
	});

	describe('_afterPrompt', function() {
		it('should store normalized answers', function() {
			prototype.store = {
				store: sinon.spy()
			};

			var defaultAnswers = getDefaultAnswers();

			prototype.done = sinon.spy();

			prototype._afterPrompt(defaultAnswers);

			var storeArgs = prototype.store.store.args[0][0];

			assert.equal(storeArgs.appServerPath, defaultAnswers.appServerPath, 'normalized answer equals what it was passed');
			assert.equal(storeArgs.deployPath, defaultAnswers.deployPath, 'normalized answer equals what it was passed');
			assert.equal(storeArgs.url, defaultAnswers.url, 'normalized answer equals what it was passed');

			assert(!_.isUndefined(storeArgs.appServerPathPlugin), 'appServerPathPlugin is defined');
			assert(!_.isUndefined(storeArgs.deployed), 'deployed is defined');
			assert(!_.isUndefined(storeArgs.pluginName), 'themeName is defined');

			assert.equal(prototype.done.callCount, 1, 'done is invoked after store');

			prototype.done = null;

			prototype._afterPrompt(defaultAnswers);
		});
	});

	describe('_deployPathWhen', function() {
		it('should return false and add deployPath to answers', function(done) {
			var defaultAnswers = getDefaultAnswers();

			var answers = {
				appServerPath: defaultAnswers.appServerPath
			};

			prototype.async = function() {
				return function(ask) {
					assert.equal(answers.deployPath, defaultAnswers.deployPath, 'deployPath is correct');
					assert(!ask, 'ask is false');

					done();
				}
			};

			prototype._deployPathWhen(answers);
		});

		it('should return true when deploy path is not a sibling with provided appServerPath', function(done) {
			var defaultAnswers = getDefaultAnswers();

			var answers = {
				appServerPath: path.join(defaultAnswers.appServerPath, '..')
			};

			prototype.async = function() {
				return function(ask) {
					assert(_.isUndefined(answers.deployPath), 'deployPath has not been set');
					assert(ask, 'ask is true');

					done();
				}
			};

			prototype._deployPathWhen(answers);
		});
	});

	describe('_getDefaultDeployPath', function() {
		it('should return defualy deploy path value based on answers', function() {
			var defaultPath = prototype._getDefaultDeployPath({
				appServerPath: '/path-to/appserver/tomcat'
			});

			assert.equal(path.join('/path-to', 'appserver', 'deploy'), defaultPath);
		});
	});

	describe('_normalizeAnswers', function() {
		it('should normalize prompt answers', function() {
			var defaultAnswers = getDefaultAnswers();
			var answers = getDefaultAnswers();

			prototype._normalizeAnswers(answers);

			assert.equal(answers.appServerPath, defaultAnswers.appServerPath, 'normalized answer equals what it was passed');
			assert.equal(answers.deployPath, defaultAnswers.deployPath, 'normalized answer equals what it was passed');
			assert.equal(answers.url, defaultAnswers.url, 'normalized answer equals what it was passed');

			assert.equal(answers.pluginName, 'liferay-plugin-tasks', 'pluginName is root dir of plugin');
			assert.equal(answers.deployed, false, 'deployed is set to false');
			assert.equal(answers.appServerPathPlugin, path.join(defaultAnswers.appServerPath, 'webapps/liferay-plugin-tasks'));

			answers = _.assign({}, defaultAnswers);

			answers.appServerPath = defaultAnswers.webappsPath;

			prototype._normalizeAnswers(answers);

			assert.equal(answers.appServerPathPlugin, path.join(defaultAnswers.appServerPath, 'webapps/liferay-plugin-tasks'));
		});
	});

	describe('_prompt', function() {
		it('should invoke inquirer.prompt with correct args', function() {
			var inquirer = require('inquirer');

			var prompt = inquirer.prompt;

			inquirer.prompt = sinon.spy();

			prototype._prompt({});

			var args = inquirer.prompt.args[0];

			_.forEach(args[0], function(item, index) {
				assert(_.isObject(item), 'question is object');
			});

			assert(_.isFunction(args[1]), 'second argument is a callback function');

			inquirer.prompt = prompt;
		});
	});

	describe('_validateAppServerPath', function() {
		it('should properly validate path and return appropriate messages if invalid', function() {
			var defaultAnswers = getDefaultAnswers();

			var retVal = prototype._validateAppServerPath();

			assert(!retVal, 'retVal is false');

			retVal = prototype._validateAppServerPath('/fake/path');

			assert.equal(retVal, '"/fake/path" does not exist', 'error message');

			retVal = prototype._validateAppServerPath(path.join(__dirname, 'init_prompt.js'));

			assert.match(retVal, /is not a directory/, 'error message');

			retVal = prototype._validateAppServerPath(path.join(defaultAnswers.appServerPath, '..'));

			assert.match(retVal, /doesn't appear to be an app server directory/, 'error message');

			retVal = prototype._validateAppServerPath(defaultAnswers.appServerPath);

			assert(retVal, 'path is valid');

			retVal = prototype._validateAppServerPath(defaultAnswers.webappsPath);

			assert(retVal, 'pointing to webapps is valid');
		});
	});
});
