var auth_config = require('../auth_config');
var config      = require('../config');
var AWS         = require('aws-sdk');
var sqs         = new AWS.SQS(auth_config[config['username_prefix'] + "sqs"]);

//var bitcore = require('bitcore');

var EventEmitter  = require('events').EventEmitter;

module.exports = function() {
    
    var self = this;

    this.event_emitter = new EventEmitter();

    this.send = function(address, amount, __callback)
    {
        var message = {
            "address" : address,
            "amount"  : amount
        }

        message = JSON.stringify(message);

        self.get_queue_url(config["sqs"]["pending_transactions"], function(error, queue_url){

            if (error || !queue_url)
            {
                return __callback(error, false);
            }

            var sqsParams = {
                QueueUrl     : queue_url,
                DelaySeconds : 0,
                MessageBody  : message
            };

            sqs.sendMessage(sqsParams, function(err, data) {
                __callback(err, data);
            });
        });
    }
    
    /*
    todo: move to sqs module
    */

    this.get_queue_url = function(queue_name, __callback)
    {

        var params = {
            QueueName : queue_name,
        }

        sqs.getQueueUrl(params, function(err, data) {

            if (!err)
            {
                var queue_url = data['QueueUrl'];
                __callback(false, queue_url);
            }
            else
            {
                __callback(err, false);
            }
        });
    }     
}