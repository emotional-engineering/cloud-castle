var Promise     = require("bluebird");
var auth_config = require('../auth_config');
var config      = require('../config');
var AWS         = require('aws-sdk');
var bitcore     = require('bitcore');

var dynamodb = new AWS.DynamoDB(auth_config[config['username_prefix'] + "dynamodb"]);

module.exports = function() {

    var self = this;

    this.set = function(key, value, __callback)
    {

        dynamodb.putItem(
        {
            "TableName" : config["dynamodb"]["data_table_name"],
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
            "TableName" : config["dynamodb"]["data_table_name"],
            "Key"       : {
                "key" : {
                    "S" : key
                },
            }
        }

        dynamodb.getItem(params, function(err, data) {

            if (!err && data)
            {
                if (data['Item'])
                {
                    __callback(false, data['Item']);
                }
                else
                {
                    __callback(false, false);
                }
            }
            else
            {
                __callback(err, false);
            }
        });
    }

    this.generate_address = function()
    {
        return new Promise(function(resolve, reject){

            var private_key = new bitcore.PrivateKey();
            var address     = private_key.toAddress().toString();

            private_key = private_key.toWIF();

            var item = {
                "TableName" : "generated_addresses",
                    "Item" : {
                        "address"     : { "S" : address },
                        "private_key" : { "S" : private_key },
                    }
            }

            dynamodb.putItem(item, function(err, result) {

                if (!err)
                {
                    resolve(address);
                }
                else
                {
                    reject(err);
                }
            });
        });
    };
};
