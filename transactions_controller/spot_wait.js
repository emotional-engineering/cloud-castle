var AWS    = require('aws-sdk');
var ec2    = require('modules/ec2.js');
var events = require('modules/events.js');

ec2    = new ec2();
events = new events();

/*
    Function running cyclically and waiting when server will be started.
*/

exports.handler = function(event, context) {

    var message           = event.Records[0].Sns.Message;
    var spot_request_data = JSON.parse(message);
    var request_id        = spot_request_data['request_id'];

    wait_spot_fulfilled(request_id, function(error, instance_id){

        if (error)
        {
            console.log(error);
            return context.fail();
        }

        if (!instance_id)
        {
            /*
            *   This instance of function fulfilled its maximum timeout
                Send sns message with same inbound parameters for starting next same lambda function.
            */

            events.spot_wait(request_id, function(error, result){
                console.log('waiting');
                context.succeed();
            });

            return false;
        }

        ec2.tag_instance(instance_id, function(error, result){

            if (error)
            {
                console.log(error);
                return context.fail();
            }

            events.wait_instance(instance_id, function(error, result){
                console.log('done');
                context.succeed();
            });
        });
    });
};

var wait_spot_fulfilled = function(request_id, __callback)
{

    var seconds_in_work = 0;

    var interval = setInterval(function(){

        seconds_in_work += 5;

        if (seconds_in_work > 50)
        {
            clearInterval(interval);
            return __callback(false, false);
        }

        ec2.spot_status(request_id, function(error, instance_id){

            if (error)
            {
                clearInterval(interval);
                return __callback(error, false);
            }

            if (instance_id)
            {
                clearInterval(interval);
                return __callback(false, instance_id);
            }

        });

    }, 5000);
}