var auth_config = require('../auth_config');
var config      = require('../config.js');
var AWS         = require('aws-sdk');

var sns         = new AWS.SNS(auth_config[config['username_prefix'] + "sns"]);
var sqs         = new AWS.SQS(auth_config[config['username_prefix'] + "sqs"]);

var database     = require('../database');
var transactions = require('./transactions');

database = new database();
transactions = new transactions();

var EventEmitter  = require('events').EventEmitter;

module.exports = function() {

    var self = this;

    this.event_emitter = new EventEmitter();

    this.active_transactions = [];

    this.transactions_auth_sns_request = false;
    this.transactions_auth_sqs_answer  = false;

    this.get_state = function()
    {
        if (self.active_transactions.length > 0)
        {
            return 'busy';
        }
        else
        {
            return 'idle';
        }
    }

    this.connect = function()
    {

        if (!self.transactions_auth_sns_request)
        {
            database
                .get('transactions_auth_requests')
                .then(function(sns_arn){

                    self.transactions_auth_sns_request = sns_arn['value']['S'];

                    return transactions.get_queue_url(config['sqs']['transactions_auth_answers']);

                }).then(function(sqs_arn){

                    self.transactions_auth_sqs_answer = sqs_arn;

                    return self.get();
                })
                .then(self.connect)
                .catch(function(error){
                    console.log(error);
                });
        }
        else
        {
            self.get()
                .then(self.connect)
                .catch(function(error){
                    console.log(error);
                });
        }
    }

    this.request = function(transaction)
    {

        return new Promise(function(resolve, reject){

            self.active_transactions[transaction.transaction_key] = transaction;

            var message = transaction.address + ' ' + transaction.amount + ' ' + transaction.transaction_key;

            var params = {
                "Message"  : message,
                "TopicArn" : self.transactions_auth_sns_request
            };

            sns.publish(params, function(err, data) {

                if (!err){
                    resolve(data);
                } else {
                    reject(err);
                }
            });
        });
    }

    /*
        Obtaining authorization messages.
    */

    this.get = function()
    {
        return new Promise(function(resolve, reject){

            var sqs_params = {
                "QueueUrl"            : self.transactions_auth_sqs_answer,
                "MaxNumberOfMessages" : 1,
                "VisibilityTimeout"   : 60,
                "WaitTimeSeconds"     : 20
            }

            sqs.receiveMessage(sqs_params, function(err, data){

                if(err){
                    return reject(err);
                }
                else if (!data.Messages)
                {
                    return resolve(false);
                }

                var message = data.Messages[0];

                var decoded_message = new Buffer(message['Body'], 'base64').toString('utf8');
                var receipt         = message['ReceiptHandle'];

                var message_data = decoded_message.split("\r\n");

                /*
                    The password is not used now.
                */

                var password_string = message_data[0];
                password_string     = password_string.split(" ");
                var password        = password_string[0];

                console.log('password:', password);

                var transaction_key = false;

                /*
                    Search transaction key in inbound message.
                */

                for (var i = 1; i < message_data.length; i++)
                {

                    var string_data = message_data[i].split(' ');

                    for (var j = 0; j < string_data.length; j++)
                    {
                        var test_key = string_data[j];

                        if (self.active_transactions[test_key])
                        {
                            transaction_key = test_key;
                            break;
                        }
                    }
                };

                if (!transaction_key)
                {
                    self.remove_from_queue(receipt);
                    return resolve(false);
                }

                console.log('transaction_key:', transaction_key);

                var transaction = self.active_transactions[transaction_key];

                delete self.active_transactions[transaction_key];

                self.event_emitter.emit('accepted_transaction', transaction);

                self.remove_from_queue(receipt);

                return resolve(true);

            });
        });
    }

    this.remove_from_queue = function(receipt) {

        var sqs_params = {
            "QueueUrl"      : self.transactions_auth_sqs_answer,
            "ReceiptHandle" : receipt
        }

        sqs.deleteMessage(sqs_params, function(err, data) {
            // ------
        });
    };

    this.make_key = function(length)
    {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < length; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }
}