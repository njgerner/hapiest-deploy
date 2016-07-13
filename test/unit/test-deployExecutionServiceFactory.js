'use strict';

const Should = require('should');
const Path = require('path');
const DeployExecutionServiceFactory = require('../../lib/deployExecutionServiceFactory');
const DeployExecutionService = require('../../lib/deployExecutionService');
const logger = require('../helper/logger');

describe('DeployExecutionServiceFactory', function() {
   
    describe('create', function() {

        it('Should create an instance of DeployExecutionService', function() {

            /** @type DeployCredentials */
            const credentials = require('../helper/unit-config/deployCredentials.json');
            /** @type DeployExecutionServiceInfo */
            const info = {
                region: 'us-east-1',
                s3Bucket: 'myBucket',
                appName: 'web',
                ebApplicationName: 'testapp-web',
                envName: 'staging',
                ebEnvironmentName: 'testapp-web-staging',
                ebEnvironmentId: 'e-adsfnk32',
                gitBranch: 'master'
            };

            /** @type {DeployFolders} */
            const folders = {
                apps: Path.resolve(__dirname, '../helper/unit-apps'),
                gitRoot: Path.resolve(__dirname, '../helper/unit-repo')
            };

            const deployExecutionService = DeployExecutionServiceFactory.create(credentials, info, folders, logger);
            Should.exist(deployExecutionService);
            deployExecutionService.should.be.an.instanceOf(DeployExecutionService);

        });

        it('Should create an instance of DeployExecutionService with preHookFunction defined', function() {

            /** @type DeployCredentials */
            const credentials = require('../helper/unit-config/deployCredentials.json');
            /** @type DeployExecutionServiceInfo */
            const info = {
                region: 'us-east-1',
                s3Bucket: 'myBucket',
                appName: 'web',
                ebApplicationName: 'testapp-web',
                envName: 'staging',
                ebEnvironmentName: 'testapp-web-staging',
                ebEnvironmentId: 'e-adsfnk32',
                gitBranch: 'master'
            };

            /** @type {DeployFolders} */
            const folders = {
                apps: Path.resolve(__dirname, '../helper/unit-apps'),
                gitRoot: Path.resolve(__dirname, '../helper/unit-repo')
            };
            const preHookFunction = (info, deployRequest, logger) => {  };

            const deployExecutionService = DeployExecutionServiceFactory.create(credentials, info, folders, logger, preHookFunction());
            Should.exist(deployExecutionService);
            deployExecutionService.should.be.an.instanceOf(DeployExecutionService);

        });
        
    });
    
});