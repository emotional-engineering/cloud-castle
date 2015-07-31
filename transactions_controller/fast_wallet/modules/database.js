var auth_config = require("../auth_config");
var config      = require("../config");
var AWS         = require("aws-sdk");
var Promise     = require("bluebird");

var dynamodb = new AWS.DynamoDB(auth_config[config['username_prefix'] + "dynamodb"]);

module.exports = function(table_name) {

    var self = this;

    this.get_nodes = function()
    {

        return new Promise(function(resolve, reject){

            var params = {
                TableName : "nodes"
            };

            dynamodb.scan(params, function(err, data) {

                if (err) {
                    return reject(err);
                }

                if (data['Items'])
                {

                    var items = data['Items'];
                    var ips   = [];

                    for (var i = 0; i < items.length; i++)
                    {
                        ips.push(items[i]['peer']['S'])
                    }

                    return resolve(ips);
                }
                else
                {
                    return resolve(false);
                }

            });
        });
    }

    this.get_current_address = function()
    {
        return new Promise(function(resolve, reject){

            var params = {
                "TableName"     : "fast_wallet",
                "IndexName"     : "active-index",
                "KeyConditions" : {
                    'active': {
                        "ComparisonOperator" : 'EQ',
                        "AttributeValueList" : [ { N : '1' }]
                        }
                    }
                }

            dynamodb.query(params, function(err, data) {

                if (err) {
                    return reject(err);
                }

                if (data['Items'] && data['Items'][0])
                {
                    resolve(data['Items'][0]);
                }
                else
                {
                    resolve(false);
                }
            });

        });
    }

    this.get_next_address = function()
    {
        return new Promise(function(resolve, reject){

            var params = {
                "TableName"     : "fast_wallet",
                "IndexName"     : "used-index",
                "KeyConditions" : {
                    "used": {
                        "ComparisonOperator" : 'EQ',
                        "AttributeValueList" : [ { N : '0' } ]
                        }
                    }
                }

            dynamodb.query(params, function(err, data) {

                if (err) {
                    return reject(err);
                }

                if (data['Items'][0])
                {
                    resolve(data['Items'][0]);
                }
                else
                {
                    resolve(false);
                }
            });
        });
    }


    this.add_fast_address = function(address, private_key)
    {
        return new Promise(function(resolve, reject){

            var item = {
                "TableName" : "fast_wallet",
                    "Item" : {
                        "address"     : { "S" : address },
                        "private_key" : { "S" : private_key },
                        "used"        : { "N" : "0" },
                        "active"      : { "N" : "0" },
                    }
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

    this.update_fast_address = function(address, txid, script, tx_amount, tx_index, active)
    {

        return new Promise(function(resolve, reject){

            var key = { 'address' : { "S" : address } };

            var params = {
                        "TableName" : "fast_wallet",
                        "Key" : key,
                        "AttributeUpdates" : {
                            "used" : {
                                "Action" : "PUT",
                                    "Value" : {
                                        "N" : "1"
                                    }
                                }
                            }
                        }

            if (txid)
            {
                params.AttributeUpdates.txid = {
                    'Action' : 'PUT',
                    'Value'  : { 'S' : txid }
                }
            }

            if (script)
            {
                params.AttributeUpdates.script = {
                    'Action' : 'PUT',
                    'Value' : { 'S' : script }
                }
            }

            if (tx_amount)
            {
                tx_amount = tx_amount.toString();
                params.AttributeUpdates.tx_amount = {
                    'Action' : 'PUT',
                    'Value' : { 'N' : tx_amount }
                }
            }

            if (tx_index !== false)
            {
                tx_index = tx_index.toString();
                params.AttributeUpdates.tx_index = {
                    'Action' : 'PUT',
                    'Value' : { 'N' : tx_index }
                }
            }

            if (active !== false)
            {
                active = active.toString();
                params.AttributeUpdates.active = {
                    'Action' : 'PUT',
                    'Value' : { 'N' : active }
                }
            }

            dynamodb.updateItem(params, function (err, data){

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
    };
};
