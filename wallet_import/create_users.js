var config = require('./config');

var fs    = require('fs');
var async = require('async');
var AWS   = require('aws-sdk');

var iam      = require('./modules/iam');
var template = require('./modules/template');
var qconsole = require('./modules/console');

iam      = new iam();
template = new template();
qconsole = new qconsole();

/*
    TODO: should be changed only to the required policies.
*/
var users = [
    { 'name' : 'lambda',   'policies' : ['arn:aws:iam::aws:policy/AWSLambdaFullAccess'] },
    { 'name' : 's3',       'policies' : ['arn:aws:iam::aws:policy/AmazonS3FullAccess']  },
    { 'name' : 'ec2',      'policies' : ['arn:aws:iam::aws:policy/AmazonEC2FullAccess'] },
    { 'name' : 'sns',      'policies' : ['arn:aws:iam::aws:policy/AmazonSNSFullAccess'] },
    { 'name' : 'sqs',      'policies' : ['arn:aws:iam::aws:policy/AmazonSQSFullAccess'] },
    { 'name' : 'dynamodb', 'policies' : ['arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess'] },
]

var welcome_message = qconsole.welcome_message();

qconsole
    .question(welcome_message, 'absolutely')
    .then(function(result){

        if (!result)
        {
            console.log("\n", "ok, bye", "\n");
            return process.exit(1);
        }

        var question = " IAM user key id : ";
        return qconsole.question(question, false);

    }).then(function(key_id){

        if (!key_id)
        {
            console.log("\n", "ok, bye", "\n");
            return process.exit(1);
        }

        iam.set_key_id(key_id);

        var question = " IAM user key secret : ";
        return qconsole.question(question, false);

    }).then(function(key_secret){

        if (!key_secret)
        {
            console.log("\n", "ok, bye", "\n");
            return process.exit(1);
        }

        iam.set_key_secret(key_secret);

        create_users();

    });

var create_users = function()
{

    async.map(users, function(user_data, callback) {

        var user_name  = config['username_prefix'] + user_data.name;
        var policies   = user_data.policies;
        var key_id     = false;
        var secret_key = false;

        iam
            .create_user(user_name)
            .then(function(user_data){

                return iam.create_access_key(user_name);

            }).then(function(access_key){

                console.log('access keys created.');

                key_id     = access_key.AccessKeyId;
                secret_key = access_key.SecretAccessKey;

                return iam.attach_user_policies(user_name, policies);

            }).then(function(result){

                console.log("\n policies attached:\n");
                console.log(result);

                var result = { };

                result[user_name] = {
                                    'accessKeyId'     : key_id,
                                    'secretAccessKey' : secret_key,
                                    'region'          : config['region']
                                    }

                return callback(false, result);

            }).catch(function(error){

                return callback(error, false);

            });

    }, function(error, results) {

        if (error)
        {
            console.log('error:');
            console.log(error);
            return false;
        }

        var config_object = {};

        for (var i = 0; i < results.length; i++)
        {
            for (var user in results[i])
            {
                config_object[user] = results[i][user];
            }
        }

        var auth_config_body = "module.exports = " + JSON.stringify(config_object);

        fs.writeFileSync('./auth_config.js', auth_config_body, 'utf8');

        console.log("\n finish \n");
        process.exit(1);

    });
}