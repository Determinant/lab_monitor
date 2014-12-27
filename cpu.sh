#!/bin/bash
export JMNAME='CPU'
export JTYPE='linegraph'
function trigger {
    $CLIENT --add "$JID" $(python -c $'import psutil\nimport time\ntime.sleep(1)\nprint psutil.cpu_percent()')
}
export -f trigger
./monitor_daemon.sh
