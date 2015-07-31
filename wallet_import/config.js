module.exports = {
    /*
    Select AWS region and zone: http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html
    */
    region : 'us-east-1',
    zone   : 'us-east-1e',
    username_prefix : 'cloud_castle_',
    account_id : "*",
    billing_bucket : "cloud-castle-traffic-billing",
    data_transfer_max_cost : 1.7, // the maximum cost you are willing to pay for outgoing traffic per month, USD value - "1.48". "0" to close port
    /*
    Create a random user name and password for bitcoind.
    */
    bitcoind : {
        user        : 'bitcoinrpc',
        pass        : 'myrandomlongsecretpassword',
        data_folder : '/media/bitcoin_data/'
    },
    cloud_castle : {
        path : '/media/cloud-castle'
    },
    s3 : {
        system_bucket  : 'cloud-castle',
        initial_script : 'init_server.bash'
    },
    ec2 : {
        security_group   : 'cloud_castle',
        keypair_name     : 'cloud_castle',
        ami              : 'ami-d05e75b8', /* find in the selected region AMI with Ubuntu Server 14.04 LTS  */
        instance_type    : 'm3.medium',
        max_spot_price   : 0.015,
        price_difference : 0.002,
        ebs_device       : '/dev/sdf',
        ebs_start_size   : 60
    },
    sns : {
        inbound_transactions       : 'cloud_castle_inbound_transactions',
        transactions_auth_requests : 'cloud_castle_auth_requests',
        transactions_results       : 'cloud_castle_results',
        spot_wait                  : 'cloud_castle_spot_wait',
        instance_wait              : 'cloud_castle_instance_wait',
    },
    sqs : {
        pending_transactions      : 'cloud_castle_pending_transactions',
        transactions_auth_answers : 'cloud_castle_auth_answers',
    },
    lambda : {
        controller : {
            name    : 'cloud_castle_controller',
            handler : 'controller.handler'
        },
        spot_wait :  {
            name    : 'cloud_castle_spot_wait',
            handler : 'spot_wait.handler'
        },
        instance_wait : {
            name    : 'cloud_castle_instance_wait',
            handler : 'instance_wait.handler'
        },
        package_files : ['config.js',
                         'auth_config.js',
                         'node_modules',
                         'modules']
    },
    iam : {
        lambda_execution_role : 'cloud_castle'
    },
    dynamodb : {
        data_table_name : 'cloud_castle',
    },
}
