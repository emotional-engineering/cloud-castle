var config = require('./config');

var async        = require('async');
var transactions = require('modules/transactions.js');
var ec2          = require('modules/ec2.js');
var events       = require('modules/events.js');

transactions = new transactions();
ec2          = new ec2();
events       = new events();

exports.handler = function(event, context) {

    async.parallel([
        function(callback){

            var transaction_string = event.Records[0].Sns.Message;

            transaction = transaction_string.split(' ');

            console.log('transaction:');
            console.log(transaction);

            var address = transaction[0];
            var amount  = transaction[1];

            transactions.send(address, amount, function(error, result){

                if (error)
                {
                    console.log('transaction error:');
                    console.log(error);

                    return callback(error, false);
                }
                else
                {
                    return callback(false, true);
                }
            });
        },
        function(callback){

            ec2.check_spot_request(function(error, request){

                if (error)
                {
                    return callback(error, false);
                }

                var spot_is_active = false;

                for (var i = 0; i < request.length; i++)
                {
                    if (request[i]['State'] == 'open' || request[i]['State'] == 'active')
                    {
                        spot_is_active = true;
                        break;
                    }
                }

                if (spot_is_active){

                    console.log('spot request active', spot_is_active);
                    return callback(false, true);
                }

                ec2.check_instance_exist(function(error, instance){

                    var instance_exist = false;

                    if (instance && instance['State'] && instance['State']['Name'])
                    {

                        var state = instance['State']['Name'];

                        if (state != 'terminated')
                        {
                            var instance_exist = true;
                        }
                    }

                    if (instance_exist) // working instance exist
                    {
                        console.log('instance exist', instance.InstanceId);
                        callback(false, true);
                    }
                    else // start new instance
                    {

                        console.log('will start instance');

                        var zone           = config['zone'];
                        var image_id       = config['ec2']['ami'];
                        var instance_type  = config['ec2']['instance_type'];
                        var max_spot_price = config['ec2']['max_spot_price'];

                        ec2.get_spot_price(zone, instance_type, function(error, spot_price){

                            spot_price = spot_price + 0.001;

                            if (spot_price > max_spot_price)
                            {
                                return callback('low maximum instance price', false);
                            }

                            console.log('spot price:', spot_price);

                            ec2.run_spot(instance_type, image_id, zone, spot_price, function(error, result){

                                if (error)
                                {
                                    return callback(error, false);
                                }

                                var request_id = result['SpotInstanceRequests'][0]['SpotInstanceRequestId'];

                                console.log('spot id:', request_id);

                                ec2.tag_spot_request(request_id, function(error, result){

                                    events.spot_wait(request_id, function(error, result){

                                        callback(error, result);

                                    });
                                });
                            });
                        });
                    }
                });
            });

            return false;
        }

    ], function(error, result){

        if (error)
        {
            console.log('error');
            console.log(error);
            return context.fail();
        }

        console.log('finish');
        context.succeed();
    });
};