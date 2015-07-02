var auth_config = require('./auth_config');
var config      = require('./config');
var readline    = require('readline');

var ec2    = require('../transactions_controller/modules/ec2.js');
var events = require('../transactions_controller/modules/events.js');

ec2    = new ec2();
events = new events();

var rl = readline.createInterface({
    input  : process.stdin,
    output : process.stdout
});

var zone             = config['zone'];
var image_id         = config['ec2']['ami'];
var instance_type    = config['ec2']['instance_type'];
var max_spot_price   = config['ec2']['max_spot_price'];
var price_difference = config['ec2']['price_difference'];

ec2.get_spot_price(zone, instance_type, function(error, spot_price){

    spot_price = spot_price + 0.001;

    if (spot_price > max_spot_price)
    {
        return console.log('low maximum instance price');
    }

    console.log('Current spot price:', spot_price, "$/hour. It takes about 24 hours for synchronization your copy of blockchain.");

    var approximate_cost = (spot_price * 24).toFixed(3);

    var string = "Approximate cost  will be near " + approximate_cost + "$. Do you want to continue? (yes/no)";

    rl.question(string, function(answer) {

        rl.close();

        if (answer != "yes")
        {
            console.log('ok, bye');
            return process.exit(1);
        }

        ec2.run_spot(instance_type, image_id, zone, spot_price, function(error, result){

            if (error)
            {
                return console.log(error);
            }

            var request_id = result['SpotInstanceRequests'][0]['SpotInstanceRequestId'];

            console.log('spot id:', request_id);

            ec2.tag_spot_request(request_id, function(error, result){

                events.spot_wait(request_id, function(error, result){

                    return console.log('done');

                });
            });
        });
    });
});