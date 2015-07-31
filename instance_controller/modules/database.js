var auth_config = require('../auth_config');
var config      = require('../config');
var AWS         = require('aws-sdk');

var dynamodb = new AWS.DynamoDB(auth_config[config['username_prefix'] + "dynamodb"]);

module.exports = function(table_name) {

    var self = this;

    if (table_name)
    {
        this.table_name = table_name;
    }
    else
    {
        this.table_name = config["dynamodb"]["data_table_name"];
    }

    this.set = function(new_item)
    {
        return new Promise(function(resolve, reject){

            for (var key in new_item)
            {
                var data = new_item[key];
                new_item[key] = {}
                new_item[key]["S"] = data;
            }

            var item = {
                "TableName" : self.table_name,
                    "Item"  : new_item
            }

            dynamodb.putItem(item, function(err, result) {

                if (!err)
                {
                    resolve(true);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.get = function(select)
    {

        return new Promise(function(resolve, reject){

            for (var key in select)
            {
                var data = select[key];
                select[key] = {}
                select[key]["S"] = data;
            }

            var params = {
                "TableName" : self.table_name,
                "Key"       : select
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
