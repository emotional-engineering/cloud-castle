var Promise  = require("bluebird");
var AWS      = require('aws-sdk');
var moment   = require('moment');
var crypto   = require('crypto');
var https    = require('https');
var config   = require('./module_config');
var settings = require('./modules/settings');

settings = new settings();

var sns = new AWS.SNS();

var integration_key = config['integration_key'];
var secret_key      = config['secret_key'];
var api_hostname    = config['api_hostname'];
var username        = config['username'];

var iteration_timeout = 30;

exports.handler = function(event, context) {

    var transaction = event.Records[0].Sns.Message;

    if (typeof(transaction) != 'object')
    {
        transaction = JSON.parse(transaction);
    }

    console.log('transaction:');
    console.log(transaction);

    /*
        continue auth
    */

    if (transaction && transaction["wait_auth"])
    {
        console.log('wait auth');

        var path   = '/auth/v2/auth_status';
        var method = 'GET';

        var data = {
                        'txid' : transaction.txid,
                    }

        api_request(method, path, data).then(function(auth_status){

            console.log('auth_status wait:', transaction.txid);
            console.log(auth_status);

            if (auth_status.result == 'allow')
            {

                console.log('success transaction:');
                console.log(transaction.transaction);

                success_auth(transaction.transaction).then(function(result){
                    context.succeed('done');
                });

            }
            else
            {
                console.log('fail transaction:');
                console.log(transaction.transaction);

                context.succeed('fail');
            }

        }).catch(function(error){

            if (error == 'timeout')
            {
                wait_auth(transaction.txid, transaction.transaction).then(function(){
                    console.log("wait next send");
                    context.succeed('ok');
                });
            }
            else
            {
                context.fail(error);
            }
        });

        return true;
    }

    /*
        start auth
    */

    console.log('new auth');

    var path   = '/auth/v2/preauth';
    var method = 'POST';
    var data   = {
        'username' : username,
    }

    var tmp_txid = false;

    api_request(method, path, data).then(function(devices_data){

        if (devices_data.result == 'deny')
        {
            return context.fail('error');
        }

        var devices = devices_data.devices;
        var device  = devices[0].device;

        var path   = '/auth/v2/auth';
        var method = 'POST';

        var type = 'Bitcoin%20Transaction';

        if (transaction.comment)
        {
        //    type += '%20' + transaction.comment;
        }

        var data = {
            'async'    : 1,
            'device'   : device,
            'factor'   : 'push',
            //'ipaddr'   : '8.8.8.8',
            //'pushinfo' : 'test',
            'type'     : type,
            'username' : username,
        }

        return api_request(method, path, data);

    }).then(function(auth_data){

        var txid = auth_data.txid;

        tmp_txid = txid;

        var path   = '/auth/v2/auth_status';
        var method = 'GET';

        var data = {
            'txid' : txid,
        }

        return api_request(method, path, data);

    }).then(function(auth_status){

        return wait_auth(tmp_txid, transaction);

    }).then(function(sns_result){

        context.succeed('ok');

    }).catch(function(error){
        context.fail(error);
    });
};

var success_auth = function(transaction)
{

    return new Promise(function(resolve, reject){

        settings.get("duo_auth_success_auth_topic").then(function(topic_arn){

            console.log('success auth:');
            console.log(transaction);

            transaction = JSON.stringify(transaction);

            var params = {
                "Message"  : transaction,
                "TopicArn" : topic_arn
            };

            sns.publish(params, function(err, data) {

                if (!err)
                {
                    resolve(data);
                }
                else
                {
                    reject(err);
                }
            });
        }).catch(function(error){
            reject(error);
        });
    });
}

var wait_auth = function(txid, transaction)
{
    return new Promise(function(resolve, reject){

        settings.get("duo_auth_sns_topic").then(function(topic_arn){

            message = {};

            message.wait_auth   = true;
            message.txid        = txid;
            message.transaction = transaction;

            message = JSON.stringify(message);

            var params = {
                "Message"  : JSON.stringify({ "default" : message }) ,
                "TopicArn" : topic_arn,
                "MessageStructure" : "json"
            };

            console.log(params);

            sns.publish(params, function(err, data) {

                if (!err)
                {
                    resolve(data);
                }
                else
                {
                    reject(err);
                }
            });
        }).catch(function(error){
            reject(error);
        });
    });
}

var api_request = function(method, path, data)
{

    return new Promise(function(resolve, reject){

        console.log('api request:', method, path);

        var rfc_date = moment().format("ddd, DD MMM YYYY HH:mm:ss ZZ");
        method = method.toUpperCase();

        var formated_data = [];

        for(var key in data)
        {
            formated_data.push(key + '=' + data[key]);
        }

        formated_data = formated_data.join("&");

        var auth_components = [
            rfc_date,
            method,
            api_hostname,
            path,
            formated_data
        ];

        auth_components = auth_components.join("\n");

        var password = crypto.createHmac('sha1', secret_key).update(auth_components).digest('hex');

        var authorization = 'Basic ' + new Buffer(integration_key + ':' + password).toString('base64');

        if (method == "GET")
        {
            path += '?' + formated_data;
        }

        var options = {
                    method   : method,
                    hostname : api_hostname,
                    port     : 443,
                    path     : path,
                    "Content-Type": "application/x-www-form-urlencoded",
                    headers  : {
                        Date          : rfc_date,
                        Authorization : authorization,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
        };

        var req = https.request(options, function(res) {

            res.on('data', function(data) {

                data = JSON.parse(data.toString());

                if (data.stat && data.stat == 'OK')
                {
                    resolve(data.response)
                }
                else
                {
                    reject(data);
                }
            });
        });

        if (method == "POST")
        {
            req.write(formated_data);
        }

        req.end();

        req.on('socket', function (socket) {
            socket.setTimeout(iteration_timeout * 1000);
            socket.on('timeout', function() {
                console.log('api socket timeout');
                req.abort();
            });
        });

        req.on('error', function(error) {
            console.log('api request error:');
            console.log(error);
            reject('timeout');
        });
    });
}
