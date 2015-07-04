var config      = require('../config');
var async       = require('async');
var AWS         = require('aws-sdk');

module.exports = function() {

    var self = this;

    this.iam        = false;
    this.key_id     = false;
    this.key_secret = false;

    this.set_key_id = function(key_id)
    {
        this.key_id = key_id;

        if (this.key_secret)
        {
            this.init_auth();
        }
    }

    this.set_key_secret = function(key_secret)
    {
        this.key_secret = key_secret;

        if (this.key_id)
        {
            this.init_auth();
        }
    }

    this.init_auth = function()
    {

        var credentials = {
            accessKeyId     : self.key_id,
            secretAccessKey : self.key_secret,
            region          : config["region"]
        }

        self.iam = new AWS.IAM(credentials);
    }

    this.create_role = function(role_name)
    {

        return new Promise(function(resolve, reject){

            if (!self.iam)
            {
                reject('IAM credentials not defined');
            }

            var policy_document =  {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "",
                        "Effect": "Allow",
                        "Principal": { "Service": [ "lambda.amazonaws.com" ] },
                        "Action": [
                            "sts:AssumeRole"
                        ]
                    }
                ]
            }

            policy_document = JSON.stringify(policy_document);

            var params = {
                "AssumeRolePolicyDocument" : policy_document,
                "RoleName"                 : role_name,
            }

            self.iam.createRole(params, function(err, data) {

                if (!err)
                {
                    if (data && data['Role'])
                    {

                        console.log("\n iam.createRole waiting \n"); // todo: change to check state

                        setTimeout(function(){
                            resolve(data['Role']);
                        }, 10000);
                    }
                    else
                    {
                        resolve(false);
                    }
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.attach_role_policy = function(role_name, policy_arn)
    {

        return new Promise(function(resolve, reject){

            if (!self.iam)
            {
                reject('IAM credentials not defined');
            }

            var params = {
                "PolicyArn" : policy_arn,
                "RoleName"  : role_name
            };

            self.iam.attachRolePolicy(params, function(err, data) {

                if (!err)
                {
                    resolve(data);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.create_user = function(name)
    {

        return new Promise(function(resolve, reject){

            if (!self.iam)
            {
                reject('IAM credentials not defined');
            }

            var params = {
                "UserName" : name
            };

            self.iam.createUser(params, function(err, data) {

                if (!err)
                {
                    resolve(data);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.create_access_key = function(user_name)
    {

        return new Promise(function(resolve, reject){

            if (!self.iam)
            {
                reject('IAM credentials not defined');
            }

            var params = {
                UserName : user_name
            };

            self.iam.createAccessKey(params, function(err, data) {

                if (!err)
                {
                    setTimeout(function(){
                        resolve(data.AccessKey);
                    }, 10 * 1000);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.attach_user_policies = function(user_name, policies)
    {
        return new Promise(function(resolve, reject){

            if (!self.iam)
            {
                reject('IAM credentials not defined');
            }

            async.map(policies, function(policy_arn, callback) {

                var params = {
                    PolicyArn : policy_arn,
                    UserName  : user_name
                };

                self.iam.attachUserPolicy(params, function(err, data) {

                    if (!err)
                    {
                        callback(false, data.ResponseMetadata);
                    }
                    else
                    {
                        callback(err, false);
                    }
                });

            }, function(error, results) {

                if (!error)
                {
                    resolve(results);
                }
                else
                {
                    reject(error);
                }
            });
        });
    }
}