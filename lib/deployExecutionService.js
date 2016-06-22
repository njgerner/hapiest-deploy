'use strict';

const AdmZip = require('adm-zip');
const Git = require('nodegit');
const Path = require('path');
const Promise = require('bluebird');

class DeployExecutionService {

    /**
     * @param {AWS.S3} s3
     * @param {AWS.ElasticBeanstalk} eb
     * @param {DeployExecutionServiceInfo} info
     * @param {DeployFolders} folders
     * @param {Logger} logger
     */
    constructor(s3, eb, info, folders, logger) {
        this._s3 = s3;
        this._eb = eb;
        this._info = info;
        this._folders = folders;
        this._logger = logger;
    }

    /**
     * High level execution summary
     *
     *      1) Create a zip file (application bundle) containing the necessary EB files (at time of writing this comment, only Dockerrun.aws.json)
     *      2) Upload the zip file (application bundle) to S3
     *      3) Create a new EB application version
     *      4) Update the EB environment with the new application version
     *
     * @returns {Promise}
     */
    deploy() {
        return Promise.resolve()
            .tap(() => this._logger.info('Deploy: attempting to deploy application', this._info))
            .then(() => Promise.all([
                this._getCommitSha(),
                this._createEbApplicationBundleBuffer()
            ]))
            .spread((sha, appBundleBuffer) => this._uploadEbApplicationBundleToS3(sha, appBundleBuffer))
            .then(s3Info => this._createNewEbApplicationVersion(s3Info))
            .then(s3Info => this._updateEbEnvironment(s3Info))
        ;
    }

    /**
     * @returns {Promise.<String>}
     * @private
     */
    _getCommitSha() {
        const gitBranch = this._info.gitBranch;
        const repoPath = this._folders.gitRoot;

        return Git.Repository.open(repoPath)
            .then(repo => repo.getBranchCommit(gitBranch))
            .then(commit => commit.sha())
    }

    /**
     * @returns {Buffer}
     * @private
     */
    _createEbApplicationBundleBuffer() {
        const zip = new AdmZip();
        const localPath = Path.join(this._folders.apps, this._info.appName,'Dockerrun.aws.json');
        const zipPath = '';
        zip.addLocalFile(localPath, zipPath);
        return zip.toBuffer();
    }

    /**
     * @name DeployExecutionServiceS3CreationInfo
     * @type {Object}
     * @property {string} s3Key
     * @property {string} filenameNoExtension
     */

    /**
     * @param {string} sha
     * @param {Buffer} zipBuffer
     * @returns {Promise.<DeployExecutionServiceS3CreationInfo, Error>}
     * @private
     */
    _uploadEbApplicationBundleToS3(sha, zipBuffer) {
        this._logger.info(`Deploy: Commit SHA hash ${sha}`);

        const s3Info = {};
        s3Info.filenameNoExtension = `app-${sha}`;
        s3Info.s3Key = `${this._info.ebApplicationName}/${s3Info.filenameNoExtension}.zip`;

        const s3PutObjectParams = {
            Key: s3Info.s3Key,
            Body: zipBuffer
        };

        this._logger.info(`Deploy: Attempting to upload application bundle to S3`, {key: s3Info.Key, bucket: this._info.s3Bucket});

        return new Promise((resolve, reject) => {
            this._s3.putObject(s3PutObjectParams, (err, data) => {
                if (err) {
                    this._logger.error(`Deploy: Failed uploading application bundle to S3`, err);
                    reject(err);
                } else {
                    this._logger.info(`Deploy: succeeded adding application bundle to S3`, data);
                    resolve(s3Info);
                }
            });
        });
    }

    /**
     * @param {DeployExecutionServiceS3CreationInfo} s3Info
     * @private
     */
    _createNewEbApplicationVersion(s3Info) {
        const newApplicationVersion = {
            ApplicationName: this._info.ebApplicationName,
            Description: '',
            VersionLabel: s3Info.filenameNoExtension,
            SourceBundle: {
                S3Bucket: this._info.s3Bucket,
                S3Key: s3Info.s3Key
            },
            AutoCreateApplication: false, // Don't create a new EB application!  That would be kind of bad
            Process: true // Check the EB config files (e.g., Dockerrun.aws.json) for errors
        };

        this._logger.info('Deploy: creating new ElasticBeanstalk application version', newApplicationVersion);

        return new Promise((resolve, reject) => {
            this._eb.createApplicationVersion(newApplicationVersion, (err, data) => {
                if (err) {
                    if (err.code === 'InvalidParameterValue' && err.message === `Application Version ${newApplicationVersion.VersionLabel} already exists.`) {
                        this._logger.info(`Deploy: application version ${newApplicationVersion.VersionLabel} already exists`);
                    } else {
                        this._logger.error('Deploy: failed to create new ElasticBeanstalk application version', err);
                        reject(err);
                    }
                } else {
                    this._logger.info('Deploy: ElasticBeanstalk application version created', data);
                    resolve(s3Info);
                }
            });
        })
        .then(() => {
            this._logger.info('Deploy: sleeping for 10s to allow application version to finalize before updating environment');
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve(s3Info)
                }, 10000);
            });

            // @TODO: add recursive checks for application version readiness
            //const describeAppVersions = {
            //    ApplicationName: config.applications.web.applicationName,
            //    VersionLabels: [fileInfo.filenameNoExtension]
            //};
            //beanstalk.describeApplicationVersions()
        })
    }

    /**
     * @param {DeployExecutionServiceS3CreationInfo} s3Info
     * @returns {Promise}
     * @private
     */
    _updateEbEnvironment(s3Info) {
        const environmentUpdate = {
            ApplicationName: this._info.ebApplicationName,
            EnvironmentId: this._info.ebEnvironmentId,
            EnvironmentName: this._info.ebEnvironmentName,
            VersionLabel: s3Info.filenameNoExtension
        };

        this._logger.info('Deployment: attempting to update ElasticBeanstalk environment', environmentUpdate);

        return new Promise((resolve, reject) => {
            this._eb.updateEnvironment(environmentUpdate, (err, data) => {
                if (err) {
                    this._logger.error('Deployment: failed on updating ElasticBeanstalk environment', err);
                    reject(err);
                } else {
                    this._logger.info('Deployment: ElasticBeanstalk environment update API call succeeded.  Check ElasticBeanstalk Dashboard to monitor deploy progress.', data);
                    this._logger.info(`https://console.aws.amazon.com/elasticbeanstalk/home?region=${this._info.region}#/environment/dashboard?applicationName=${this._info.ebApplicationName}&environmentId=${this._info.ebEnvironmentId}`)
                    resolve(data);
                }

            });
        })
    }

}

module.exports = DeployExecutionService;
