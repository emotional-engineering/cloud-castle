var fs = require('fs');

module.exports = function() {

    this.replace_in_file = function(file, search, replace)
    {
        return new Promise(function(resolve, reject){

            fs.readFile(file, 'utf8', function (err,data) {

                if (err) {
                    return reject(err);
                }

                var result = data.replace(search, replace);

                fs.writeFile(file, result, 'utf8', function (err) {

                    if (err){
                        return reject(err);
                    }

                    resolve(true);
                });
            });
        });
    }
}