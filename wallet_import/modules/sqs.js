var config      = require('../config');
var auth_config = require('../auth_config');
var AWS         = require('aws-sdk');
var sqs         = new AWS.SQS(auth_config[config['username_prefix'] + "sqs"]);

module.exports = function() {

    this.create_queue = function(name, __callback)
    {
        return new Promise(function(resolve, reject){

            var params = {
                "QueueName" : name,
            };

            sqs.createQueue(params, function(err, data) {

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
}