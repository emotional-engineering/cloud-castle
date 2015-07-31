var Promise = require("bluebird");

var s3 = require('./s3');
s3     = new s3();

module.exports = function() {

    var self = this;

    //var cache = [];

    this.get = function(key)
    {

        return new Promise(function(resolve, reject){

            //if (!cache[key])

            s3.get_file_content('lambdasettings', key).then(function(result){

                resolve(result);

            });
        });
    }
}
