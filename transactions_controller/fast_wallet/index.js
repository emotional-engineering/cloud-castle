var Promise = require("bluebird");
var bitcore = require('bitcore');

var transactions_module = require('./modules/transactions');
var database = require('./modules/database');

database = new database();

transactions_module = new transactions_module(bitcore);

const commission  = 0.0001;

exports.handler = function(event, context) {

    var message = JSON.parse(event.Records[0].Sns.Message);

    console.log('incoming message:');
    console.log(message);

    var destination_address = message["address"];
    var send_amount  = parseFloat(message["amount"]);

    var transaction = {};

    database.get_current_address().then(function(current_address){

        console.log('send from:', current_address['address']['S']);

        /* variables names hell */
        transaction.source_address = current_address['address']['S'];
        transaction.private_key    = current_address['private_key']['S'];
        transaction.tx_amount      = parseFloat(current_address['tx_amount']['N']);
        transaction.txid           = current_address['txid']['S'];
        transaction.source_script  = current_address['script']['S'];
        transaction.tx_index       = parseInt(current_address['tx_index']['N']);

        return database.get_next_address();

    }).then(function(next_address){

        if (!next_address)
        {
            console.log('next addreess not exist');
            process.exit(1);
            return false;
        }

        transaction.change_address = next_address['address']['S'];

        send_amount  = parseInt(send_amount * 100000000);
        commission_s = parseInt(commission  * 100000000);

        transaction.change_value = transaction.tx_amount - send_amount - commission_s;

        console.log('send to:', destination_address);
        console.log('change:', transaction.change_address, ' - > ', transaction.change_value);

        var raw_transaction = transactions_module.create_raw(transaction.private_key, transaction.txid, transaction.tx_index, transaction.source_script, transaction.tx_amount, destination_address, send_amount, commission_s, transaction.change_address);

        transaction.raw = raw_transaction;

        var transaction_object = raw_transaction.toObject();

        var change_output           = transaction_object.outputs[transaction_object.changeIndex];
        transaction.change_script   = change_output.script;
        transaction.new_txid        = raw_transaction.hash;
        transaction.tx_change_index = transaction_object.changeIndex

        if (transaction.change_value != transaction_object.outputs[transaction_object.changeIndex].satoshis)
        {
            console.log('error');
            process.exit(1);
            return false;
        }

        console.log('new_txid:', transaction.new_txid);

        return database.get_nodes();

    }).then(function(nodes){

        console.log('nodes:');
        console.log(nodes);

        var raw_string = transaction.raw.toString();
        console.log('raw:');
        console.log(raw_string);

        var transactions = [];

        for (var i = 0; i < nodes.length; i++)
        {
            transactions.push(transactions_module.send(raw_string, nodes[i]));
        }

        return Promise.all(transactions);

    }).then(function(results){

        return database.update_fast_address(transaction.source_address, false, false, 0, 0, 0);

    }).then(function(result){

        return database.update_fast_address(transaction.change_address, transaction.new_txid, transaction.change_script, transaction.change_value, transaction.tx_change_index, 1);

    }).then(function(result){
        console.log('all done');
        context.succeed('done');
    }).catch(function(error) {
        console.log('error');
        console.log(error);
        context.fail();
    });
}
