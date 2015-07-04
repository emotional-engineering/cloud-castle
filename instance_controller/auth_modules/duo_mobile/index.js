var https  = require('https');
var moment = require('moment');
var crypto = require('crypto');
var config = require('./config');

const integration_key = config['integration_key'];
const secret_key      = config['secret_key'];
//const akey            = config['application_key'];
const api_hostname    = config['api_hostname'];
const username        = config['username'];

module.exports = function() {
    
    var self = this;
    
    this.get_name = function()
    {
        return "duo_mobile";
    }
    
    this.auth = function()
    {        
        return new Promise(function(resolve, reject){
       
            var path   = '/auth/v2/preauth';
            var method = 'POST';
            var data   = {
                'username' : username,
            }
                                    
            var tmp_txid = false;
            
            self.api_request(method, path, data)
                .then(function(devices_data){

                    var devices = devices_data.devices;
                    var device  = devices[0].device;

                    var path   = '/auth/v2/auth';
                    var method = 'POST';
                            
                    var data = {
                        'async'    : 0,
                        'device'   : device,
                        'factor'   : 'push',
                        //'ipaddr'   : '8.8.8.8',
                        //'pushinfo' : 'test',  
                        'type'     : 'Bitcoin%20Transaction',
                        'username' : username,                                  
                    }          

                    return self.api_request(method, path, data);

                }).then(function(auth_status){                       

                    if (auth_status.result == 'allow')
                    {
                        resolve(true);
                    }
                    else
                    {
                        resolve(false);
                    }

                }).catch(function(error){ 
                    reject(error);                    
                });              
        });
    }

    this.api_request = function(method, path, data)
    {
        
        return new Promise(function(resolve, reject){
        
            var rfc_date = moment().format("ddd, DD MMM YYYY HH:mm:ss ZZ");
            method = method.toUpperCase();
            
            var formated_data = [];
            
            for(var key in data)
            {        
                formated_data.push(key + '=' + data[key]);        
            }
                    
            formated_data = formated_data.join("&");
                                           
            var auth_components = [
                rfc_date,
                method,
                api_hostname,
                path,
                formated_data
            ];            
                
            var auth_components = auth_components.join("\n");
           
            var password = crypto.createHmac('sha1', secret_key).update(auth_components).digest('hex');
                
            var authorization = 'Basic ' + new Buffer(integration_key + ':' + password).toString('base64');
                   
            if (method == "GET")
            {
                path += '?' + formated_data;
            }         
                   
            var options = {
                method   : method,   
                hostname : api_hostname,
                port     : 443,
                path     : path,          
                "Content-Type": "application/x-www-form-urlencoded",
                headers  : {
                    Date          : rfc_date,
                    Authorization : authorization,
                    "Content-Type": "application/x-www-form-urlencoded"        
                }
            };
          
            
            var req = https.request(options, function(res) {
                
                /*
                res.statusCode;
                res.headers;
                */
                
                res.on('data', function(data) {
                                 
                    data = JSON.parse(data.toString());
                    
                    if (data.stat && data.stat == 'OK')
                    {
                        resolve(data.response)
                    }
                    else
                    {
                        reject(data);
                    }                    
                });
            });
    
            if (method == "POST")
            {
                req.write(formated_data);
            }
    
            req.end();
    
            req.on('error', function(error) {
                reject(error);
            });
        });
    }    
}