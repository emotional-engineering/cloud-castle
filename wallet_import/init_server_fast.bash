#!/bin/bash

sleep 60 # sleep before lambda function will connect the volume. #todo: change to mount waiting

IOJS_REPOSITORY="https://github.com/nodejs/io.js.git"

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
    apt-get install -y awscli unzip

    cd $MOUNT_POINT
    git clone https://github.com/bitcoin/bitcoin.git ./bitcoind
    cd ./bitcoind
    sed -i -e 's/MAX_OUTBOUND_CONNECTIONS = 8/MAX_OUTBOUND_CONNECTIONS = 1000/g' ./src/net.cpp
    ./autogen.sh
    ./configure
    make -j 40
    make install

    ulimit -n 9000

    mkdir -p /tmp/ram
    sudo mount -t tmpfs -o size=72000M tmpfs /tmp/ram/

    cd /tmp/ram
    mkdir ./bitcoin_data
    cd ./bitcoin_data
    echo "rpcuser=$BITCOIND_USER" > bitcoin.conf
    echo "rpcpassword=$BITCOIND_PASS" >> bitcoin.conf
    bitcoind  -datadir="/tmp/ram/bitcoin_data" -dbcache=10996 -maxconnections=1000 -timeout=30000 -daemon

    cd $MOUNT_POINT
    git clone $IOJS_REPOSITORY ./io.js
    cd io.js
    ./configure
    make -j 40
    make install

    cd $MOUNT_POINT

    export AWS_ACCESS_KEY_ID={{aws_s3_key_id}}
    export AWS_SECRET_ACCESS_KEY={{aws_s3_key_secret}}
    export AWS_DEFAULT_REGION={{aws_s3_region}}

    aws s3 cp s3://cloud-castle/instance_controller.zip instance_controller.zip
    unzip instance_controller.zip
    cd $MOUNT_POINT/instance_controller
    npm i
    nohup iojs $MOUNT_POINT/instance_controller/fast_install.js > $MOUNT_POINT/fast_install.log &

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
