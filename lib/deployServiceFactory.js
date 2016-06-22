'use strict';

const Path = require('path');
const DeployService = require('./deployService');

class DeployServiceFactory {

    /**
     * @param {Object} folders
     * @param {string} folders.config - should contain deployConfig.json and deployCredentials.json
     * @param {string} folders.apps - should contain a folder for each app with a Dockerrun.aws.json file within it
     * @param {string} folders.gitRoot - git repo root folder (expect .git within)
     * @param {Logger} logger
     * @returns {DeployService}
     */
    static create(folders, logger) {
        // @TODO: validate credentials & config

        /** @type {DeployCredentials} */
        const credentials = require(Path.join(folders.config, 'deployCredentials.json'));
        /** @type {DeployConfig} */
        const config = require(Path.join(folders.config, 'deployConfig.json'));

        return new DeployService(credentials, config, folders, logger);
    }
    
}

module.exports = DeployServiceFactory;
