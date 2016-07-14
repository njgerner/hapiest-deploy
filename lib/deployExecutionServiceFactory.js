'use strict';

const AWS = require('aws-sdk');
const DeployExecutionService = require('./deployExecutionService');

class DeployExecutionServiceFactory {

    /**
     * @name DeployExecutionServiceInfo
     * @type {Object}
     * @property {string} region
     * @property {string} s3Bucket
     * @property {string} appName
     * @property {string} ebApplicationName
     * @property {string} envName
     * @property {string} ebEnvironmentName
     * @property {string} ebEnvironmentId
     * @property {string|null} gitBranch
     * @property {string|null} commitHash
     */

    /**
     * @param {DeployCredentials} credentials
     * @param {DeployExecutionServiceInfo} info
     * @param {DeployFolders} folders
     * @param {Logger} logger
     * @returns {DeployExecutionService}
     */
    static create(credentials, info, folders, logger) {
        const s3 = new AWS.S3({
            accessKeyId: credentials.awsCredentials.accessKeyId,
            secretAccessKey: credentials.awsCredentials.secretAccessKey,
            params: {
                Bucket: info.s3Bucket
            }
        });

        const eb = new AWS.ElasticBeanstalk({
            accessKeyId: credentials.awsCredentials.accessKeyId,
            secretAccessKey: credentials.awsCredentials.secretAccessKey,
            region: info.region,
            apiVersion: '2010-12-01'
        });

        return new DeployExecutionService(s3, eb, info, folders, logger);
    }
    
}

module.exports = DeployExecutionServiceFactory;
