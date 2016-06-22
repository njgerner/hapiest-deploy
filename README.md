## Overview

hapiest-deploy is designed to make it really simple to deploy an application
running multiple Docker images/services within the same repository to
 AWS ElasticBeanstalk.  It may or may not expand scope over time.

 If that sounds like what you need, go ahead and install the module:

 ```npm install --save-dev hapiest-deploy```

## Getting starting

## Setting up tests

Tests are split up into two types: **unit**, which run exclusively locally,
and **integration**, which need to connect to AWS services such as S3 and
ElasticBeanstalk to succeed.  Unit tests should pass out of the box but you'll
need to do two things to get integration tests running:

1. Create three configuration files:

    A. test/helper/integration-config/deployConfig.json

    ```
    {
      "region": "us-east-1",
      "s3Bucket":"elasticbeanstalk-us-east-1-076414961204",
      "ebApplications" : [{
          "name": "web",
          "ebApplicationName": "visualai-web",
          "ebEnvironments": [{
              "name": "staging",
              "ebEnvironmentName": "visualai-staging-env",
              "ebEnvironmentId": "e-igxa3sgfmm",
              "gitBranch": "master"
          }]
      }]
    }
    ```
    Note, you should replace the above config with values that represent an
    ElasticBeanstalk app/env you have running in an AWS account accessible from
    credentials provided in (b)

    B. test/helper/integration-config/deployCredentials.json

    ```
    {
      "awsCredentials": {
        "accessKeyId": "myAcccessKeyId",
        "secretAccessKey": "mySecretAccessKey"
      }
    }
    ```

    C. test/helper/integration-apps/web/Dockerrun.aws.json

    ```
    {
      "AWSEBDockerrunVersion": "1",
      "Authentication": {
        "Bucket": "vizualai",
        "Key": "config/dockerhub/dockerhub-vizualai-auth.json"
      },
      "Image": {
        "Name": "vizualai/web",
        "Update": "true"
      },
      "Ports": [
        {
          "HostPort": "80",
          "ContainerPort": "3000"
        }
      ]
    }
    ```

    You will need to adjust the folder underneath integration-apps based on
    values you provide in (A).  The foldername should correspond to one of
    application names you have in the config file (name not ebApplicationName).