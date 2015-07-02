var auth_config = require('../auth_config');
var config      = require('../config');
var AWS         = require('aws-sdk');
var fs          = require('fs');
var ec2         = new AWS.EC2(auth_config[config['username_prefix'] + "ec2"]);

module.exports = function() {

    this.create_volume = function(size_gb)
    {
        return new Promise(function(resolve, reject){

            var params = {
                "AvailabilityZone" : config["zone"],
                "Encrypted"        : false,
                "Size"             : size_gb,
                "VolumeType"       : 'standard'
            };

            ec2.createVolume(params, function(err, data) {

                if (!err)
                {
                    resolve(data);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.create_keypair = function(name, save_private_key)
    {
        return new Promise(function(resolve, reject){

            var params = {
                KeyName : name,
            };

            ec2.createKeyPair(params, function(err, data) {

                if (save_private_key)
                {
                    var file_name = data.KeyName + '.pem';
                    var key       = data.KeyMaterial;

                    console.log('save private ssh key:', file_name);

                    fs.writeFileSync(file_name, key);
                }

                if (!err)
                {
                    resolve(true);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }

    this.create_security_group = function(group_name, description)
    {

        return new Promise(function(resolve, reject){

            var params = {
                "Description" : description,
                "GroupName"   : group_name,
            };

            ec2.createSecurityGroup(params, function(err, data) {

                if (!err)
                {
                    resolve(data);
                }
                else
                {
                    reject(err);
                }
            });
        });
    }
}