var bitcoin = require('bitcoin');
var fs      = require('fs');
var config  = require('../config.js');
var s3      = require('./s3');

s3 = new s3();

var bitcoin_client = new bitcoin.Client({
    host    : 'localhost',
    port    : 8332,
    user    : config["bitcoind"]["user"],
    pass    : config["bitcoind"]["pass"],
    timeout : 30000
});

module.exports = function() {

    this.load = function(file_path)
    {
        return new Promise(function(resolve, reject){

            fs.stat(file_path, function(error, file_stat){

                if (error && error.toString().indexOf('no such file') == -1)
                {
                    return reject(error);
                }

                if (file_stat)
                {
                    return resolve(true);
                }

                console.log('downloading wallet.dat');

                var bucket = config["s3"]["system_bucket"];
                var key    = 'wallet.dat';

                /*
                    todo: add s3 check_file_exist function. otherwise writes an empty wallet file.
                    Also, this function needs an attentive tests.
                */

                s3
                .download_file(bucket, key, file_path)
                .then(function(result){
                    return s3.delete_file(bucket, key);
                })
                .then(function(result){
                    resolve(true);
                }).catch(function(error){
                    console.log('error loading wallet');
                    reject(error);
                });
            });
        });
    }

    this.send = function(address, amount)
    {
        return new Promise(function(resolve, reject){

            amount = parseFloat(amount);

            bitcoin_client.sendToAddress(address, amount, function(err, info, resHeaders) {

                if (err) {
                    return reject(err);
                }

                resolve(info);

            });
        });
    }

    this.listunspent = function(address, confirmations)
    {

        return new Promise(function(resolve, reject){

            bitcoin_client.listUnspent(confirmations, function(err, info, resHeaders) {

                if (err) {
                    return reject(err);
                }

                var txout = false;

                for (var i = 0; i < info.length; i++)
                {
                    if (info[i].address == address)
                    {
                        txout = info[i];
                        break
                    }
                }

                resolve(txout);
            });
        });
    }

    this.create_address = function(account)
    {
        return new Promise(function(resolve, reject){

            bitcoin_client.getNewAddress(account, function(err, address, resHeaders) {

                if (err) {
                    return reject(err);
                }

                resolve(address);
            });
        });
    }

    this.dumpprivkey = function(address)
    {
        return new Promise(function(resolve, reject){

            bitcoin_client.dumpPrivKey(address, function(err, key, resHeaders) {

                if (err) {
                    return reject(err);
                }

                resolve(key);
            });
        });
    }

    this.import_private_key = function(args)
    {
        return new Promise(function(resolve, reject){

            wif_key = args[0];
            rescan  = args[1];

            bitcoin_client.importPrivKey(wif_key, "", rescan, function(err, result, resHeaders) {

                if (err) {
                    return reject(err);
                }

                resolve(true);
            });
        });
    }

    this.get_peers = function()
    {
        return new Promise(function(resolve, reject){

            bitcoin_client.getPeerInfo(function(err, result, resHeaders) {

                if (err) {
                    return reject(err);
                }

                resolve(result);
            });
        });
    }

    this.send_raw_transaction = function(raw)
    {
        return new Promise(function(resolve, reject){

            bitcoin_client.sendRawTransaction(raw, function(err, result, resHeaders) {

                if (err) {
                    return reject(err);
                }

                resolve(result);
            });
        });
    }

    this.send_many = function(addresses_data)
    {
        return new Promise(function(resolve, reject){

            bitcoin_client.sendMany("", addresses_data, function(err, info, resHeaders) {

                if (err) {
                    return reject(err);
                }

                resolve(info);
            });
        });
    }
}
