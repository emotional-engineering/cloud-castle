#!/bin/bash

sleep 60 # sleep before lambda function will connect the volume. #todo: change to mount waiting

IOJS_REPOSITORY="https://github.com/nodejs/io.js.git"
SYSTEM_REPOSITORY="https://github.com/emotional-engineering/cloud-castle.git"

EBS="/dev/xvdf"
MOUNT_POINT="/media"

BITCOIND_USER="{{bitcoind_user}}"
BITCOIND_PASS="{{bitcoind_pass}}"

MOUNT_ERROR=$((mount $EBS $MOUNT_POINT) 2>&1)

echo $MOUNT_ERROR

if grep -q mount <<< $MOUNT_ERROR; then

    # new system

    mkfs -t ext4 $EBS
    mount $EBS $MOUNT_POINT

    add-apt-repository -y ppa:bitcoin/bitcoin
    apt-get update
    apt-get install -y git-core build-essential autoconf libtool libdb4.8++-dev libssl-dev libboost-all-dev libgtk2.0-dev

    cd $MOUNT_POINT
    git clone https://github.com/bitcoin/bitcoin.git ./bitcoind
    cd ./bitcoind
    ./autogen.sh
    ./configure
    make
    make install

    cd $MOUNT_POINT
    git clone $IOJS_REPOSITORY ./io.js
    cd io.js
    ./configure
    make
    make install

    cd $MOUNT_POINT
    mkdir ./bitcoin_data
    cd ./bitcoin_data
    echo "rpcuser=$BITCOIND_USER" > bitcoin.conf
    echo "rpcpassword=$BITCOIND_PASS" >> bitcoin.conf

    cd $MOUNT_POINT
    git clone $SYSTEM_REPOSITORY ./cloud_castle

    #---remove_start---
    echo '{{auth_config}}' > $MOUNT_POINT/cloud_castle/instance_controller/auth_config.js
    echo "{{config}}" > $MOUNT_POINT/cloud_castle/instance_controller/config.js
    #---remove_end---
    
    cp $MOUNT_POINT/cloud_castle/wallet_import/database.js $MOUNT_POINT/cloud_castle/instance_controller
    cd $MOUNT_POINT/cloud_castle/instance_controller
    npm i
    nohup iojs $MOUNT_POINT/cloud_castle/instance_controller/main.js > $MOUNT_POINT/controller.log &

else

    # old system

    add-apt-repository -y ppa:bitcoin/bitcoin
    apt-get update
    apt-get install -y git-core build-essential autoconf libtool libdb4.8++-dev libssl-dev libboost-all-dev libgtk2.0-dev

    cd $MOUNT_POINT
    cd ./bitcoind
    make install

    cd $MOUNT_POINT
    cd io.js
    make install

    nohup iojs $MOUNT_POINT/cloud_castle/instance_controller/main.js >> $MOUNT_POINT/controller.log &

fi