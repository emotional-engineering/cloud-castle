##You own full bitcoin node in Amazon Compute Cloud.

####**PRE-ALFA VERSION, NOT STABLE AND NOT TESTED, DON'T USE IT NOW**, if you are not an iojs and AWS expert.
If you absolutely sure that you will do, you can check it using very small wallet.
**Please be careful.**


####**Import instructions:**

Create AWS IAM user and attach "IAMFullAccess" policy from the AWS web console.
It will need to create other users on the next steps.

Install aws-cli: http://aws.amazon.com/cli/

Run the following commands from linux or windows console:

> aws configure

Enter "IAMFullAccess" user credentials.

Create a user to upload files to S3:

> aws iam create-user --user-name s3_tmp_user

> aws iam create-access-key --user-name s3_tmp_user

> aws iam attach-user-policy --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess --user-name s3_tmp_user

> aws configure

Enter s3_tmp_user user credentials. You can use "eu-west-1" as region, or one of the following: http://docs.aws.amazon.com/general/latest/gr/rande.html

Create bucket with unique name for storage wallet and init server script.

> aws s3 mb s3://cloud-castle-bucket

Copy your wallet to the S3 bucket.

> aws s3 cp /path/to/wallet.dat s3://cloud-castle-bucket

> cd wallet_import

> npm i

Edit config.js file, then:

> iojs create_users.js

> cp ./auth_config.js ../transactions_controller

> cp ./config.js      ../transactions_controller

> cd ../transactions_controller

> npm i

> cd ../wallet_import

> iojs import.js

Copy server init bash scripts.
This scripts will run each time when server is starting.

> aws s3 cp init_server.bash s3://cloud-castle-bucket

Start server for first initialization.

> iojs init_server.js

##### Cleaning:

> rm ./auth_config.js

> rm ../transactions_controller/auth_config.js

> rm ./init_server.bash

> aws configure

Enter "IAMFullAccess" user credentials.

> aws iam delete-user --user-name s3_tmp_user

> aws iam delete-user --user-name {iam_username}

After first server initialization, system must delete **wallet.dat** from S3.

Also **s3://cloud-castle-bucket/init_server.bash** must be cleared from lines, which contain configuration information.

Check that **s3://cloud-castle-bucket/** consist only **init_server.bash**, and no authorization data inside it.

Now you **wallet.dat** and **auth_config.js** file with AWS credentials must be store only on EBS volume.
