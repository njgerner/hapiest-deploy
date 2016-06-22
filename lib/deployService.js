'use strict';

const DeployExecutionServiceFactory = require('./deployExecutionServiceFactory');

class DeployService {

    /**
     * @name DeployCredentials
     * @type {Object}
     * @property {Object} awsCredentials
     * @property {string} awsCredentials.accessKeyId
     * @property {string} awsCredentials.secretAccessKey
     */

    /**
     * @name DeployConfig
     * @type {Object}
     * @property {string} region
     * @property {string} s3Bucket
     * @property {EbApplicationConfig[]} ebApplications
     */

    /**
     * @name EbApplicationConfig
     * @type {Object}
     * @property {string} name
     * @property {string} ebApplicationName
     * @property {EbEnvironmentConfig[]} ebEnvironments
     */

    /**
     * @name EbEnvironmentConfig
     * @type {Object}
     * @property {string} name
     * @property {string} ebEnvironmentName
     * @property {string} ebEnvironmentId
     * @property {string} gitBranch
     */

    /**
     * @name DeployFolders
     * @type {Object}
     * @property {string} apps
     * @property {string} gitRoot
     */

    /**
     * @param {DeployCredentials} credentials
     * @param {DeployConfig} config
     * @param {DeployFolders} folders
     * @param {Logger} logger
     */
    constructor(credentials, config, folders, logger) {
        this._credentials = credentials;
        this._config = config;
        this._folders = folders;
        this._logger = logger;
    }

    /**
     * @param {string} appName
     * @param {string} envName
     * @returns {Promise}
     */
    deploy(appName, envName) {
        return Promise.resolve()
            .then(() => {
                const ebApp = this._findApp(appName);
                const ebEnv = this._findEnv(ebApp, envName);

                const deployExecService = this._getDeployExecutionService(ebApp, ebEnv);
                return deployExecService.deploy();
            })
    }

    /**
     * @param {Array} argv
     * @returns {Promise}
     */
    deployFromCommandLineArguments(argv) {
        return Promise.resolve()
            .then(() => this._parseCommandLineArguments(argv))
            .then(deployRequest => this.deploy(deployRequest.appName, deployRequest.envName))
        ;
    }

    /**
     * @param appName
     * @returns {EbApplicationConfig}
     * @private
     */
    _findApp(appName) {
        const appArr = this._config.ebApplications.filter(app => app.name === appName);
        if (appArr.length > 1) {
            throw new Error(`Invalid configuration: multiple applications with name ${appName}`);
        }
        if (appArr.length === 0) {
            throw new Error(`Invalid configuration: no applications with name ${appName}`);
        }

        return appArr[0];
    }

    /**
     * @param {EbApplicationConfig} ebApp
     * @param {string} envName
     * @returns {EbEnvironmentConfig}
     * @private
     */
    _findEnv(ebApp, envName) {
        const envArr = ebApp.ebEnvironments.filter(env => env.name === envName);
        if (envArr.length > 1) {
            throw new Error(`Invalid configuration: application ${ebApp.name} has multiple environments with name ${envName}`);
        }
        if (envArr.length === 0) {
            throw new Error(`Invalid configuration: application ${ebApp.name} has no environment named ${envName}`);
        }

        return envArr[0];
    }

    /**
     * @param {EbApplicationConfig} ebApp
     * @param {EbEnvironmentConfig} ebEnv
     * @returns {DeployExecutionService}
     * @private
     */
    _getDeployExecutionService(ebApp, ebEnv) {
        const deployExecInfo = this._createDeployExecutionServiceInfo(ebApp, ebEnv);
        const deployExecService = this._createDeployExecutionService(deployExecInfo);
        return deployExecService;
    }

    /**
     * @param {EbApplicationConfig} ebApp
     * @param {EbEnvironmentConfig} ebEnv
     * @returns {DeployExecutionServiceInfo}
     * @private
     */
    _createDeployExecutionServiceInfo(ebApp, ebEnv) {
        return {
            region: this._config.region,
            s3Bucket: this._config.s3Bucket,
            appName: ebApp.name,
            ebApplicationName: ebApp.ebApplicationName,
            envName: ebEnv.name,
            ebEnvironmentName: ebEnv.ebEnvironmentName,
            ebEnvironmentId: ebEnv.ebEnvironmentId,
            gitBranch: ebEnv.gitBranch
        }
    }

    /**
     * @param {DeployExecutionServiceInfo} deployExecInfo
     * @returns {DeployExecutionService}
     * @private
     */
    _createDeployExecutionService(deployExecInfo) {
        return DeployExecutionServiceFactory.create(this._credentials, deployExecInfo, this._folders, this._logger);
    }

    /**
     * @param {Array} argv
     * @returns {{appName: string, envName: string}}
     * @private
     */
    _parseCommandLineArguments(argv) {
        if (argv.length !== 3) {
            throw new Error(`Invalid argv - expecting three arguments ['node', '/path/to/binFile.js', '{appName}:{envName}']`);
        }

        const deployRequestArgString = argv[2];
        const deployRequestArgArray = deployRequestArgString.split(':');

        if (deployRequestArgArray.length !== 2 || deployRequestArgArray[0] === '' || deployRequestArgArray[1] === '') {
            throw new Error(`Invalid argument ${deployRequestArgString} - Must be in format {appName}:{envName}`)
        }

        const appName = deployRequestArgArray[0];
        const envName = deployRequestArgArray[1];

        return {
            appName: appName,
            envName: envName
        };
    }

}

module.exports = DeployService;
