var auth_config = require('../auth_config');
var config      = require('../config.js');
var AWS         = require('aws-sdk');

var sns         = new AWS.SNS(auth_config[config['username_prefix'] + "sns"]);
var sqs         = new AWS.SQS(auth_config[config['username_prefix'] + "sqs"]);

var EventEmitter  = require('events').EventEmitter;

var database = require('../database');
database     = new database();

module.exports = function() {

    var self = this;

    this.event_emitter = new EventEmitter();

    this.pending_transactions = [];

    this.pending_transactions_sqs_url = false;
    this.transactions_results_sqs_url = false;

    this.get_state = function()
    {
        if (self.pending_transactions.length > 0)
        {
            return 'busy';
        }
        else
        {
            return 'idle';
        }
    }

    /*
    * long polling connection
    */

    this.connect = function()
    {
        if (!self.pending_transactions_queue_url)
        {

            self
                .get_queue_url(config["sqs"]["pending_transactions"])
                .then(function(queue_url){

                    self.pending_transactions_queue_url = queue_url;
                    return database.get('transactions_results');
                })
                .then(function(sns_topic){

                    self.transactions_results_sqs_url = sns_topic.value.S;
                    return self.get();
                })
                .then(function(result){

                    if (!result)
                    {
                        self.connect();
                    }

                }).catch(function(error){
                    console.log(error);
                });
        }
        else
        {
            self.get()
                .then(function(result){

                    if (!result)
                    {
                        self.connect();
                    }

                })
                .catch(function(error){
                    console.log(error);
                });
        }
    }

    this.get = function()
    {
        return new Promise(function(resolve, reject){

            var sqs_params = {
                "QueueUrl"            : self.pending_transactions_queue_url,
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
                var data    = JSON.parse(message.Body);

                var message_id     = message['MessageId'];
                var receipt_handle = message['ReceiptHandle'];

                self.remove_from_queue(receipt_handle);

                self.event_emitter.emit('transaction', data);

                resolve(true);

            });
        });
    }

    this.remove_from_queue = function(receipt) {

        var sqs_params = {
            "QueueUrl"      : self.pending_transactions_queue_url,
            "ReceiptHandle" : receipt
        }

        sqs.deleteMessage(sqs_params, function(err, data) {
           // ------------
        });
    };

    this.result_report = function(transaction)
    {
        return new Promise(function(resolve, reject){

            delete transaction['transaction_key'];

            var message = JSON.stringify(transaction);

            var params = {
                "Message"  : message,
                "TopicArn" : self.transactions_results_sqs_url
            };

            sns.publish(params, function(err, data) {
                //-----------------
            });
        });
    }

    this.get_queue_url = function(queue_name)
    {

        return new Promise(function(resolve, reject){

            var params = {
                QueueName : queue_name,
            }

            sqs.getQueueUrl(params, function(err, data){

                if (!err)
                {
                    var queue_url = data['QueueUrl'];
                    resolve(queue_url);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.event_emitter.on('transaction_completed', function(transaction)
    {
        console.log("\ntransaction completed: \n");
        console.log(transaction);

        self.connect();

        transaction.status = 'completed';

        self.result_report(transaction);

    });

    this.event_emitter.on('transaction_fail', function(transaction)
    {
        console.log("\ntransaction fail: \n");
        console.log(transaction);

        transaction.status = 'fail';

        self.result_report(transaction);

        setTimeout(function(){

            self.connect();

        }, 30 * 1000);
    });
}