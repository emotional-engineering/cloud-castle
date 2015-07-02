var auth_config   = require('../auth_config');
var config        = require('../config');
var AWS           = require('aws-sdk');
var fs            = require("fs");
var child_process = require('child_process');
var exec          = require('exec');
var path          = require('path');

var lambda = new AWS.Lambda(auth_config[config['username_prefix'] + "lambda"]);

module.exports = function() {

    this.create_function = function(name, zip_filename, handler, execution_role, timeout)
    {
        return new Promise(function(resolve, reject){

            var buf = fs.readFileSync(zip_filename, "binary");

            var params = {
                Code : {
                    ZipFile : new Buffer(buf, "binary")
                },
                FunctionName : name,
                Handler      : handler,
                Role         : execution_role,
                Runtime      : 'nodejs',
                Timeout      : timeout,
                //MemorySize: 128,
            };

            lambda.createFunction(params, function(err, data) {

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

    this.add_permission = function(function_name, source_arn, statement_id)
    {

        return new Promise(function(resolve, reject){

            var params = {
                Action       : "lambda:*", // todo: lambda:invoke
                FunctionName : function_name,
                Principal    : 'sns.amazonaws.com',
                StatementId  : statement_id,
                SourceArn    : source_arn,
                //SourceAccount: '',
            };

            lambda.addPermission(params, function(err, data) {

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

    this.create_package = function(package_files, zipfile_path)
    {
        return new Promise(function(resolve, reject){

            package_files = package_files.join(' ');

            var cmd = 'rm -fr ' + zipfile_path;

            child_process.exec(cmd, function(error, stdout, stderr){

                var folder = path.normalize(config['cloud_castle']['path'] + '/transactions_controller');

                var cmd = 'cd ' + folder + ' && zip -r -0 ' + zipfile_path + ' ' + package_files;

                exec(cmd, function(err, out, code) {

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
        });
    }
}