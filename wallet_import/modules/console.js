var readline = require('readline');
var colors   = require('colors');

var rl = readline.createInterface({
    input  : process.stdin,
    output : process.stdout
});

module.exports = function() {

    this.question = function(question, accept_string)
    {
        return new Promise(function(resolve, reject){

            rl.question(question, function(answer) {

                if (answer != false && (accept_string == false || answer == accept_string))
                {
                    resolve(answer);
                }
                else
                {
                    resolve(false);
                }
            });
        });
    }

    this.welcome_message = function()
    {

        var question = "\n\n\n";
        question += " WARNING! ";
        question += " WARNING! ".red;
        question += " WARNING! ".bgRed;
        question += "\n PRE-ALFA VERSION ";
        question += " PRE-ALFA VERSION ".red;
        question += " PRE-ALFA VERSION ".bgRed;
        question += "\n POTENTIALLY DANGEROUS ACTIVITY! ";
        question += " POTENTIALLY DANGEROUS ACTIVITY! ".red;
        question += " POTENTIALLY DANGEROUS ACTIVITY! ".bgRed;
        question += "\n\n I'm an iojs and AWS expert and absolutely sure what I will do now (absolutely / no) : ";

        return question;

    }

    this.close = function()
    {
        rl.close();
    }
}