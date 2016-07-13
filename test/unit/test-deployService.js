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

        it('Should throw an error because -a / --application required', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (deployRequest) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.exist(error);
                    error.message.should.eql(`Invalid argv - option -a / --application required`);
                    deployStub.callCount.should.eql(0);
                })

        });

        it('Should throw an error because -e / --environment required', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (deployRequest) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', '-a', 'myapp'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.exist(error);
                    error.message.should.eql(`Invalid argv - option -e / --environment required`);
                    deployStub.callCount.should.eql(0);
                })

        });

        it('Should throw an error because commit hash is not valid', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (deployRequest) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', '--application=myapp', '--environment=production', '-c', 'shortinvalidhash'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.exist(error);
                    error.message.should.eql(`Invalid argv - option -c / --commit-hash must be a full length git hash of 40 characters`);
                    deployStub.callCount.should.eql(0);
                })

        });

        it('Should successfully deploy with correct appName = myapp and envName = production', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (deployRequest) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', '-a', 'myapp', '-e', 'production'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.not.exist(error);
                    deployStub.callCount.should.eql(1);
                    deployStub.calledWith({appName:'myapp', envName:'production', commitHash: undefined, runPreHook: false}).should.be.True();
                })

        });

        it('Should successfully deploy with correct appName = myapp, envName = production, and commitHash = ab5e9e3a4959bc91adfa3028b09226e47331504d', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (deployRequest) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', '--application=myapp', '-e', 'production', '--commit-hash=ab5e9e3a4959bc91adfa3028b09226e47331504d'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.not.exist(error);
                    deployStub.callCount.should.eql(1);
                    deployStub.calledWith({appName:'myapp', envName:'production', commitHash:'ab5e9e3a4959bc91adfa3028b09226e47331504d', runPreHook: false}).should.be.True();
                })

        });

        it('Should successfully deploy with correct appName = myapp, envName = production, commitHash = ab5e9e3a4959bc91adfa3028b09226e47331504d, and runPreHook = true', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (deployRequest) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', '--application=myapp', '-e', 'production', '--commit-hash=ab5e9e3a4959bc91adfa3028b09226e47331504d', '-p'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.not.exist(error);
                    deployStub.callCount.should.eql(1);
                    deployStub.calledWith({appName:'myapp', envName:'production', commitHash:'ab5e9e3a4959bc91adfa3028b09226e47331504d', runPreHook: true}).should.be.True();
                })

        });

        it('Should successfully deploy with correct appName = myapp, envName = production, and runPreHook = true', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const deployStub = Sinon.stub(service, 'deploy', (deployRequest) => new Promise(resolve => resolve()));

            const argv = ['node', 'someFile.js', '--application=myapp', '-e', 'production', '--run-pre-hook'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.not.exist(error);
                    deployStub.callCount.should.eql(1);
                    deployStub.calledWith({appName:'myapp', envName:'production', commitHash:undefined, runPreHook: true}).should.be.True();
                })

        });

    })

});
