'use strict';

const Should = require('should');
const Path = require('path');
const DeployServiceFactory = require('../../lib/deployServiceFactory');
const DeployService = require('../../lib/deployService');
const logger = require('../helper/logger');

describe('DeployServiceFactory', function() {

    describe('create', function() {
    
       it('Should successfully create an instance of DeployService', function() {
    
           /** @type {DeployCredentials} */
           const credentials = require('../helper/unit-config/deployCredentials.json');
           /** @type {DeployConfig} */
           const config = require('../helper/unit-config/deployConfig.json');

           const folders = {
               config: Path.resolve(__dirname, '../helper/unit-config'),
               apps: Path.resolve(__dirname, '../helper/unit-apps'),
               gitRoot: Path.resolve(__dirname, '../helper/unit-repo')
           };
           const deployService = DeployServiceFactory.create(folders, logger);
           Should.exist(deployService);
           deployService.should.be.an.instanceOf(DeployService);
       });

        // @TODO: add test cases for invalid configurations
    
    });

});