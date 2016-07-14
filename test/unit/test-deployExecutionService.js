'use strict';

const Promise = require('bluebird');
const Should = require('should');
const _ = require('lodash');
const Path = require('path');
const Fs = Promise.promisifyAll(require('fs'));
const Sinon = require('sinon');
const Git = require('nodegit');
const Chance = require('chance');
const rimraf = require('rimraf');
const AdmZip = require('adm-zip');
const logger = require('../helper/logger');
const DeployExecutionServiceFactory = require('../../lib/deployExecutionServiceFactory');

/** @type DeployCredentials */
const credentials = require('../helper/unit-config/deployCredentials.json');
/** @type DeployExecutionServiceInfo */
const info = {
    region: 'us-east-1',
    s3Bucket: 'myBucket',
    appName: 'web-with-tag',
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

const chance = new Chance();
var filePath = Path.join(folders.gitRoot, 'someFileDoesntExist.txt');

describe('DeployExecutionService', function() {

    describe('deploy', function() {

        beforeEach(function() {
            var repository, index, fileName;

            // Mock out Git repo
            return Promise.resolve()
                .then(() => Git.Repository.init(folders.gitRoot, 0))
                .then(repo => repository = repo)
                .then(() => {
                    fileName = chance.string({length: 10, pool: 'abcdefghijklmnopqrstuvwxyz'}) + '.txt';
                    filePath = Path.resolve(folders.gitRoot,fileName);
                    const contents = chance.string();
                    return Fs.writeFileAsync(filePath, contents);
                })
                .then(() => repository.refreshIndex())
                .then(idx => index = idx)
                .then(() => index.addByPath(fileName))
                .then(() => index.write())
                .then(() => index.writeTree())
                .then((oid) => {
                    var author = Git.Signature.create("John Doe",
                        "john.doe@gmail.com", 123456789, 60);
                    var committer = Git.Signature.create("John Doe",
                        "john.doe@github.com", 987654321, 90);

                    // Since we're creating an inital commit, it has no parents. Note that unlike
                    // normal we don't get the head either, because there isn't one yet.
                    return repository.createCommit("HEAD", author, committer, "message", oid, []);
                })
                .then(commitId => console.log("New Commit: ", commitId));
        });

        afterEach(function() {
            // Remove the Git repo
            return new Promise((resolve, reject) => {
                rimraf(Path.resolve(folders.gitRoot,'.git'), (err) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve();
                    }
                })
            })
                .then(() => Fs.unlinkAsync(filePath));
        });

        it('Should successfully kick off a new EB deployment', function() {

            let zipBuffer;
            const deployExecutionService = DeployExecutionServiceFactory.create(credentials, info, folders, logger);
            Sinon.stub(deployExecutionService, '_waitForAppVersionToBeAvailable', (s3Info) => Promise.resolve(s3Info));
            Sinon.stub(deployExecutionService._s3, 'putObject', (params, callback) => {
                zipBuffer = params.Body; // Save off the zipBuffer so we can check the file contents
                callback(null, {});
            });
            Sinon.stub(deployExecutionService._eb, 'createApplicationVersion', (newAppVersion, callback) => {callback(null, {})});
            Sinon.stub(deployExecutionService._eb, 'updateEnvironment', (environmentUpdate, callback) => {callback(null, {})});

            return deployExecutionService.deploy()
                .then(() => {
                    Should.exist(zipBuffer);
                    // Confirm the .zip we upload contains the {{TAG}} replaced
                    const zip = new AdmZip(zipBuffer);
                    const zipEntries = zip.getEntries();

                    zipEntries.length.should.eql(1);
                    const dockerrunAwsJsonContents = zipEntries[0].getData().toString('utf8');
                    
                    const matches = dockerrunAwsJsonContents.match(/testapp\/web:[a-z0-9]{40,40}/);
                    Should.exist(matches);
                })
        });

        it('Should successfully kick off a new EB deployment with a specific commit hash', function() {
            this.timeout(15000);

            let zipBuffer;
            const updatedInfo = _.clone(info);
            updatedInfo.commitHash = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmn';
            const deployExecutionService = DeployExecutionServiceFactory.create(credentials, updatedInfo, folders, logger);
            Sinon.stub(deployExecutionService, '_waitForAppVersionToBeAvailable', (s3Info) => Promise.resolve(s3Info));
            Sinon.stub(deployExecutionService._s3, 'putObject', (params, callback) => {
                zipBuffer = params.Body; // Save off the zipBuffer so we can check the file contents
                callback(null, {});
            });
            Sinon.stub(deployExecutionService._eb, 'createApplicationVersion', (newAppVersion, callback) => {callback(null, {})});
            Sinon.stub(deployExecutionService._eb, 'updateEnvironment', (environmentUpdate, callback) => {callback(null, {})});

            return deployExecutionService.deploy()
                .then(() => {
                    Should.exist(zipBuffer);
                    // Confirm the .zip we upload contains the {{TAG}} replaced
                    const zip = new AdmZip(zipBuffer);
                    const zipEntries = zip.getEntries();

                    zipEntries.length.should.eql(1);
                    const dockerrunAwsJsonContents = zipEntries[0].getData().toString('utf8');

                    const matches = dockerrunAwsJsonContents.match(/testapp\/web:abcdefghijklmnopqrstuvwxyzabcdefghijklmn/);
                    Should.exist(matches);
                })
        });

    });

});