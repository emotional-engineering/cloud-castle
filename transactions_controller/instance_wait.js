var config = require('./config');
var AWS    = require('aws-sdk');

var ec2      = require('modules/ec2.js');
var events   = require('modules/events.js');
var database = require('modules/database');

ec2      = new ec2();
events   = new events();
database = new database();

/*
    Function starts cyclically and waiting when server for cloud wallet will be started.
    After server started it mount EBS volume.
*/

exports.handler = function(event, context) {

    var message = event.Records[0].Sns.Message;

    var instance_data = JSON.parse(message);

    var instance_id = instance_data['instance_id'];

    wait_instance_start(instance_id, function(error, status){

        if (error)
        {
            console.log(error);
            return context.fail();
        }

        if (!status)
        {

            /*
            *   function waited more than possible to lambda function
                send sns message with same input parameters for starting new same lambda function
            */

            events.wait_instance(instance_id, function(error, result){
                context.succeed();
            });

            return false;
        }

        database.get('ebs_volume_id', function(error, result){

            var volume_id = result.value.S;
            var ebs_dev   = config["ec2"]["ebs_device"];

            ec2.attach_volume(volume_id, instance_id, ebs_dev, function(error, result){

                if (!error)
                {
                    console.log('done');
                    context.succeed();
                }
                else
                {
                    console.log('mount volume error:');
                    console.log(error);
                    context.fail();
                }
            });
        });
    });
};

var wait_instance_start = function(instance_id, __callback)
{

    var seconds_in_work = 0;

    var interval = setInterval(function(){

        seconds_in_work+=5;

        if (seconds_in_work > 50)
        {
            clearInterval(interval);
            return __callback(false, false);
        }

        ec2.instance_status(instance_id, function(error, status){

            if (error)
            {
                clearInterval(interval);
                return __callback(error, false);
            }

            if (status['InstanceState']['Name'] == 'running')
            {
                clearInterval(interval);
                return __callback(false, status);
            }

        });

    }, 5000);
}