var https = require('https');

module.exports = function() {

    var self = this;

    this.get_statistics = function()
    {
        return new Promise(function(resolve, reject){

            self.get_snapshots().then(function(snapshots){

                if (snapshots[0]['total_nodes'] > snapshots[1]['total_nodes'])
                {
                    resolve("increase");
                }
                else
                {
                    resolve("reduction");
                }

            }).catch(function(error){
                resolve(false);
            });
        });
    }

    this.get_snapshots = function()
    {
        return new Promise(function(resolve, reject){

            var url = 'snapshots/';

            self.api_request(url).then(function(data){
                var results = data['results'];
                resolve(results);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.get_nodes = function(timestamp)
    {
        return new Promise(function(resolve, reject){

            var url = 'snapshots/' + timestamp + '/';

            self.api_request(url).then(function(data){                  
                  var nodes = data["nodes"];
                  resolve(nodes);
              }).catch(function(error){
                  reject(error);
              });
        });
    }

    this.api_request = function(url)
    {

        return new Promise(function(resolve, reject){

            var options = {
                hostname : 'getaddr.bitnodes.io',
                port     : 443,
                path     : '/api/v1/' + url,
                method   : 'GET'
            };

            var req = https.request(options, function(res) {

                var data = '';

                res.on('data', function(chunk) {
                    data += chunk;
                });

                res.on('end', function() {
                    data = JSON.parse(data);
                    resolve(data);
                });
            });

            req.end();

            req.on('error', function(error) {
                reject(error);
            });
        });
    }
}
