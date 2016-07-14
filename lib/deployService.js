'use strict';

const Promise = require('bluebird');
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
     * @param {DeployExecutionServiceInfo|DeployExecutionServiceInfo[]} info
     * @param {DeployRequest|DeployRequestMultiple} deployRequest
     * @param {Logger} logger
     * @returns {Promise}
     */

    /**
     * @name DeployRequest
     * @type {Object}
     * @property {string} appName
     * @property {string} envName
     * @property {string} [commitHash] - defaults to looking up commit hash in the repository based on gitBranch configuration setting for the appName:envName
     */

    /**
     * @name DeployRequestMultiple
     * @type {Object}
     * @property {string[]} appNames
     * @property {string} envName
     * @property {string} [commitHash] - defaults to looking up commit hash in the repository based on gitBranch configuration setting for the appName:envName
     */

    /**
     * @name DeployRuntimeConfig
     * @type {Object}
     * @property [runPreHook=false] - defaults to looking up commit hash in the repository based on gitBranch configuration setting for the appName:envName
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
     * Steps:
     * 1) Create the deploy execution service
     * 2) Confirm it's configured correctly
     * 3) Run the preHookFunction if necessary
     * 4) Run the deploy
     *
     * @param {DeployRequest} deployRequest
     * @param {DeployRuntimeConfig} runtimeConfig
     * @returns {Promise}
     */
    deploy(deployRequest, runtimeConfig) {
        return Promise.resolve()
        .then(() => {
            const deployExecService = this._getDeployExecutionService(deployRequest);

            return Promise.resolve()
            .then(() => deployExecService.confirmSettingsOk())
            .then(() => this._executeDeployPreHookIfNecessary(runtimeConfig, deployExecService))
            .then(() => deployExecService.deploy())
            ;
        })
    }

    /**
     * 1) Create a DeployExecutionService instance for each request
     * 2) Confirm that all of them are configured ok
     * 3) Execute the preHookFunction if necessary
     * 4) Run the deploys in parallel
     *
     * @param {DeployRequestMultiple} deployRequest
     * @param {DeployRuntimeConfig} runtimeConfig
     * @returns {Promise}
     */
    deployMultiple(deployRequest, runtimeConfig) {
        return Promise.resolve(deployRequest.appNames)
        .map(appName => this._getDeployExecutionService({appName:appName, envName:deployRequest.envName, commitHash:deployRequest.commitHash}))
        .map(deployExecService => deployExecService.confirmSettingsOk().then(() => deployExecService))
        .then(deployExecServices => {
            return Promise.resolve()
            .then(() => this._confirmAllCommitHashesEqual(deployExecServices))
            .then(() => this._executeDeployMultiplePreHookIfNecessary(runtimeConfig, deployExecServices))
            .then(() => deployExecServices)
        })
        .map(deployExecService => deployExecService.deploy());
    }

    /**
     * @param {Array} argv
     *      -a, --application: the app name in the config file you'd like to deploy; can be comma delimited to deploy multiple apps for the same environment simultaneously
     *      -e, --environment: the environment for the app that you'd like to deploy
     *      -c, --commit-hash: optional commit hash to deploy; if gitBranch isn't defined for the app:env then it's required
     *      -p, --run-pre-hook: flag that must be passed to run deployment pre-hook assuming it's provided in constructor
     *
     * @returns {Promise}
     */
    deployFromCommandLineArguments(argv) {
        return Promise.resolve()
            .then(() => this._parseCommandLineArguments(argv))
            .then(args => this.deployMultiple(args.deployRequest, args.runtimeConfig))
        ;
    }

    /**
     * @param {DeployRequest} deployRequest
     * @returns {DeployExecutionService}
     * @private
     */
    _getDeployExecutionService(deployRequest) {
        const ebApp = this._findApp(deployRequest.appName);
        const ebEnv = this._findEnv(ebApp, deployRequest.envName);
        const deployExecInfo = this._createDeployExecutionServiceInfo(ebApp, ebEnv, deployRequest.commitHash);
        const deployExecService = this._createDeployExecutionService(deployExecInfo);
        return deployExecService;
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
     * @param {string} [commitHash]
     * @returns {DeployExecutionServiceInfo}
     * @private
     */
    _createDeployExecutionServiceInfo(ebApp, ebEnv, commitHash) {
        return {
            region: this._config.region,
            s3Bucket: this._config.s3Bucket,
            appName: ebApp.name,
            ebApplicationName: ebApp.ebApplicationName,
            envName: ebEnv.name,
            ebEnvironmentName: ebEnv.ebEnvironmentName,
            ebEnvironmentId: ebEnv.ebEnvironmentId,
            gitBranch: ebEnv.gitBranch,
            commitHash: commitHash
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
     * @param {DeployExecutionService} deployExecServices
     * @returns {Promise}
     * @private
     */
    _confirmAllCommitHashesEqual(deployExecServices) {
        return Promise.resolve(deployExecServices)
            .map(service => service.getCommitHash())
            .reduce((priorCommitHash, commitHash) => {
                if (priorCommitHash !== commitHash) {
                    throw new Error(`All commit hashes must be equal when deploying multiple environments simultaneously (${priorCommitHash} vs ${commitHash})`);
                }
                return commitHash;
            });
    }

    /**
     * @param {DeployRuntimeConfig} runtimeConfig
     * @param {DeployExecutionService} deployExecService
     * @returns {Promise}
     * @private
     */
    _executeDeployPreHookIfNecessary(runtimeConfig, deployExecService) {
        const info = deployExecService.info;
        const commitHash = deployExecService.getCommitHash();
        return this._executePreHookIfNecessary(runtimeConfig, info, commitHash);
    }

    /**
     * Note, must have already called _confirmAllCommitHashesEqual prior to this function
     *
     * @param {DeployRuntimeConfig} runtimeConfig
     * @param {DeployExecutionService[]} deployExecServices
     * @returns {Promise}
     * @private
     */
    _executeDeployMultiplePreHookIfNecessary(runtimeConfig, deployExecServices) {
        return Promise.resolve()
        .then(() => {
            const infoArr = deployExecServices.map(service => service.info);
            const commitHash = deployExecServices[0].getCommitHash();
            return Promise.all([infoArr, commitHash])
        })
        .spread((infoArr, commitHash) => this._executePreHookIfNecessary(runtimeConfig, infoArr, commitHash))
    }

    /**
     * @param {DeployRuntimeConfig} runtimeConfig
     * @param {DeployExecutionServiceInfo|DeployExecutionServiceInfo[]} info
     * @param {string} commitHash
     * @returns {Promise}
     * @private
     */
    _executePreHookIfNecessary(runtimeConfig, info, commitHash) {
        const preHookFunction = runtimeConfig.runPreHook && this._preHookFunction ? this._preHookFunction : null;
        const preHookPromise = preHookFunction ?
            Promise.resolve().then(() => preHookFunction(info, commitHash, this._logger)) :
            Promise.resolve();
        return preHookPromise;
    }

    /**
     * @param {Array} argv
     *      -a, --application: the app name in the config file you'd like to deploy; can be comma delimited to deploy multiple apps for the same environment simultaneously
     *      -e, --environment: the environment for the app that you'd like to deploy
     *      -c, --commit-hash: optional commit hash to deploy; if gitBranch isn't defined for the app:env then it's required
     *      -p, --run-pre-hook: flag that must be passed to run deployment pre-hook assuming it's provided in constructor
     *
     * @returns {{deployRequest: DeployRequest, runtimeConfig: DeployRuntimeConfig}}
     * @private
     */
    _parseCommandLineArguments(argv) {
        const argvObj = parseArgv(argv);
        const appNamesString = argvObj.a || argvObj.application;
        const envName = argvObj.e || argvObj.environment;
        const commitHash = argvObj.c || argvObj['commit-hash'];
        const runPreHook = !!(argvObj.p || argvObj['run-pre-hook']);

        if (!appNamesString) {
            throw new Error('Invalid argv - option -a / --application required');
        }
        if (!envName) {
            throw new Error('Invalid argv - option -e / --environment required');
        }
        if(commitHash && commitHash.length !== 40) {
            throw new Error('Invalid argv - option -c / --commit-hash must be a full length git hash of 40 characters');
        }

        const appNames = appNamesString.split(',');

        const returnObj = {
            deployRequest: {
                appNames: appNames,
                envName: envName,
                commitHash: commitHash
            },
            runtimeConfig: {
                runPreHook: runPreHook
            }
        };

        return returnObj;
    }

}

module.exports = DeployService;
