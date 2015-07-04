var auth_config = require('../auth_config');
var config      = require('../config');
var AWS         = require('aws-sdk');

var dynamodb = new AWS.DynamoDB(auth_config[config['username_prefix'] + "dynamodb"]);

module.exports = function() {

    var self = this;

    this.table_name = config["dynamodb"]["data_table_name"];

    this.set = function(key, value, __callback)
    {

        dynamodb.putItem(
        {
            "TableName" : self.table_name,
                "Item" : {
                    "key"   : { "S"  : record },
                    'value' : { "S"  : record },
                }

        }, function(err, result) {

            if (err) {
                __callback(err, false);

            } else {
                __callback(false, result);
            }
        });
    }

    this.get = function(key, __callback)
    {

        var params = {
            "TableName" : self.table_name,
            "Key"       : {
                "key" : {
                    "S" : key
                },
            }
        }

        dynamodb.getItem(params, function(err, data) {

            if (!err && data) {

                if (data['Item'])
                {
                    __callback(false, data['Item']);
                }
                else
                {
                    __callback(false, false);
                }

            } else {
                __callback(err, false);
            }
        });
    }
};