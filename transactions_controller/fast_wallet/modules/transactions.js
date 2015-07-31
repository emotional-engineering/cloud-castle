var Promise = require("bluebird");

var auth_config = require('../auth_config');
var config      = require('../config');

var AWS         = require('aws-sdk');

var sns  = new AWS.SNS(auth_config[config['username_prefix']  + "sns"]);

var settings = require('./settings');
settings = new settings();

module.exports = function(bitcore_module) {

    var bitcore = bitcore_module;

    this.create_raw = function(wif, txid, tx_index, script, source_amount, destination_address, send_amount, commission, change_address)
    {

        var privateKey     = new bitcore.PrivateKey(wif);
        var source_address = privateKey.toAddress().toString();

        var utxo = {
            "txId"        : txid,
            "outputIndex" : tx_index,
            "address"     : source_address,
            "script"      : script,
            "satoshis"    : source_amount
        };

        var transaction = new bitcore.Transaction()
            .from(utxo)
            .to(destination_address, send_amount)
            .change(change_address)
            .fee(commission)
            .sign(privateKey)

        return transaction;
    }

    this.send = function(transaction, peer)
    {
        return new Promise(function(resolve, reject){

            settings.get("peers_topic_arn").then(function(topic_arn){

                var message = {
                    "transaction" : transaction,
                    "peer"        : peer
                }

                message = JSON.stringify(message);

                var params = {
                    "Message"   : message,
                    "TopicArn"  : topic_arn
                };

                sns.publish(params, function(err, data){

                    if (!err)
                    {
                        return resolve(data);
                    }
                    else
                    {
                        return reject(err);
                    }
                });
            });
        });
    }
}
