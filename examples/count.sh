#!/bin/bash
export JMNAME='COUNTER'
export JTYPE='linegraph'
i=1
function trigger {
    $CLIENT --add "$JID" "$i"
    let i=i+10000
}
export -f trigger
./monitor_daemon.sh
