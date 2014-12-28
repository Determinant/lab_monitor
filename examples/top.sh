#!/bin/bash
export JMNAME='TOP'
export JTYPE='listgraph'
function trigger {
    top -bn1 -S | tail -n +8 | head -n 10 | awk '{ print $1, $2}' | $CLIENT --alter "$JID"
}
export -f trigger
./monitor_daemon.sh
