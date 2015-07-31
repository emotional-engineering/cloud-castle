var auth_config = require('../auth_config');
var config      = require('../config');
var AWS         = require('aws-sdk');
var database    = require('./database');
var Promise     = require("bluebird");

var sns  = new AWS.SNS(auth_config[config['username_prefix']  + "sns"]);
database = new database();

var EventEmitter  = require('events').EventEmitter;

module.exports = function() {

    var self = this;

    this.event_emitter = new EventEmitter();

    this.spot_wait = function(request_id, __callback)
    {
        database.get('spot_wait_sns_topic', function(error, result){

            if(error)
            {
                return __callback(error, false);
            }

            var topic_arn = result['value']['S'];

            var message = {
                "request_id" : request_id
            }

            message = JSON.stringify(message);

            var params = {
                "Message"  : message,
                "TopicArn" : topic_arn
            };

            sns.publish(params, function(err, data) {
                __callback(err, data);
            });
        });
    }

    this.wait_instance = function(instance_id, __callback)
    {

        database.get('instance_wait_sns_topic', function(error, result){

            if(error)
            {
                return __callback(error, false);
            }

            var topic_arn = result['value']['S'];

            var message = {
                "instance_id" : instance_id
            }

            message = JSON.stringify(message);

            var params = {
                "Message"   : message,
                "TopicArn"  : topic_arn
            };

            sns.publish(params, function(err, data){
                __callback(err, data);
            });
        });
    }
}