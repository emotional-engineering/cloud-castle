var auth_config = require('../auth_config');
var config      = require('../config');
var AWS         = require('aws-sdk');
var fs          = require('fs');
var s3          = new AWS.S3(auth_config[config['username_prefix']  + "s3"]);
var ec2         = new AWS.EC2(auth_config[config['username_prefix'] + "ec2"]);

module.exports = function(credentials) {

    var self = this;

    this.check_instance_exist = function(__callback)
    {

        var key = [];
        key['Name']   = 'tag-key';
        key['Values'] = ['Name'];

        var value = [];
        value['Name']   = 'tag-value';
        value['Values'] = ['cloud_wallet'];

        ec2.describeInstances({ 'Filters' : [ key, value ] }, function(err, data) {

            if (err)
            {
                return __callback(err, false);
            }

            if (!data || !data['Reservations'] || data['Reservations'].length == 0)
            {
                return __callback(false, false);
            }

            var instance = data['Reservations'][0]['Instances'][0];

            __callback(false, instance);

        });
    }

    this.check_spot_request = function(__callback)
    {

        var key = [];

        key['Name']   = 'tag-key';
        key['Values'] = ['Name'];

        var value = [];
        value['Name']   = 'tag-value';
        value['Values'] = ['cloud_wallet'];

        ec2.describeSpotInstanceRequests({ 'Filters' : [ key, value ] }, function(err, data) {

            if (err)
            {
                return __callback(err, false);
            }

            if (!data || !data['SpotInstanceRequests'] || data['SpotInstanceRequests'].length == 0)
            {
                return __callback(false, false);
            }

            var requests = data['SpotInstanceRequests'];

            __callback(false, requests);

        });
    }

    this.run_spot = function(instance_type, image_id, zone, price, __callback)
    {

        self.get_init_script(function(error, init_script_content){

            if (error)
            {
                return __callback(error, false);
            }

            var init_script_content = new Buffer(init_script_content).toString('base64');

            price = parseFloat(price.toFixed(3));

            var params = {
                        'LaunchSpecification' : {
                            'InstanceType'          : instance_type,
                            'ImageId'               : image_id,
                            'KeyName'               : config["ec2"]["keypair_name"],
                            'SecurityGroups'        : [ config["ec2"]["security_group"] ],
                            'Placement': {
                                'AvailabilityZone'  : zone
                            },
                            'UserData'              : init_script_content
                        },
                        'SpotPrice'             : price.toString(),
                        'InstanceCount'         : 1,
                        'Type'                  : 'one-time',
                    };

            ec2.requestSpotInstances(params, function(err, data) {

                __callback(err, data);

            });
        });
    }

    this.spot_status = function(request_id, __callback){

        var params = {
            "SpotInstanceRequestIds" : [ request_id ]
        };

        ec2.describeSpotInstanceRequests(params, function(err, data) {

            if (err)
            {
                return __callback(err, false);
            }

            if (!data || !data['SpotInstanceRequests'][0])
            {
                return __callback('no_exist', false);
            }

            var data = data['SpotInstanceRequests'][0];

            var status = data['Status'];

            var code = status['Code'];

            if (code == "fulfilled")
            {
                var instance_id = data['InstanceId'];
                return __callback(false, instance_id);
            }
            else if (code.indexOf('pending') > -1)
            {
                return __callback(false, false);

            } else {
                return __callback('no_exist', false);
            }
        });
    }

    this.instance_status = function(instance_id, __callback)
    {

        var params = {
                "InstanceIds" : [ instance_id ]
            };

        ec2.describeInstanceStatus(params, function(err, data) {

            if (data['InstanceStatuses'].length == 0)
            {
                return __callback('empty', false);
            }
            else if (!err)
            {
                return __callback(err, data['InstanceStatuses'][0]);
            }
            else
            {
                return __callback(err, false);
            }
        });
    };

    this.attach_volume = function(volume_id, instance_id, ebs_dev, __callback)
    {
        var params = {
            "Device"     : ebs_dev,
            "InstanceId" : instance_id,
            "VolumeId"   : volume_id,
        };

        ec2.attachVolume(params, function(err, data) {
            __callback(err, data);
        });
    }

    this.tag_instance = function(instance_id, __callback)
    {
        var params = {
            Resources: [ instance_id ],
            Tags: [
                { Key: 'Name', Value: 'cloud_wallet' }
            ]
        };

        ec2.createTags(params, function(err, result) {

            __callback(err, result);

        });
    }

    this.tag_spot_request = function(request_id, __callback)
    {
        var params = {
            Resources: [ request_id ],
            Tags: [
                { Key: 'Name', Value: 'cloud_wallet' }
            ]
        };

        ec2.createTags(params, function(err, result) {
            __callback(err, result);
        });
    }

    this.get_init_script = function(__callback)
    {

        var params = {
                Bucket : config["s3"]["system_bucket"],
                Key    : config["s3"]["initial_script"]
            };

        s3.getObject(params, function(err, data) {

            if (err)
            {
                return __callback(err, false);
            }

            var data = data['Body'].toString();
            __callback(false, data);

        });
    }

    this.get_spot_price = function(zone, instance_type, __callback)
    {

        var end_date   = Math.floor(Date.now() / 1000);
        var start_date = Math.floor(Date.now() / 1000) - 60;

        var params = {
            AvailabilityZone : zone,
            EndTime          : end_date,
            StartTime        : start_date,
            InstanceTypes : [
                instance_type
            ],
            ProductDescriptions: [
                'Linux/UNIX',
            ],
        };

        ec2.describeSpotPriceHistory(params, function(err, data) {

            if (!err)
            {
                var price = parseFloat(data['SpotPriceHistory'][0]['SpotPrice']);
                __callback(false, price);
            }
            else
            {
                __callback(err, false);
            }
        });
    }
}