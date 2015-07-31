var Promise     = require("bluebird");
var AWS         = require("aws-sdk");
var auth_config = require("../auth_config");
var config      = require("../config");
var wallet      = require("./wallet");
var database    = require('./fast_wallet_db');

var dynamodb = new AWS.DynamoDB(auth_config[config['username_prefix'] + "dynamodb"]);
wallet       = new wallet();
database     = new database();

module.exports = function() {

    /*
      generate empty addresses and put money for first
    */

    this.create = function(amount)
    {
        return new Promise(function(resolve, reject){

            var addresses_count = 100;

            var promises = [];

            for (var i = 0; i < addresses_count; i++)
            {
                promises.push(wallet.create_address(""));
            }

            var addresses     = false;
            var first_address = false;

            Promise.all(promises).then(function(_addresses){

                addresses = _addresses;

                var private_keys = addresses.map(function(address){
                    return wallet.dumpprivkey(address);
                });

                return Promise.all(private_keys);

            }).then(function(private_keys){

                var address_pairs = private_keys.map(function(private_key, i){
                    return database.add_fast_address(addresses[i], private_key);
                });

                return Promise.all(address_pairs);

            }).then(function(result){

                first_address = addresses[0];

                return wallet.send(first_address, amount);

            }).then(function(transaction_id){

                return wallet.listunspent(first_address, 0);

            }).then(function(out){

                var txid      = out.txid;
                var script    = out.scriptPubKey;
                var tx_amount = parseInt(parseFloat(out.amount) * 100000000);
                var tx_out    = parseInt(out.vout);

                console.log('txid:', txid);
                console.log('script:', script);
                console.log('tx_amount:', tx_amount);

                return database.update_fast_address(first_address, txid, script, tx_amount, tx_out, 1);

            }).then(function(result){
                console.log('done');
                resolve(true);
            }).catch(function(error){
                console.log(error);
                reject(error);
            });
        });
    }

    /*
      import addresses which generated in "fast wallet"
      todo: generate addresses using bitcoind, then save in database
    */

    this.save_addresses = function()
    {
        return new Promise(function(resolve, reject){

            var params = {
                TableName : 'generated_addresses',
            };

            dynamodb.scan(params, function(err, data) {

                if (err){
                    return reject(err);
                }


                var addresses = data.Items;

                console.log('new addresses count', addresses.length);

                var import_keys = [];

                for (var i = 0; i < addresses.length; i++)
                {

                    var private_key = addresses[i].private_key.S;

                    var rescan = false;

                    if (i == addresses.length - 1)
                    {
                        rescan = true;
                    }

                    import_keys.push([private_key, rescan]);
                }

                var import_each = Promise.resolve(import_keys).each(wallet.import_private_key);

                import_each.then(function(result){
                    console.log('fast wallet keys saved');
                    resolve(true);
                }).catch(function(error){

                    /*
                    reject(error);
                    todo: change exec function, this not return control to caller with long operation.
                    Unhandled rejection Error: ETIMEDOUT
                    */
                    console.log(error);
                    resolve(true);
                });
            });
        });
    }
}
