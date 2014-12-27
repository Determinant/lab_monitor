#!/bin/bash
export JMNAME='MEM'
export JTYPE='linegraph'
function trigger {
    $CLIENT --add "$JID" $(python -c $'import psutil\nprint psutil.virtual_memory().free*.1/2**20')
}
export -f trigger
./monitor_daemon.sh
