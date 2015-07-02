var auth_config = require('./auth_config');
var config      = require('./config');
var AWS         = require('aws-sdk');

var dynamodb = new AWS.DynamoDB(auth_config[config['username_prefix'] + "dynamodb"]);

module.exports = function() {

    var self = this;

    this.table_name = config["dynamodb"]["data_table_name"];

    this.create_table = function()
    {

        return new Promise(function(resolve, reject){

            var params = {
                AttributeDefinitions: [
                {
                    AttributeName : 'key',
                    AttributeType : 'S'
                }],
                KeySchema: [
                    {
                        AttributeName : 'key',
                        KeyType       : 'HASH'
                    },
                ],
                ProvisionedThroughput: {
                    ReadCapacityUnits  : 1,
                    WriteCapacityUnits : 1
                },
                TableName : self.table_name,

            }

            dynamodb.createTable(params, function(err, data) {

                if (!err)
                {
                    resolve(data['TableDescription']);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.wait_table_ready = function()
    {

        return new Promise(function(resolve, reject){

            var params = {
                "TableName" : self.table_name
            };

            dynamodb.waitFor('tableExists', params, function(err, data) {

                if (!err)
                {
                    resolve(data['Table']);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.set = function(key, value)
    {
        return new Promise(function(resolve, reject){

            var item = {
                "TableName" : self.table_name,
                    "Item" : {
                        "key"   : { "S"  : key },
                        'value' : { "S"  : value },
                    }
            }

            dynamodb.putItem(item, function(err, result) {

                if (!err)
                {
                    resolve(result['Item']);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.get = function(key)
    {

        return new Promise(function(resolve, reject){

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
                        resolve(data['Item']);
                    }
                    else
                    {
                        resolve(false);
                    }
                }
                else
                {
                    reject(err);
                }
            });
        });
    }
}