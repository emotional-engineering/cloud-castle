##You own full bitcoin node in Amazon Compute Cloud.

####**PRE-ALFA VERSION, NOT STABLE AND NOT TESTED, DON'T USE IT NOW**, if you are not an iojs and AWS expert.
If you absolutely sure that you will do, you can check it using very small wallet.
**Please be careful.**

####**Algorithm in brief:**

Send a message with the transaction to SNS topic such as: "14ZPHi4Wb9nrL9GvEmJpsHYoqjWuATbNbx 1.7413". http://aws.amazon.com/sns/
SNS message activates Lambda function. http://aws.amazon.com/lambda/
Lambda function checks the server with bitcoin node.
If server working now - it send message further to SQS queue, and iojs script on the server will receive and handle it.
If server not working, Lambda function orders new Spot server and waits when it will start. Also it sends message further to SQS queue. http://aws.amazon.com/sqs/
After starting the server, Lambda function will mount hard drive with blockchain and wallet.dat to it.
After starting, the server uses "user data" script: http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html

zapier.com -> SNS -> Lambda -> SQS -> iojs script on the server -> duo security mobile push authorization -> iojs again -> bitcoind

The import script creates Lambda functions, SNS and SQS streams, system table in DynamoDB, magnetic EBS volume, users and their roles, and first time starts the server to install software, download blockchain, system iojs scripts and wallet.dat from S3.

####**Import instructions:**

Now import script available for linux desktops.
Main part written on iojs, bash used temporarily for simple copy operations.

Create AWS IAM user and attach "IAMFullAccess" policy from the AWS web console.
Install latest aws-cli from github.

Edit config.js file, then:

> export S3_BUCKET=cloud-castle

> export PATH_TO_WALLET_DAT=/path/to/wallet.dat

> wallet_import/import.bash

After first server initialization, system must delete **wallet.dat** from S3, and it will be stored only on EBS volume.
