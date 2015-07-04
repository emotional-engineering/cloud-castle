var fs    = require('fs');
var path  = require('path');
var async = require('async');
var EventEmitter  = require('events').EventEmitter;

var auth_modules = [];
var auth_modules_path = path.normalize(__dirname + '/../' + 'auth_modules');

fs.readdirSync(auth_modules_path).forEach(function(auth_module) {

    console.log('auth module connected:', auth_module);

    var module_index = auth_modules_path + '/' + auth_module + '/index.js';

    var new_module_i = auth_modules.length;

    auth_modules[new_module_i] = require(module_index);
    auth_modules[new_module_i] = new auth_modules[new_module_i]();

    return true;

});

module.exports = function() {

    var self = this;

    this.event_emitter = new EventEmitter();

    this.active_transactions = [];

    this.get_state = function()
    {
        if (self.active_transactions.length > 0)
        {
            return 'busy';
        }
        else
        {
            return 'idle';
        }
    }

    this.request = function(transaction)
    {
        return new Promise(function(resolve, reject){

            async.map(auth_modules, function(module, callback) {

                module
                    .auth(transaction)
                    .then(function(result){

                        console.log(module.get_name(), 'auth result:', result);

                        callback(false, result);

                    }).catch(function(error){

                        callback(error, false);

                    });

            }, function(error, auth_results) {

                if (error)
                {
                    return reject(error);
                }

                var final_auth = true;

                auth_results.forEach(function(auth_result){

                    if (auth_result == false)
                    {
                        final_auth = false;
                    }
                });

                resolve(final_auth);

            });
        });
    }
}