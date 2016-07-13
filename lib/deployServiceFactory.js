'use strict';

const Path = require('path');
const DeployService = require('./deployService');

class DeployServiceFactory {

    /**
     * @name DeployServiceFactoryFolders
     * @type {Object}
     * @property {string} config - should contain deployConfig.json and deployCredentials.json
     * @property {string} apps - should contain a folder for each app with a Dockerrun.aws.json file within it
     * @property {string} gitRoot - git repo root folder (expect .git within)
     */

    /**
     * @param {DeployServiceFactoryFolders} folders
     * @param {Logger} logger
     * @param {DeployPreHookFunction} [preHookFunction]
     * @returns {DeployService}
     */
    static create(folders, logger, preHookFunction) {
        // @TODO: validate credentials & config

        /** @type {DeployCredentials} */
        const credentials = require(Path.join(folders.config, 'deployCredentials.json'));
        /** @type {DeployConfig} */
        const config = require(Path.join(folders.config, 'deployConfig.json'));

        return new DeployService(credentials, config, folders, logger, preHookFunction);
    }
    
}

module.exports = DeployServiceFactory;
