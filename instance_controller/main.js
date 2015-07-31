var bitcoind     = require('./modules/bitcoind');
var wallet       = require('./modules/wallet');
var transactions = require('./modules/transactions');
var instance     = require('./modules/instance');
var auth         = require('./modules/auth');
var bitnodes     = require('./modules/bitnodes');
var database     = require('./modules/database');
var fast_wallet  = require('./modules/fast_wallet');
var config       = require('./config');

bitcoind     = new bitcoind();
wallet       = new wallet();
transactions = new transactions();
auth         = new auth();
bitnodes     = new bitnodes();
instance     = new instance(bitcoind, transactions, auth);
fast_wallet  = new fast_wallet();

database = new database("nodes");

console.log('starting...');

wallet
    .load(config['bitcoind']['data_folder'] + 'wallet.dat')
    .then(bitcoind.start)
    .then(bitcoind.wait_ready)
    .then(transactions.connect)
    .then(instance.check_traffic_bill)
    .then(function(traffic_bill){

        if (!traffic_bill)
        {
            return false;
        }

        console.log('traffic cost/month:', traffic_bill, ', max traffic cost/month:', config['data_transfer_max_cost']);

        if (traffic_bill > config['data_transfer_max_cost'] || config['data_transfer_max_cost'] <= 0)
        {
            console.log('close port');
            return instance.close_port();
        }
        else
        {
            return bitnodes.get_statistics().then(function(statistics){

                console.log('bitnodes statistics:', statistics);

                if (statistics && statistics == "reduction")
                {
                    console.log('open port');
                    return instance.open_port();
                }
                else
                {
                    return true;
                }
            });
        }

    }).then(function(){

        console.log('started');

        return setTimeout(save_peers, 5 * 60 * 1000); // save peers data for "fast Lambda wallet"

    }).then(function(){

        return fast_wallet.save_addresses();

    }).catch(function(error){
        console.log('error:');
        console.log(error);
    });


transactions.event_emitter.on('transaction', function(transaction)
{

    console.log("\n\n  === inbound transaction ===\n");
    console.log(transaction);
    console.log("\n");

    auth
        .request(transaction)
        .then(function(auth_result){

            if (!auth_result)
            {
                transactions.event_emitter.emit('transaction_fail', transaction);
                return false;
            }

            /*
              put to fast wallet
            */

            if (transaction.address.indexOf('lambda1') > -1)
            {

                fast_wallet.create(transaction.amount).then(function(result){
                    transactions.event_emitter.emit('transaction_completed', transaction);
                }).catch(function(error){
                    console.log(error);
                    transaction.error = error;
                    transactions.event_emitter.emit('transaction_fail', transaction);
                });

                return true;
            }

            /*
              common transaction
            */

            wallet
                .send(transaction.address, transaction.amount)
                .then(function(transaction_id){

                    console.log('blockchain transaction id:', transaction_id);

                    transaction.id = transaction_id;

                    transactions.event_emitter.emit('transaction_completed', transaction);

                }).catch(function(error){

                    error = error.toString();

                    if (error.toString().indexOf('Insufficient funds') > -1)
                    {
                        transaction.error = 'Insufficient funds';
                        transactions.event_emitter.emit('transaction_fail', transaction);
                    }
                    else
                    {
                        transaction.error = error;
                        transactions.event_emitter.emit('transaction_fail', transaction);
                    }
                });

        }).catch(function(error){

            transactions.event_emitter.emit('transaction_fail', transaction);
            console.log(error);
        });
});

/*
    save peers data ip:port for using in "fast Lambda wallet"
*/

var save_peers = function()
{
    var check_nodes = [];

    wallet.get_peers().then(function(peers){

        var outbound = [];

        for (var i = 0; i < peers.length; i++)
        {
            if(peers[i]['inbound'] == false)
            {
                console.log(peers[i]['addr']);
                var peer = peers[i]['addr'];
                outbound.push(database.get({ 'peer' : peer }));
                check_nodes.push({ 'peer' : peer });
            }
        }

        return Promise.all(outbound);

    }).then(function(result){

        var new_nodes = [];

        for (var i = 0; i < result.length; i++)
        {
            if (!result[i])
            {
                new_nodes.push(database.set(check_nodes[i]));
            }
        }

        return Promise.all(new_nodes);

    }).then(function(result){

    }).catch(function(error){
        console.log(error);
    });
}
