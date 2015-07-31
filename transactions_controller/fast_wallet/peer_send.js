var bitcore = require('bitcore');
var p2p     = require('bitcore-p2p');

var Peer     = p2p.Peer;
var Messages = p2p.Messages;

var messages = new Messages();

var script_timeout = 50;

exports.handler = function(event, context) {

    var message = JSON.parse(event.Records[0].Sns.Message);

    var raw_transaction = message.transaction;

    var peer = message.peer.split(":");

    console.log('peer:', peer);

    peer = new Peer({
        "host" : peer[0],
        "port" : peer[1]
    });

    peer.on('ready', function() {

        console.log('peer:', peer.version, peer.subversion, peer.bestHeight);

        var transaction = new bitcore.Transaction(raw_transaction);

        var message = messages.Transaction(transaction);

        peer.sendMessage(message);

        return false;

    });

    /*
    todo: add peers to database
    */

    peer.on('addr', function(message) {

        var ip4  = message['addresses'][0]['ip']['v4'];
        var port = message['addresses'][0]['port'];

        console.log('addr ip4:', ip4, ':', port);

    });

    peer.connect();

    setTimeout(function(){

        context.succeed('ok');

    }, script_timeout * 1000);

};
