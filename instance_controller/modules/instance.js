var os       = require('os');
var config   = require('../config.js');
var s3       = require('./s3');
var database = require('./database');

var auth_config = require('../auth_config');
var AWS         = require('aws-sdk');

var ec2         = new AWS.EC2(auth_config[config['username_prefix'] + "ec2"]);

s3       = new s3();
database = new database();

const shutdown_cmd = 'shutdown -P now';

module.exports = function(bitcoind, transactions, auth){

    var self = this;

    this.bitcoind     = bitcoind;
    this.transactions = transactions;
    this.auth         = auth;

    var uptime = os.uptime();
    var hour_uptime = uptime / 60 / 60;

    hour_uptime = hour_uptime - Math.floor(hour_uptime);
    hour_uptime = hour_uptime * 60 * 60;

    var shutdown_after = 60 * 60 - hour_uptime - 2 * 60;
    setTimeout(self.shutdown, shutdown_after * 1000);

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

    this.check_traffic_bill = function()
    {
        return new Promise(function(resolve, reject){

            if (!config['account_id'] || !config['billing_bucket'])
            {
                return resolve(false);
            }

            var accountId = config['account_id'];
            var key       = auth_config[config['username_prefix'] + "s3"]['accessKeyId'];
            var secret    = auth_config[config['username_prefix'] + "s3"]['secretAccessKey'];
            var bucket    = config['billing_bucket'];
            var region    = config['region'];

            var billing   = require('aws-billing')(accountId, key, secret, bucket, region);

            billing(function (err, costs) {

                if (err)
                {
                    return resolve(false); // billing not installed
                }

                var total = costs['total'];

                var products = costs['products'];

                var data_transfer = costs['products']['data transfer'];

                return resolve(data_transfer);

                //return reject(err);
            });
        });
    }

    this.open_port = function()
    {
        return new Promise(function(resolve, reject){

            database.get({ 'key' : 'security_group_id'}).then(function(result){

                var security_group_id = result.value.S;

                var port_params = {
                    GroupId    : security_group_id,
                    CidrIp     : "0.0.0.0/0",
                    FromPort   : 8333,
                    ToPort     : 8333,
                };

                port_params.IpProtocol = 'tcp';

                ec2.authorizeSecurityGroupIngress(port_params, function(err, data) {

                    port_params.IpProtocol = 'udp';

                    ec2.authorizeSecurityGroupIngress(port_params, function(err, data) {

                        if (!err)
                        {
                            return resolve(true);
                        }
                        else
                        {
                            return resolve(false); // [InvalidPermission.Duplicate: the specified rule "peer: 0.0.0.0/0, UDP, from port: 8333, to port: 8333, ALLOW" already exists]
                        }
                    });
                });
            });
        });
    }

    this.close_port = function()
    {
        return new Promise(function(resolve, reject){

            database.get({ 'key' : 'security_group_id'}).then(function(result){

                var security_group_id = result.value.S;

                var port_params = {
                    GroupId    : security_group_id,
                    CidrIp     : "0.0.0.0/0",
                    FromPort   : 8333,
                    ToPort     : 8333,
                };

                port_params.IpProtocol = 'tcp';

                ec2.revokeSecurityGroupIngress(port_params, function(err, data) {

                    port_params.IpProtocol = 'udp';

                    ec2.revokeSecurityGroupIngress(port_params, function(err, data) {

                        if (!err)
                        {
                            return resolve(true);
                        }
                        else
                        {
                            return reject(err);
                        }
                    });
                });

            }).catch(function(error){
                reject(error);
            });
        });
    }
}
