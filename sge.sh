#!/bin/bash
export JMNAME='TOP'
export JTYPE='listgraph'
function trigger {
    qstat -u '*' | tail -n +3 | head -n 10 | $CLIENT --alter "$JID"
}
export -f trigger
./monitor_daemon.sh
