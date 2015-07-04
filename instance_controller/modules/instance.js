var os     = require('os');
var config = require('../config.js');
var s3     = require('./s3');

s3 = new s3();

const shutdown_cmd = 'shutdown -P now';

module.exports = function(bitcoind, transactions, auth){

    var self = this;

    this.bitcoind     = bitcoind;
    this.transactions = transactions;
    this.auth         = auth;

    this.clean_init_script = function()
    {
        return new Promise(function(resolve, reject){

            var bucket = config["s3"]["system_bucket"];
            var key    = 'init_server.bash';

            s3
            .get_file_content(bucket, key)
            .then(function(script_content){

                var start_index = script_content.indexOf('#---remove_start---');

                if (start_index == -1)
                {
                    return true;
                }

                var end_index = script_content.indexOf('#---remove_end---');

                var new_script_content = script_content.slice(0, start_index) + script_content.slice(end_index + '#---remove_end---'.length);

                return s3.write_file_content(bucket, key, new_script_content);

            }).then(function(result){
                resolve(result);
            }).catch(function(error){
                console.log('init script clean error');
                reject(error);
            });
        });
    }

    /*
    Shutdown at the end of billing hour.
    */

    this.shutdown = function()
    {
        if (self.bitcoind.get_status() == 'init')
        {
            setTimeout(self.set_shutdown, 4 * 1000);
            return false;
        }

        if (self.transactions.get_state() == 'busy')
        {
            setTimeout(self.set_shutdown, 4 * 1000);
            return false;
        }

        if (self.auth.get_state() == 'busy')
        {
            setTimeout(self.set_shutdown, 4 * 1000);
            return false;
        }

        self.bitcoind
            .stop()
            .then(function(){

                ls = childProcess.exec(shutdown_cmd, function (error, stdout, stderr){ });

                ls.on('exit', function (code) {

                });
            });
    }

    this.set_shutdown = function()
    {
        var uptime = os.uptime();
        var hour_uptime = uptime / 60 / 60;

        hour_uptime = hour_uptime - Math.floor(hour_uptime);
        hour_uptime = hour_uptime * 60 * 60;

        var shutdown_after = 60 * 60 - hour_uptime - 2 * 60;

        setTimeout(self.shutdown, shutdown_after * 1000);
    }

    this.set_shutdown();

}