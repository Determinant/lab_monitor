#!/bin/bash
export JMNAME='RAM'
export JTYPE='linegraph'
function trigger {
    $CLIENT --add "$JID" $(python -c $'import psutil\nprint psutil.virtual_memory().percent')
}
export -f trigger
./monitor_daemon.sh
