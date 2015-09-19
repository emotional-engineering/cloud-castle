var aws4    = require('aws4');
var request = require('request');

var config      = require('./config');
var auth_config = require('./auth_config');

module.exports = function(){

    var self = this;

    var host = "apigateway." + auth_config[config['username_prefix'] + "apigateway"]["region"] + ".amazonaws.com";

    this.create_api = function(name)
    {
        return new Promise(function(resolve, reject){

            var path = "/restapis";

            var request_options = {
                host   : host,
                path   : path,
                method : "POST",
                url    : "https://" + host + path,
                body : JSON.stringify({
                    name : name
                })
            };

            self.api_request(request_options).then(function(result){
                var api_id = result.id;
                resolve(api_id);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.get_resources = function(api_id)
    {
        return new Promise(function(resolve, reject){

            var path = "/restapis/" + api_id + "/resources";

            var request_options = {
                host   : host,
                path   : path,
                method : "GET",
                url    : "https://" + host + path,
            };

            self.api_request(request_options).then(function(result){
                resolve(result['_embedded']);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.create_method = function(rest_api_id, resoure_id, http_type)
    {
        return new Promise(function(resolve, reject){

            var path = "/restapis/" + rest_api_id + "/resources/" + resoure_id + "/methods/" + http_type;

            var request_options = {
                host   : host,
                path   : path,
                method : "PUT",
                url    : "https://" + host + path,
                body : JSON.stringify({
            		    "authorizationType" : "NONE",
                    "apiKeyRequired"    : false,
            	  })
            };

            self.api_request(request_options).then(function(result){
                resolve(result);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.create_integration = function(rest_api_id, resoure_id, http_method_type, lambda_arn, iam_role)
    {
        return new Promise(function(resolve, reject){

            var path = "/restapis/" + rest_api_id + "/resources/" + resoure_id + "/methods/" + http_method_type + "/integration";

            var request_options = {
                host   : host,
                path   : path,
                method : "PUT",
                url    : "https://" + host + path,
                body : JSON.stringify({
            		    "type"        : "AWS",
                    "uri"         : lambda_arn,
                    "httpMethod"  : http_method_type,
                    "credentials" : iam_role,
            	  })
            };

            self.api_request(request_options).then(function(result){

                if (result.message && result.message.indexOf("is not authorized to perform") > -1)
                {
                    return reject(result.message);
                }
                else
                {
                    return resolve(result);
                }

            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.method_responce = function(rest_api_id, resoure_id, http_method_type, responce_code)
    {
        return new Promise(function(resolve, reject){

            var path = "/restapis/" + rest_api_id + "/resources/" + resoure_id + "/methods/" + http_method_type + "/responses/" + responce_code;

            var request_options = {
                host   : host,
                path   : path,
                method : "PUT",
                url    : "https://" + host + path,
                body : JSON.stringify({
                    "responseParameters" : {},
                    "responseModels" : {
                        "application/json" : "Empty"
                    },
            	  })
            };

            self.api_request(request_options).then(function(result){
                resolve(result);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.integration_responce = function(rest_api_id, resoure_id, http_method_type, responce_code)
    {
        return new Promise(function(resolve, reject){

            var path = "/restapis/" + rest_api_id + "/resources/" + resoure_id + "/methods/" + http_method_type + "/integration/responses/" + responce_code;

            var request_options = {
                host   : host,
                path   : path,
                method : "PUT",
                url    : "https://" + host + path,
                body : JSON.stringify({
                    "responseTemplates" : {
                        "application/json" : "#set($inputRoot = $input.path('$'))\n{ }"
                    }
            	  })
            };

            self.api_request(request_options).then(function(result){
                resolve(result);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.create_deployment = function(rest_api_id, stage_name)
    {
        return new Promise(function(resolve, reject){

            var path = "/restapis/" + rest_api_id + "/deployments";

            var request_options = {
                host   : host,
                path   : path,
                method : "POST",
                url    : "https://" + host + path,
                body : JSON.stringify({
                    "stageName"           : stage_name,
                    "stageDescription"    : "some description",
                    "description"         : "some description",
                    "cacheClusterEnabled" : false,
                })
            };

            self.api_request(request_options).then(function(result){
                resolve(result.id);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.get_deployment = function(rest_api_id, deployment_id)
    {
        return new Promise(function(resolve, reject){

            var path = "/restapis/" + rest_api_id + "/deployments/" + deployment_id;

            var request_options = {
                host   : host,
                path   : path,
                method : "GET",
                url    : "https://" + host + path,
            };

            self.api_request(request_options).then(function(result){
                resolve(result);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.create_stage = function(rest_api_id, deployment_id)
    {
        return new Promise(function(resolve, reject){

            var path = "/restapis/" + rest_api_id + "/stages";

            var request_options = {
                    host   : host,
                    path   : path,
                    method : "POST",
                    url    : "https://" + host + path,
                    body : JSON.stringify({
                        "stageName"           : "data_st",
                        "deploymentId"        : deployment_id,
                        "description"         : "String",
                        "cacheClusterEnabled" : false,
                    })
            };

            self.api_request(request_options).then(function(result){
                resolve(result);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.get_stage = function(rest_api_id, stage_name)
    {
        return new Promise(function(resolve, reject){

            var path = "/restapis/" + rest_api_id + "/stages/" + stage_name;

            var request_options = {
                host   : host,
                path   : path,
                method : "GET",
                url    : "https://" + host + path,
            };

            self.api_request(request_options).then(function(result){
                resolve(result);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    this.api_request = function(request_options)
    {
        return new Promise(function(resolve, reject){

            aws4.sign(request_options, {
                "accessKeyId"     : auth_config[config['username_prefix']  + "apigateway"]["accessKeyId"],
                "secretAccessKey" : auth_config[config['username_prefix']  + "apigateway"]["secretAccessKey"],
            });

            request(request_options, function (err, resp, data){

                if (!err)
                {
                    data = JSON.parse(data);
                    return resolve(data);
                }
                else
                {
                    return reject(err);
                }
            });
        });
    }
};
