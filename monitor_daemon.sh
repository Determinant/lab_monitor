#!/bin/bash

#if [[ "$#" -eq 0 ]]; then
#    echo "you must specify the triggered command"
#    exit 1
#fi
CLIENT="python lab_monitor_client.py"
function on_exit {
    $CLIENT --drop "$JID"
    exit 0
}

JID=$($CLIENT --create "$JMNAME" --type "$JTYPE")
if [[ "$JID" == "" ]]; then
    echo "failed to create monitor"
    exit 1
fi
trap on_exit SIGINT SIGTERM
while [ 1 ]; do
    trigger
    sleep 1
done
