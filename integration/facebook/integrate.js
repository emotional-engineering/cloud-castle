var s3 = require('./modules/s3');
var integration_config = require('./integration_config');

s3 = new s3();

s3.create_bucket(integration_config.s3_bucket).then(function(result){
    console.log(result);
    return process.exit(0);
}).catch(function(error){
    console.log(error);
    return process.exit(1);
});
