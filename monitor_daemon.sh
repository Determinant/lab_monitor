#!/bin/bash

#if [[ "$#" -eq 0 ]]; then
#    echo "you must specify the triggered command"
#    exit 1
#fi
function on_exit {
    python client.py --drop "$JID"
    exit 0
}

JID=$(python client.py --create "$JMNAME" --type "$JTYPE")
if [[ "$JID" == "" ]]; then
    echo "failed to create monitor"
    exit 1
fi
trap on_exit SIGINT SIGTERM
CLIENT="python client.py"
while [ 1 ]; do
    trigger
    sleep 1
done
