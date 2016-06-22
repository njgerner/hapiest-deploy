'use strict';

const Should = require('should');
const Promise = require('bluebird');
const Path = require('path');
const Fs = Promise.promisifyAll(require('fs'));
const rimraf = require('rimraf');
const Git = require('nodegit');
const Chance = require('chance');
const DeployServiceFactory = require('../../lib/deployServiceFactory');
const DeployService = require('../../lib/deployService');
const logger = require('../helper/logger');

const folders = {
    config: Path.resolve(__dirname, '../helper/integration-config'),
    apps: Path.resolve(__dirname, '../helper/integration-apps'),
    gitRoot: Path.resolve(__dirname, '../helper/integration-repo')
};

const chance = new Chance();

var filePath = Path.join(folders.gitRoot, 'someFileDoesntExist.txt');

describe('DeployService', function() {

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

        it('Should successfully update AWS EB environment with new application version', function() {
            this.timeout(30000);

            const deployService = DeployServiceFactory.create(folders, logger);

            const appName = 'web', envName = 'staging';
            return deployService.deploy(appName, envName);
        });

    });

});
