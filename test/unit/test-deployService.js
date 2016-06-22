'use strict';

const Should = require('should');
const Promise = require('bluebird');
const Path = require('path');
const Sinon = require('sinon');
const DeployServiceFactory = require('../../lib/deployServiceFactory');
const DeployService = require('../../lib/deployService');
const logger = require('../helper/logger');

/** @type {DeployServiceFactoryFolders} */
const folders = {
    config: Path.resolve(__dirname, '../helper/unit-config'),
    apps: Path.resolve(__dirname, '../helper/unit-apps'),
    gitRoot: Path.resolve(__dirname, '../helper/unit-repo')
};

describe('DeployService', function() {

    describe('deployFromCommandLineArguments', function() {

        it('Should throw an error because argv.length < 3', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (appName, envName) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.exist(error);
                    error.message.should.eql(`Invalid argv - expecting three arguments ['node', '/path/to/binFile.js', '{appName}:{envName}']`);
                    deployStub.callCount.should.eql(0);
                })

        });

        it('Should throw an error because argv.length > 3', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (appName, envName) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', 'myapp:production', 'anotherarg'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.exist(error);
                    error.message.should.eql(`Invalid argv - expecting three arguments ['node', '/path/to/binFile.js', '{appName}:{envName}']`);
                    deployStub.callCount.should.eql(0);
                })

        });

        it('Should throw an error because third element in argv is not in {appName}:{envName} format', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (appName, envName) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', 'badargs'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.exist(error);
                    error.message.should.eql(`Invalid argument badargs - Must be in format {appName}:{envName}`);
                    deployStub.callCount.should.eql(0);
                })

        });

        it('Should throw an error because third element in argv does not have envName populated', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (appName, envName) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', 'myapp:'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.exist(error);
                    error.message.should.eql(`Invalid argument myapp: - Must be in format {appName}:{envName}`);
                    deployStub.callCount.should.eql(0);
                })

        });

        it('Should throw an error because third element in argv does not have envName populated', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (appName, envName) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', ':envName'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.exist(error);
                    error.message.should.eql(`Invalid argument :envName - Must be in format {appName}:{envName}`);
                    deployStub.callCount.should.eql(0);
                })

        });

        it('Should successfully deploy with correct appName = myapp and envName = production', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (appName, envName) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', 'myapp:production'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.not.exist(error);
                    deployStub.callCount.should.eql(1);
                    deployStub.calledWith('myapp', 'production').should.be.True();
                })

        });

    })

});
