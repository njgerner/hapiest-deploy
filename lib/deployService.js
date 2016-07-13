'use strict';

const parseArgv = require('minimist');
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
     * @name DeployPreHookFunction
     * @type {Function}
     * @param {DeployExecutionServiceInfo} info
     * @param {DeployRequest} deployRequest
     * @param {Logger} logger
     * @returns {Promise}
     */

    /**
     * @name DeployRequest
     * @type {Object}
     * @property {string} appName
     * @property {string} envName
     * @property {string} [commitHash] - defaults to looking up commit hash in the repository based on gitBranch configuration setting for the appName:envName
     * @property {boolean} [runPreHook=false] - if true, will run pre-hook function before kicking off deployment and stop deployment if it throws an error
     */

    /**
     * @param {DeployCredentials} credentials
     * @param {DeployConfig} config
     * @param {DeployFolders} folders
     * @param {Logger} logger
     * @param {DeployPreHookFunction} [preHookFunction]
     */
    constructor(credentials, config, folders, logger, preHookFunction) {
        this._credentials = credentials;
        this._config = config;
        this._folders = folders;
        this._logger = logger;
        this._preHookFunction = preHookFunction;
    }

    /**
     * @param {DeployRequest} deployRequest
     * @returns {Promise}
     */
    deploy(deployRequest) {
        return Promise.resolve()
            .then(() => {
                const ebApp = this._findApp(deployRequest.appName);
                const ebEnv = this._findEnv(ebApp, deployRequest.envName);
                const preHookFunction = deployRequest.runPreHook ? this._preHookFunction : null;

                const deployExecService = this._getDeployExecutionService(ebApp, ebEnv, preHookFunction);
                return deployExecService.deploy(deployRequest.commitHash);
            })
    }

    /**
     * @param {Array} argv
     *      -a, --app: the app name in the config file you'd like to deploy
     *      -e, --env: the environment for the app that you'd like to deploy
     *      -c, --commit-hash: optional commit hash to deploy; if gitBranch isn't defined for the app:env then it's required
     *      -p, --run-pre-hook: flag that must be passed to run deployment pre-hook assuming it's provided in constructor
     *
     * @returns {Promise}
     */
    deployFromCommandLineArguments(argv) {
        return Promise.resolve()
            .then(() => this._parseCommandLineArguments(argv))
            .then(deployRequest => this.deploy(deployRequest))
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
     * @param {DeployPreHookFunction|null} preHookFunction
     * @returns {DeployExecutionService}
     * @private
     */
    _getDeployExecutionService(ebApp, ebEnv, preHookFunction) {
        const deployExecInfo = this._createDeployExecutionServiceInfo(ebApp, ebEnv);
        const deployExecService = this._createDeployExecutionService(deployExecInfo, preHookFunction);
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
     * @param {DeployPreHookFunction} preHookFunction
     * @returns {DeployExecutionService}
     * @private
     */
    _createDeployExecutionService(deployExecInfo, preHookFunction) {
        return DeployExecutionServiceFactory.create(this._credentials, deployExecInfo, this._folders, this._logger, preHookFunction);
    }

    /**
     * @param {Array} argv
     *      -a, --application: the app name in the config file you'd like to deploy
     *      -e, --environment: the environment for the app that you'd like to deploy
     *      -c, --commit-hash: optional commit hash to deploy; if gitBranch isn't defined for the app:env then it's required
     *      -p, --run-pre-hook: flag that must be passed to run deployment pre-hook assuming it's provided in constructor
     *
     * @returns {DeployRequest}
     * @private
     */
    _parseCommandLineArguments(argv) {
        const argvObj = parseArgv(argv);
        const appName = argvObj.a || argvObj.application;
        const envName = argvObj.e || argvObj.environment;
        const commitHash = argvObj.c || argvObj['commit-hash'];
        const runPreHook = !!(argvObj.p || argvObj['run-pre-hook']);

        if (!appName) {
            throw new Error('Invalid argv - option -a / --application required');
        }
        if (!envName) {
            throw new Error('Invalid argv - option -e / --environment required');
        }
        if(commitHash && commitHash.length !== 40) {
            throw new Error('Invalid argv - option -c / --commit-hash must be a full length git hash of 40 characters');
        }

        /** @type {DeployRequest} */
        const deployRequest = {
            appName: appName,
            envName: envName,
            commitHash: commitHash,
            runPreHook: runPreHook
        };

        return deployRequest;
    }

}

module.exports = DeployService;
