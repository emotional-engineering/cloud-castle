var config       = require('../config.js');
var https        = require('https');
var childProcess = require('child_process');

const status_retry_timeout = 10 * 1000;

module.exports = function() {

    var self = this;

    this.status = 'init';

    this.get_status = function()
    {
        return this.status;
    }

    this.start = function()
    {
        return new Promise(function(resolve, reject){

            var data_dir = config['bitcoind']['data_folder'];

            var cmd = 'bitcoind -daemon -datadir="' + data_dir + '"';

            var error = false;

            daemon = childProcess.exec(cmd, function (exec_error, stdout, stderr){

                /*
                todo: error interception does not work
                */

                if (exec_error)
                {
                    console.log('daemon start error:');
                    console.log(exec_error);
                    error = exec_error;
                }

            });

            daemon.on('exit', function (code) {

                if (code === 0 && !error)
                {
                    resolve(true);
                }
                else
                {
                    reject(error);
                }
            });
        });
    }

    this.stop = function()
    {
        return new Promise(function(resolve, reject){

            var data_dir = config['bitcoind']['data_folder'];

            var cmd = 'bitcoin-cli -datadir="' + data_dir + '" stop';

            daemon = childProcess.exec(cmd, function (error, stdout, stderr){ });

            daemon.on('exit', function (code) {

                if (code == 0){
                    resolve(true);
                }
                else
                {
                    reject(false);
                }
            });
        });
    }
    
    this.wait_ready = function()
    {
        return new Promise(function(resolve, reject){

            self.__wait_ready(function(error, blockchain_blockcount){

                if (!error)
                {
                    self.status = 'ready';
                    resolve(blockchain_blockcount);
                }
                else
                {
                    reject(error);
                }
            });
        });
    }

    this.__wait_ready = function(__callback)
    {

        var daemon_blockcount = false;

        self
            .get_daemon_blockcount()
            .then(function(blockcount){

                daemon_blockcount = blockcount;
                return self.get_blockchain_blockcount();

            }).then(function(blockchain_blockcount){

                if (blockchain_blockcount > daemon_blockcount)
                {
                    setTimeout(function(){

                        self.__wait_ready(__callback);

                    }, status_retry_timeout);
                }
                else
                {
                    console.log("\nbitcoind ready... \n");
                    __callback(false, blockchain_blockcount);
                }

            }).catch(function(error){

                error = error.toString();

                if (error.indexOf('Rescanning') > -1 ||
                    error.indexOf('Verifying') > -1 ||
                    error.indexOf('Loading block index') > -1 ||
                    error.indexOf("couldn't connect to server") > -1) // todo: limit to repeat this error
                {

                    console.log('initialization:');
                    console.log(error);

                    setTimeout(function(){

                        self.__wait_ready(__callback);

                    }, status_retry_timeout);
                }
                else
                {
                    console.log('daemon error:');
                    console.log(error);

                    __callback(error, false);
                }
            });
    }
    
    /*
        todo: change to bitcoin-cli getblockchaininfo
    */
    
    this.get_blockchain_blockcount = function()
    {

        return new Promise(function(resolve, reject){

            self.http_request(function(error, block_count){

                if (error){
                    return reject(error);
                }

                resolve(block_count);

            });
        });
    }

    this.get_daemon_blockcount = function()
    {
        return new Promise(function(resolve, reject){

            var data_dir = config['bitcoind']['data_folder'];

            var cmd = 'bitcoin-cli -datadir="' + data_dir + '" getblockcount';

            daemon = childProcess.exec(cmd, function (error, blockcount, stderr){

                if (!error)
                {
                    resolve(blockcount);
                }
                else
                {
                    reject(error);
                }
            });

            daemon.on('exit', function (code) { });
        });
    }

    this.http_request = function(__callback)
    {

        var get_params = {
            host : 'blockchain.info',
            path : '/q/getblockcount'
        }

        https.get(get_params, function(response){

            var block_count = '';

            response.on('data', function(d) {
                block_count += d;
            });

            response.on('end', function() {

                if (block_count.indexOf('Please try again') > -1)
                {
                    setTimeout(function(){

                        self.http_request(__callback);

                    }, 1000);
                }
                else
                {
                    __callback(false, block_count);
                }
            });

        }).on('error', function(error){
            __callback(error, false);
        });
    }
}