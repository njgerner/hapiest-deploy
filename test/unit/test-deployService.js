'use strict';

const Should = require('should');
const Promise = require('bluebird');
const Path = require('path');
const Sinon = require('sinon');
const Chance = require('chance');
const chance = Chance();
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

        it('Should successfully deploy with correct appName = web and envName = production', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const originalGetDeployExecutionService = service._getDeployExecutionService.bind(service);
            let deployExecService;
            const getDeployExecutionServiceStub = Sinon.stub(service, '_getDeployExecutionService', (deployRequest) => {
                deployExecService = originalGetDeployExecutionService(deployRequest);
                deployExecService.deploy = Sinon.stub().returns(Promise.resolve());
                deployExecService.getCommitHash = Sinon.stub().returns(Promise.resolve('asdfjklasdfkjlkjknjlvjasnjlnfldnlaseaseh'));
                return deployExecService;
            });

            const argv = ['node', 'someFile.js', '-a', 'web', '-e', 'production'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.not.exist(error);
                    Should.exist(deployExecService);
                    deployExecService.deploy.calledOnce.should.be.True();
                    deployExecService.info.appName.should.eql('web');
                    deployExecService.info.envName.should.eql('production');
                })
            ;
        });

        it('Should successfully deploy with correct appName = myapp, envName = production, and commitHash = ab5e9e3a4959bc91adfa3028b09226e47331504d', function() {
            const service = DeployServiceFactory.create(folders, logger);
            const originalGetDeployExecutionService = service._getDeployExecutionService.bind(service);
            let deployExecService;
            const getDeployExecutionServiceStub = Sinon.stub(service, '_getDeployExecutionService', (deployRequest) => {
                deployExecService = originalGetDeployExecutionService(deployRequest);
                deployExecService.deploy = Sinon.stub().returns(Promise.resolve());
                return deployExecService;
            });

            const argv = ['node', 'someFile.js', '--application=web-with-tag', '-e', 'production', '--commit-hash=ab5e9e3a4959bc91adfa3028b09226e47331504d'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.not.exist(error);
                    Should.exist(deployExecService);
                    deployExecService.deploy.calledOnce.should.be.True();
                    deployExecService.info.appName.should.eql('web-with-tag');
                    deployExecService.info.envName.should.eql('production');
                    deployExecService.info.commitHash.should.eql('ab5e9e3a4959bc91adfa3028b09226e47331504d');
                })
        });

        it('Should successfully deploy with correct appName = web, envName = production, commitHash = ab5e9e3a4959bc91adfa3028b09226e47331504d, and runPreHook = true', function() {
            const preHookStub = Sinon.stub().returns(Promise.resolve());
            const service = DeployServiceFactory.create(folders, logger, preHookStub);
            const originalGetDeployExecutionService = service._getDeployExecutionService.bind(service);
            const deployStub = Sinon.stub(service, 'deploy').returns(Promise.resolve());
            let deployExecService;
            const getDeployExecutionServiceStub = Sinon.stub(service, '_getDeployExecutionService', (deployRequest) => {
                deployExecService = originalGetDeployExecutionService(deployRequest);
                deployExecService.deploy = Sinon.stub().returns(Promise.resolve());
                return deployExecService;
            });

            const argv = ['node', 'someFile.js', '--application=web', '-e', 'staging', '--commit-hash=ab5e9e3a4959bc91adfa3028b09226e47331504d', '-p'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.not.exist(error);
                    preHookStub.calledOnce.should.be.True();

                    Should.exist(deployExecService);
                    deployExecService.deploy.calledOnce.should.be.True();
                    deployExecService.info.appName.should.eql('web');
                    deployExecService.info.envName.should.eql('staging');
                    deployExecService.info.commitHash.should.eql('ab5e9e3a4959bc91adfa3028b09226e47331504d');
                })

        });

        it('Should successfully deploy with correct appName = web, envName = production, commitHash = ab5e9e3a4959bc91adfa3028b09226e47331504d, and runPreHook = true (--run-pre-hook)', function() {
            const preHookStub = Sinon.stub().returns(Promise.resolve());
            const service = DeployServiceFactory.create(folders, logger, preHookStub);
            const originalGetDeployExecutionService = service._getDeployExecutionService.bind(service);
            let deployExecService;
            const getDeployExecutionServiceStub = Sinon.stub(service, '_getDeployExecutionService', (deployRequest) => {
                deployExecService = originalGetDeployExecutionService(deployRequest);
                deployExecService.deploy = Sinon.stub().returns(Promise.resolve());
                return deployExecService;
            });

            const argv = ['node', 'someFile.js', '--application=web', '-e', 'staging', '--commit-hash=ab5e9e3a4959bc91adfa3028b09226e47331504d', '--run-pre-hook'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.not.exist(error);
                    preHookStub.calledOnce.should.be.True();

                    Should.exist(deployExecService);
                    deployExecService.deploy.calledOnce.should.be.True();
                    deployExecService.info.appName.should.eql('web');
                    deployExecService.info.envName.should.eql('staging');
                    deployExecService.info.commitHash.should.eql('ab5e9e3a4959bc91adfa3028b09226e47331504d');
                })

        });

        it('Should successfully deploy two applications, calling preHookFunction first', function() {
            const preHookStub = Sinon.stub().returns(Promise.resolve());
            const service = DeployServiceFactory.create(folders, logger, preHookStub);
            const originalGetDeployExecutionService = service._getDeployExecutionService.bind(service);
            let deployExecServices = [];
            const getDeployExecutionServiceStub = Sinon.stub(service, '_getDeployExecutionService', (deployRequest) => {
                const deployExecService = originalGetDeployExecutionService(deployRequest);
                deployExecService.deploy = Sinon.stub().returns(Promise.resolve());
                deployExecServices.push(deployExecService);
                return deployExecService;
            });

            const argv = ['node', 'someFile.js', '--application=web,web-with-tag', '-e', 'staging', '--commit-hash=ab5e9e3a4959bc91adfa3028b09226e47331504d', '--run-pre-hook'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.not.exist(error);
                    preHookStub.calledOnce.should.be.True();

                    deployExecServices.length.should.eql(2);
                    deployExecServices[0].deploy.calledOnce.should.be.True();
                    deployExecServices[1].deploy.calledOnce.should.be.True();

                    deployExecServices[0].info.appName.should.eql('web');
                    deployExecServices[0].info.envName.should.eql('staging');
                    deployExecServices[0].info.commitHash.should.eql('ab5e9e3a4959bc91adfa3028b09226e47331504d');

                    deployExecServices[1].info.appName.should.eql('web-with-tag');
                    deployExecServices[1].info.envName.should.eql('staging');
                    deployExecServices[1].info.commitHash.should.eql('ab5e9e3a4959bc91adfa3028b09226e47331504d');
                })

        });

        it('Should throw an error if Git commit hashes do not match', function() {
            const preHookStub = Sinon.stub().returns(Promise.resolve());
            const service = DeployServiceFactory.create(folders, logger, preHookStub);
            const originalGetDeployExecutionService = service._getDeployExecutionService.bind(service);
            let deployExecServices = [];
            let commitHashes = [];
            const getDeployExecutionServiceStub = Sinon.stub(service, '_getDeployExecutionService', (deployRequest) => {
                const deployExecService = originalGetDeployExecutionService(deployRequest);
                deployExecService.deploy = Sinon.stub().returns(Promise.resolve());
                const commitHash = chance.string({length:40});
                commitHashes.push(commitHash);
                deployExecService.getCommitHash = Sinon.stub().returns(Promise.resolve(commitHash));
                deployExecServices.push(deployExecService);
                return deployExecService;
            });

            const argv = ['node', 'someFile.js', '--application=web,web-with-tag', '-e', 'staging', '--run-pre-hook'];
            var error;
            return service.deployFromCommandLineArguments(argv)
                .catch(err => error = err)
                .then(() => {
                    Should.exist(error);
                    error.message.should.eql(`All commit hashes must be equal when deploying multiple environments simultaneously (${commitHashes[0]} vs ${commitHashes[1]})`);
                    preHookStub.calledOnce.should.be.False();

                    deployExecServices.length.should.eql(2);
                    deployExecServices[0].deploy.calledOnce.should.be.False();
                    deployExecServices[1].deploy.calledOnce.should.be.False();

                    deployExecServices[0].info.appName.should.eql('web');
                    deployExecServices[0].info.envName.should.eql('staging');

                    deployExecServices[1].info.appName.should.eql('web-with-tag');
                    deployExecServices[1].info.envName.should.eql('staging');
                })

        });

    });

    describe('deploy', function() {

        it('Should successfully kick off a deployment, calling the preHookFunction before', function() {
            const preHookStub = Sinon.stub().returns(Promise.resolve());
            const deployStub = Sinon.stub().returns(Promise.resolve());
            const service = DeployServiceFactory.create(folders, logger, preHookStub);

            const originalDeployExecutionService = service._getDeployExecutionService.bind(service);
            const getExecServiceStub = Sinon.stub(service, '_getDeployExecutionService', (ebApp, ebEnv, commitHash) => {
                const deployExecutionService = originalDeployExecutionService(ebApp, ebEnv, commitHash);
                deployExecutionService.deploy = deployStub;
                return deployExecutionService;
            });

            return service.deploy({appName:'web', envName:'staging', commitHash:'ab5e9e3a4959bc91adfa3028b09226e47331504d'}, {runPreHook: true})
                .then(() => {
                    preHookStub.calledOnce.should.be.True();
                    deployStub.calledOnce.should.be.True();
                })
        });

        it('Should not kick off a deployment if the preHookFunction throws an error', function() {
            const deployStub = Sinon.stub().returns(Promise.resolve());
            const service = DeployServiceFactory.create(folders, logger, () => Promise.reject(new Error('PreHookFunction failed')));

            const originalDeployExecutionService = service._getDeployExecutionService.bind(service);
            const getExecServiceStub = Sinon.stub(service, '_getDeployExecutionService', (ebApp, ebEnv, commitHash) => {
                const deployExecutionService = originalDeployExecutionService(ebApp, ebEnv, commitHash);
                deployExecutionService.deploy = deployStub;
                return deployExecutionService;
            });

            let error;
            return service.deploy({appName:'web', envName:'staging', commitHash:'ab5e9e3a4959bc91adfa3028b09226e47331504d'}, {runPreHook: true})
                .catch(err => error = err)
                .then(() => {
                    Should.exist(error);
                    deployStub.notCalled.should.be.True();
                })
        });

    })

});
