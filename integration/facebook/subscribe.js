var FB   = require('fb');
var argv = require('minimist')(process.argv.slice(2));

var integration_config = require('./integration_config');

if (!argv.a)
{
    log('use user access token');
    process.exit(1);
}

var user_access_token = argv.a;

/*
    subscribe app
*/

FB.setAccessToken(integration_config['app_access_token']);

var endpoint = "/" + integration_config['app_id'] + "/subscriptions";

var request_data = {
    "object"       : "page",
    "callback_url" : integration_config['app_callback_url'],
    "fields"       : "feed",
    "verify_token" : "mustberandomstring"
}

FB.api(endpoint, 'post', request_data, function (res) {

    if (res && res.error) {
        console.log(res.error);
        return process.exit(1);
    }

    FB.setAccessToken(user_access_token);

    var endpoint = "/me/accounts";

    /*
        Get page access token
    */

    FB.api(endpoint, 'get', { }, function (res) {

        if (res.error) {
            console.log(res.error);
            return process.exit(1);
        }

        var data = res.data;

        var page_id = false;
        var page_access_token = false;

        for (var i = 0; i < data.length; i++)
        {
            if (data[i].name == integration_config['app_pagename'])
            {
                page_id = data[i].id;
                page_access_token = data[i].access_token;
                break;
            }
        }

        // exchange for long life token

        var endpoint = "/oauth/access_token";
        var request_data = {
            "client_id"         : integration_config['app_id'],
            "client_secret"     : integration_config['app_secret'],
            "grant_type"        : "fb_exchange_token",
            "fb_exchange_token" : page_access_token

        }

        FB.api(endpoint, 'get', request_data, function (res) {

            if (res.error) {
                console.log(res.error);
                return process.exit(1);
            }

            /*
                subscribe app to page
            */

            var page_long_access_token = res.access_token;

            FB.setAccessToken(page_long_access_token);

            var endpoint = "/" + page_id + "/subscribed_apps";

            FB.api(endpoint, 'post', {}, function (res) {

                if (res.error) {
                    console.log(res.error);
                    return process.exit(1);
                }

                process.exit(1);

            });
        });
    });
});
