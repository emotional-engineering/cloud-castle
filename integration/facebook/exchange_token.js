var FB   = require('fb');
var s3   = require('./modules/s3');
var argv = require('minimist')(process.argv.slice(2));

var integration_config = require('./integration_config');

s3 = new s3();

var endpoint = "/oauth/access_token";

/*
  Change short live token to long life token and save it to S3
*/

var short_live_token = argv.a;

var request_data = {
    "client_id"         : integration_config.app_id,
    "client_secret"     : integration_config.app_secret,
    "grant_type"        : "fb_exchange_token",
    "fb_exchange_token" : short_live_token
}

FB.api(endpoint, 'get', request_data, function (res) {

    console.log(res);

    var access_token = res.access_token;

    s3.write_file_content(integration_config.s3_bucket, 'facebook_access_token', access_token).then(function(result){

        console.log(result);
        process.exit(1);

    }).catch(function(error){
        console.log(error);
        process.exit(1);
    });
});
