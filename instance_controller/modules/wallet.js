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

                if (!error && file_stat)
                {
                    resolve(true);
                }
                var bucket = config["s3"]["system_bucket"];
                var key    = 'wallet.dat';

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
}