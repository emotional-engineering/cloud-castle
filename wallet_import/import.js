var path     = require("path");
var fs       = require("fs");
var AWS      = require('aws-sdk');
var colors   = require('colors');
var argv     = require('optimist').argv;
var config   = require('./config');

var sqs      = require('./modules/sqs');
var sns      = require('./modules/sns');
var ec2      = require('./modules/ec2');
var lambda   = require('./modules/lambda');
var iam      = require('./modules/iam');
var template = require('./modules/template');
var qconsole = require('./modules/console');
var database = require('./database');

sqs      = new sqs();
sns      = new sns();
ec2      = new ec2();
lambda   = new lambda();
iam      = new iam();
template = new template();
qconsole = new qconsole();
database = new database();

const zipfile_path = __dirname + "/lambda.zip";

var tmp_topic_arn         = false;
var lambda_execution_role = false;

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

        return database.create_table();

    }).then(function(result){

        console.log("\n", 'system table created:', "\n");
        console.log(result);
        console.log("\n", 'waiting for table ready...', "\n");

        return database.wait_table_ready();

    }).then(function(result){

        console.log("\n", 'system table ready:', "\n");
        console.log(result);

        var ebs_size = config["ec2"]["ebs_start_size"];

        return ec2.create_volume(ebs_size);

    }).then(function(result){

        console.log("\n", 'ebs volume created:', "\n");
        console.log(result);

        return database.set('ebs_volume_id', result.VolumeId);

    }).then(function(result){

        var role_name = config['iam']['lambda_execution_role'];

        return iam.create_role(role_name);

    }).then(function(result){

        console.log("\n", 'iam role created:', "\n");
        console.log(result);

        lambda_execution_role = result.Arn;

        var name   = result['RoleName'];
        var policy = 'arn:aws:iam::aws:policy/AWSLambdaFullAccess';

        return iam.attach_role_policy(name, policy);

    }).then(function(result){

        console.log("\n", 'policy attached:', "\n");
        console.log(result);

        if (argv.save_private_key)
        {
            var save_private_key = true;
        }
        else
        {
            var save_private_key = false;
        }

        var keypair_name = config["ec2"]["keypair_name"];

        return ec2.create_keypair(keypair_name, save_private_key);

    }).then(function(result){

        console.log("\n", 'keypair created...', "\n");

        var security_group_name        = config['ec2']['security_group'];
        var security_group_description = 'security group for cloud wallet';

        return ec2.create_security_group(security_group_name, security_group_description);

    }).then(function(result){

        console.log("\n", "security group created:", "\n");
        console.log(result);

        var topic_name = config['sns']['inbound_transactions'];

        return sns.create_topic(topic_name);

    }).then(function(result){

        console.log("\n", "sns topic created:", "\n");
        console.log(result);

        tmp_topic_arn = result.TopicArn;

        var package_files = config['lambda']['package_files'].slice();

        package_files.push('controller.js');

        return lambda.create_package(package_files, zipfile_path);

    }).then(function(result){

        console.log("\n", "zip package file created...");

        var function_name  = config['lambda']['controller']['name'];
        var zip_filename   = zipfile_path;
        var handler        = config['lambda']['controller']['handler'];
        var execution_role = lambda_execution_role;

        return lambda.create_function(function_name, zip_filename, handler, execution_role, 60);

    }).then(function(lambda_result){

        console.log("\n", "lambda function for control transactions created:", "\n");
        console.log(lambda_result, "\n");

        return sns.subscribe(tmp_topic_arn, lambda_result.FunctionArn, 'lambda');

    }).then(function(result){

        console.log("\n", "topic subscribed to function:", "\n");
        console.log(result);

        var statement_id = 'cloud-castle-' + Math.floor((Math.random() * 9999999999999999));

        return lambda.add_permission(config['lambda']['controller']['name'], tmp_topic_arn, statement_id);

    }).then(function(result){

        console.log("\n", "lambda function permission added:", "\n");
        console.log(result);

        var topic_name = config['sns']['spot_wait'];
        return sns.create_topic(topic_name);

    }).then(function(result){

        console.log("\n", "sns topic created:", "\n");
        console.log(result);

        tmp_topic_arn = result.TopicArn;

        return database.set('spot_wait_sns_topic', result.TopicArn);

    }).then(function(result){

        var package_files = config['lambda']['package_files'].slice();

        package_files.push('spot_wait.js');

        return lambda.create_package(package_files, zipfile_path);

    }).then(function(result){

        console.log("\n", "zip package file created...");

        var function_name  = config['lambda']['spot_wait']['name'];
        var zip_filename   = zipfile_path;
        var handler        = config['lambda']['spot_wait']['handler'];
        var execution_role = lambda_execution_role;

        return lambda.create_function(function_name, zip_filename, handler, execution_role, 60);

    }).then(function(lambda_result){

        console.log("\n", "lambda function for control spot request created:", "\n");
        console.log(lambda_result, "\n");

        return sns.subscribe(tmp_topic_arn, lambda_result.FunctionArn, 'lambda');

    }).then(function(result){

        console.log("\n", "topic subscribed to function:", "\n");
        console.log(result);

        var statement_id = 'cloud-castle-' + Math.floor((Math.random() * 9999999999999999));

        return lambda.add_permission(config['lambda']['spot_wait']['name'], tmp_topic_arn, statement_id);

    }).then(function(result){

        console.log("\n", "lambda function permission added:", "\n");
        console.log(result);

        var topic_name = config['sns']['instance_wait'];
        return sns.create_topic(topic_name);

     }).then(function(result){

        console.log("\n", "sns topic created:", "\n");
        console.log(result);

        tmp_topic_arn = result.TopicArn;

        return database.set('instance_wait_sns_topic', result.TopicArn);

    }).then(function(result){

        var package_files = config['lambda']['package_files'].slice();

        package_files.push('instance_wait.js');

        return lambda.create_package(package_files, zipfile_path);

    }).then(function(result){

        console.log("\n", "zip package file created...");

        var function_name  = config['lambda']['instance_wait']['name'];
        var zip_filename   = zipfile_path;
        var handler        = config['lambda']['instance_wait']['handler'];
        var execution_role = lambda_execution_role;

        return lambda.create_function(function_name, zip_filename, handler, execution_role, 60);

    }).then(function(lambda_result){

        console.log("\n", "lambda function for instance control created:", "\n");
        console.log(lambda_result, "\n");

        return sns.subscribe(tmp_topic_arn, lambda_result.FunctionArn, 'lambda');

    }).then(function(result){

        console.log("\n", "topic subscribed to function:", "\n");
        console.log(result);

        var statement_id = 'cloud-castle-' + Math.floor((Math.random() * 9999999999999999));

        return lambda.add_permission(config['lambda']['instance_wait']['name'], tmp_topic_arn, statement_id);

    }).then(function(result){

        console.log("\n", "lambda function permission added:", "\n");
        console.log(result);

        var queue_name = config['sqs']['pending_transactions'];
        return sqs.create_queue(queue_name);

    }).then(function(result){

        console.log("\n", "transactions queue created:", "\n");
        console.log(result);

        var queue_name = config['sqs']['transactions_auth_answers'];
        return sqs.create_queue(queue_name);

    }).then(function(result){

        console.log("\n", "queue for transaction authentication created:", "\n");
        console.log(result);

        var topic_name = config['sns']['transactions_auth_requests'];

        return sns.create_topic(topic_name);

    }).then(function(result){

        console.log("\n", "queue for transaction authentication answers created:", "\n");
        console.log(result);
        console.log("\n");

        return database.set('transactions_auth_requests', result.TopicArn);

    }).then(function(result){

        var topic_name = config['sns']['transactions_results'];
        return sns.create_topic(topic_name);

    }).then(function(result){

        console.log("\n", "SNS topic for transaction results created:", "\n");
        console.log(result);
        console.log("\n");

        return database.set('transactions_results', result.TopicArn);

    }).then(function(result){

        var config_body = fs.readFileSync('./config.js', 'utf8');
        return template.replace_in_file('./init_server.bash', "{{config}}", config_body);

    }).then(function(result){

        return template.replace_in_file('./init_server.bash', "{{bitcoind_user}}", config['bitcoind']['user']);

    }).then(function(result){

        return template.replace_in_file('./init_server.bash', "{{bitcoind_pass}}", config['bitcoind']['pass']);

    }).then(function(result){

        console.log("\n completed \n");

        return process.exit(1);

    }).catch(function(error){

        console.log("\n", 'error:', "\n");
        console.log(error);

    });