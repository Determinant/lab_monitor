#!/bin/bash
export JMNAME='CPU'
export JTYPE='linegraph'
function trigger {
$CLIENT --add "$JID" $(python -c $'import psutil\nimport time\nprint " ".join([str(i) for i in psutil.cpu_percent(1, True)])')
}
export -f trigger
./monitor_daemon.sh
