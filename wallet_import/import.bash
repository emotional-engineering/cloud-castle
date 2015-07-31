#!/bin/bash
#INIT_SERVER_SCRIPT="init_server_fast.bash"
cd wallet_import
echo "Enter 'IAMFullAccess' user credentials"
aws configure
echo "Will create 's3_tmp_user'..."
aws iam create-user --user-name s3_tmp_user
aws iam create-access-key --user-name s3_tmp_user
aws iam attach-user-policy --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess --user-name s3_tmp_user
echo "Enter s3_tmp_user user credentials"
aws configure
aws s3 mb s3://$S3_BUCKET
aws s3 cp $PATH_TO_WALLET_DAT s3://$S3_BUCKET
npm i
iojs create_users.js
#cp ./auth_config.js ../transactions_controller
# ./config.js ../transactions_controller
cd ../transactions_controller
npm i
cd ../wallet_import
iojs import.js $IMPORT_ARGS
#cp ./auth_config.js ../instance_controller
#cp ./config.js ../instance_controller
#cp database.js ../instance_controller
cd ../
cd instance_controller
npm i
cd ../
zip -r -0 instance_controller.zip instance_controller
aws s3 cp instance_controller.zip s3://$S3_BUCKET
cd wallet_import
aws s3 cp $INIT_SERVER_SCRIPT s3://$S3_BUCKET
iojs init_server.js

#rm ./auth_config.js
#rm ../transactions_controller/auth_config.js
#rm ../instance_controller/auth_config.js

#echo "Enter 'IAMFullAccess' user credentials"
#aws configure
#aws iam delete-user --user-name s3_tmp_user

#echo "Now you can delete user with 'IAMFullAccess'"
echo "completed"
