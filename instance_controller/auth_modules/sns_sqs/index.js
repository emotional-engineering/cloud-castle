var auth_config   = require('../../auth_config');
var common_config = require('../../config.js');
var config        = require('./config');
var AWS           = require('aws-sdk');

var sns = new AWS.SNS(auth_config[common_config['username_prefix'] + "sns"]);
var sqs = new AWS.SQS(auth_config[common_config['username_prefix'] + "sqs"]);

var database     = require('../../modules/database');
var transactions_module = require('../../modules/transactions');

database = new database();
transactions_module = new transactions_module();

var EventEmitter  = require('events').EventEmitter;

module.exports = function() {

    var self = this;

    this.event_emitter = new EventEmitter();

    this.active_transactions = [];

    this.transactions_auth_sns_request = false;
    this.transactions_auth_sqs_answer  = false;
        
    this.get_name = function()
    {
        return "sns_sqs";
    }
    
    this.auth = function(transaction)
    {
        return new Promise(function(resolve, reject){
            
            if (!self.transactions_auth_sns_request)
            {                
                database
                    .get('transactions_auth_requests')
                    .then(function(sns_arn){
    
                        self.transactions_auth_sns_request = sns_arn['value']['S'];
                        
                        self
                            .auth_request(transaction)
                            .then(function(auth_result){
                                
                                if (auth_result.result == 'accepted')
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
            else
            {                
                self
                    .auth_request(transaction)
                    .then(function(auth_result){
                        
                        if (auth_result.result == 'accepted')
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
            }            
        });
    }
    
    this.auth_request = function(transaction)
    {        
        return new Promise(function(resolve, reject){
                                                        
            transaction.transaction_key = self.make_key(40);
            
            self.active_transactions[transaction.transaction_key] = transaction;
           
            var message = transaction.address + ' ' + transaction.amount + ' ' + transaction.transaction_key;
           
            var params = {
                "Message"  : message,
                "TopicArn" : self.transactions_auth_sns_request
            };
                                    
            sns.publish(params, function(err, data) {

                if (err)
                {
                    return reject(err);
                }
                                                                        
                self.awaiting_result_sqs(function(error, result){
                                        
                    if (!error)
                    {
                        resolve(result);                        
                    }
                    else
                    {
                        reject(error);
                    }                        
                });                    
            });            
        });        
    }

    this.awaiting_result_sqs = function(__callback)
    {
        if (!self.transactions_auth_sqs_answer)
        {    
            
            transactions_module
                .get_queue_url(common_config['sqs']['transactions_auth_answers'])
                .then(function(sqs_arn){

                    self.transactions_auth_sqs_answer = sqs_arn;

                    return self.get();
                    
                }).then(function(result)
                {
                    if (result)
                    {
                        __callback(false, result);
                    }
                    else
                    {
                        self.awaiting_result_sqs(__callback);
                    }
                })
                .catch(function(error){
                    __callback(error, false);
                });
        }
        else
        {
            self.get()                
                .then(function(result)
                {
                    if (result)
                    {
                        __callback(false, result);
                    }
                    else
                    {
                        self.awaiting_result_sqs(__callback);
                    }
                })
                .catch(function(error){
                    __callback(error, false);
                });
        }
    }

    /*
        Obtaining authorization messages.
    */

    this.get = function()
    {
        return new Promise(function(resolve, reject){

            var sqs_params = {
                "QueueUrl"            : self.transactions_auth_sqs_answer,
                "MaxNumberOfMessages" : 1,
                "VisibilityTimeout"   : 60,
                "WaitTimeSeconds"     : 20
            }

            sqs.receiveMessage(sqs_params, function(err, data){

                if(err){
                    return reject(err);
                }
                else if (!data.Messages)
                {
                    return resolve(false);
                }

                var message = data.Messages[0];                                                

                var decoded_message = new Buffer(message['Body'], 'base64').toString('utf8');
                var receipt         = message['ReceiptHandle'];

                var message_data = decoded_message.split("\r\n");
                
                var transaction_key = false;

                /*
                    Search transaction key in inbound message.
                */

                for (var i = 1; i < message_data.length; i++) // message_data[0] contains answer
                {

                    var string_data = message_data[i].split(' ');

                    for (var j = 0; j < string_data.length; j++)
                    {
                        var test_key = string_data[j];

                        if (self.active_transactions[test_key])
                        {
                            transaction_key = test_key;
                            break;
                        }
                    }
                };

                if (!transaction_key)
                {
                    self.remove_from_queue(receipt);
                    return resolve(false);
                }

                var transaction = self.active_transactions[transaction_key];
                                
                delete self.active_transactions[transaction_key];

                self.remove_from_queue(receipt);
                               
                var answer_string = message_data[0];
                answer_string     = answer_string.split(" ");
                var answer        = answer_string[0];

                console.log('sns_sqs answer:', answer);
                
                if (answer == config['accept_word'])
                {
                    transaction.result = 'accepted';
                }
                else
                {
                    transaction.result = 'rejected';
                }

                return resolve(transaction);
            });
        });
    }

    this.remove_from_queue = function(receipt) {

        var sqs_params = {
            "QueueUrl"      : self.transactions_auth_sqs_answer,
            "ReceiptHandle" : receipt
        }
                
        sqs.deleteMessage(sqs_params, function(err, data) {
            // ------
        });
    };
    
    this.make_key = function(length)
    {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                
        for( var i=0; i < length; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
                        
        return text;
    }   
}