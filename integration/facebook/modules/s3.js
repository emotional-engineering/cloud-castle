var Promise     = require("bluebird");
var auth_config = require('../auth_config');
var config      = require('../config.js');
var AWS         = require('aws-sdk');
var fs          = require('fs');
var s3          = new AWS.S3(auth_config[config['username_prefix'] + "s3"]);

module.exports = function() {

    this.download_file = function(bucket, key, file_path)
    {
        return new Promise(function(resolve, reject){

            var params = {
                Bucket : bucket,
                Key    : key
            };

            var file = fs.createWriteStream(file_path);

            s3.getObject(params).
            on('httpData', function(chunk) {
                file.write(chunk);
            }).
            on('httpDone', function() {
                file.end();
                resolve(true);
            }).
            on('error', function(error) {
                reject(error);
            }).
            send();
        });
    }

    this.get_file_content = function(bucket, key)
    {
        return new Promise(function(resolve, reject){

            var params = {
                Bucket : bucket,
                Key    : key
            };

            var buffer = '';

            s3.getObject(params).
            on('httpData', function(chunk) {
                buffer+=chunk;
            }).
            on('httpDone', function() {
                resolve(buffer);
            }).
            on('error', function(error) {
                reject(error);
            }).

            send();

        });
    }

    this.write_file_content = function(bucket, key, content)
    {
        return new Promise(function(resolve, reject){

            var params = {
                Bucket : bucket,
                Key    : key,
                Body   : content
            };

            s3.upload(params, function(err, data) {

                if (!err)
                {
                    resolve(true);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.delete_file = function(bucket, key)
    {
        return new Promise(function(resolve, reject){

            var params = {
                Bucket : bucket,
                Key    : key,
            };

            s3.deleteObject(params, function(err, data) {

                if (!err)
                {
                    resolve(true);
                }
                else
                {
                    reject(false);
                }
            });
        });
    }

    this.check_file_exist = function(bucket, key)
    {
        return new Promise(function(resolve, reject){

            var params = {
                Bucket : bucket,
                Key    : key
            };

            s3.headObject(params, function(err, data) {

                if (!err)
                {
                    resolve(true);
                }
                else
                {
                    reject(false);
                }
            });
        });
    }

    this.create_bucket = function(bucket)
    {
        return new Promise(function(resolve, reject){

            if (config.region == "us-east-1") // InvalidLocationConstraint: The specified location-constraint is not valid
            {
                var region = "EU"; // not sure
            }
            else {
                var region = config.region;
            }

            var params = {
                Bucket : bucket,
                ACL    : 'private',
                CreateBucketConfiguration : {
                    LocationConstraint : region
                },
            };

            s3.createBucket(params, function(err, data) {

                if (err){
                    reject(err);
                }
                else
                {
                    resolve(data);
                }
            });
        });
    }
}
