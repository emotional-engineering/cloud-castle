var bitcoind     = require('./modules/bitcoind');
var wallet       = require('./modules/wallet');
var transactions = require('./modules/transactions');
var instance     = require('./modules/instance');
var auth         = require('./modules/auth');
var config       = require('./config');

bitcoind     = new bitcoind();
wallet       = new wallet();
transactions = new transactions();
auth         = new auth();

instance     = new instance(bitcoind, transactions, auth);

console.log('starting...');

wallet
    .load(config['bitcoind']['data_folder'] + 'wallet.dat')
    .then(instance.clean_init_script)
    .then(bitcoind.start)
    .then(bitcoind.wait_ready)
    .then(auth.connect)
    .then(transactions.connect)
    .catch(function(error){
        console.log('error:');
        console.log(error);
    });

transactions.event_emitter.on('transaction', function(transaction)
{

    console.log("\n\n  === inbound transaction ===\n");
    console.log(transaction);
    console.log("\n");

    transaction.transaction_key = auth.make_key(40);

    auth.request(transaction);

});

auth.event_emitter.on('accepted_transaction', function(transaction)
{
    console.log("\n  === accepted transaction ===\n");
    console.log(transaction);
    console.log("\n");

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
});