var Promise = require("bluebird");
var http    = require('http');
var fs      = require('fs');
var url     = require('url');
var FB      = require('fb');
var AWS     = require('aws-sdk');

var integration_config = require('./integration_config');
var config             = require('./config');
var auth_config        = require('./auth_config');

var database = require('./modules/database'),
          s3 = require('./modules/s3');

database  = new database(),
      s3  = new s3(),
      sns = new AWS.SNS(auth_config[config['username_prefix']  + "sns"]);

exports.handler = function(event, context) {

    /*
        confirm subscription GET call
    */
    if (event.data && event.data[0] && event.data[0].challenge)
    {
        return context.succeed(parseInt(event.data[0].challenge));
    }

    /*
        POST realtime data
    */

    var values = event.entry[0].changes[0].value;

    if (!values.sender_id || !values.message)
    {
        console.log('empty data:');
        console.log(event);
        return context.fail('empty data');
    }

    var sender_id       = values.sender_id;
    var request_message = values.message;

    console.log('sender:', sender_id);
    console.log('message:', request_message);

    if (request_message.indexOf('bitcoin:') > -1)
    {
        send_transaction(request_message).then(function(result){
            console.log('sended');
            context.succeed('ok');
        }).catch(function(error){
            console.log(error);
            context.fail(error);
        });
    }
    else
    {
        send_bitcoin_url(sender_id, request_message).then(function(result){
            console.log('sended');
            context.succeed('ok');
        }).catch(function(error){
            console.log(error);
            context.fail(error);
        });
    }
};

var send_bitcoin_url = function(sender_id, request_message)
{
    return new Promise(function(resolve, reject){

        var endpoint = "/" + sender_id + "/feed";

        console.log('send url to the feed:', endpoint);

        var address = false;

        database.generate_address().then(function(_address){

            address = _address;

            /*
              todo: s3 endpoint available after 30 minutes from integration. Possible to use temporarily endpoint, which return from s3 error.
            */

            return s3.get_file_content(integration_config.s3_bucket, 'facebook_access_token');

        }).then(function(access_token){

            console.log('access_token_from_s3:', access_token);

            FB.setAccessToken(access_token);

            var transaction_url = "bitcoin:" + address + "?amount=" + request_message;

            FB.api(endpoint, 'post', { "message" : transaction_url }, function (res) {

                if(res.error)
                {
                    return reject(res.error);
                }
                else
                {
                    return resolve(res);
                }
            });

        }).catch(function(error){
            reject(error);
        });
    });
}

var send_transaction = function(request_message)
{

    return new Promise(function(resolve, reject){

        console.log('send transaction:');
        console.log(request_message);

        var url_parts = url.parse(request_message);

        var address = request_message.split('?')[0].replace('bitcoin:', '');
        var data    = url_parts.query;
        var amount  = data.replace('amount=', '');

        var message = {
            "address" : address,
            "amount"  : amount,
            "comment" : "from facebook"
        }

        message = JSON.stringify(message);

        console.log(message);

        var params = {
            "Message"  : message,
            "TopicArn" : integration_config['transaction_topic']
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
    });
}
