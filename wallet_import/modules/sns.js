var auth_config = require('../auth_config');
var config      = require('../config');
var AWS         = require('aws-sdk');
var sns         = new AWS.SNS(auth_config[config['username_prefix'] + "sns"]);

module.exports = function() {

    this.create_topic = function(name)
    {
        return new Promise(function(resolve, reject){

            var params = {
                "Name" : name
            }

            sns.createTopic(params, function(err, data) {

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

    this.subscribe = function(topic, endpoint, protocol)
    {

        return new Promise(function(resolve, reject){

            var params = {
                "Protocol" : protocol,
                "TopicArn" : topic,
                "Endpoint" : endpoint
            };

            sns.subscribe(params, function(err, data) {

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