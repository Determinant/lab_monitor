import time, json, os, re
import logging, threading
from socket import socket, AF_UNIX, SHUT_WR, error as SocketError
from struct import pack, unpack
from time import sleep
from tornado import gen
from tornado.ioloop import IOLoop
from tornado.web import RequestHandler, Application, url, StaticFileHandler
from rwlock import RWLock

logging.basicConfig(level=logging.DEBUG, format='[%(levelname)s] (%(threadName)-10s) %(message)s',)
MAX_LENGTH = 2048
MAX_RECORDS = 32
PORT = 2333
lock = RWLock()
local_socket_address = "./lab_monitor.socket"
cmd_socket = None
stat_res = {}
is_exiting = threading.Event()
id_cnt = 0
reclaimed_ids = []

class ActionError(Exception):
    pass

def add_monitor(mesg):
    if len(reclaimed_ids):
        jid = reclaimed_ids.pop()
    else:
        global id_cnt
        jid = id_cnt
        id_cnt += 1
    if mesg.has_key("name"):
        name = mesg["name"]
    else:
        name = "monitor-{0}".format(jid)
    metadata = None
    if mesg.has_key("metadata"):
        metadata = mesg["metadata"]
    stat_res[jid] = {"name": name, "records": [],
                    "rcnt": 0, "jid": jid, "metadata": metadata}
    return json.dumps(jid)

def del_monitor(mesg):
    mid = check_id(mesg)
    del stat_res[mid]
    reclaimed_ids.append(mid)
    return ""

def check_id(mesg):
    if mesg.has_key("jid"):
        try:
            jid = int(mesg["jid"])
        except ValueError:
            raise ActionError("invalid value of jid field")
    else:
        raise ActionError("jid field not specified")
    if not stat_res.has_key(jid):
        raise ActionError("the jid does not exist")
    logging.debug("jid: {0}".format(jid))
    return jid

def add_record(mesg):
    mid = check_id(mesg)
    if mesg.has_key("record"):
        rec = stat_res[mid]["records"]
        while len(rec) >= MAX_RECORDS:
            rec.pop(0)
        rec.append({'rid': stat_res[mid]["rcnt"], 'rec': mesg["record"]})
        stat_res[mid]["rcnt"] += 1
    return ""
def alter_records(mesg):
    mid = check_id(mesg)
    if mesg.has_key("records"):
        stat_res[mid]["records"] = mesg["records"]
    return ""
def clear_records(mesg):
    mid = check_id(mesg)
    stat_res[mid]["records"] = []
    return ""

action_map = {"create": add_monitor,
                "drop": del_monitor,
                "add": add_record,
                "clear": clear_records,
                "alter": alter_records}

def command_server():
    global c, cmd_socket, is_exiting
    try:
        os.unlink(local_socket_address)
    except OSError:
        if os.path.exists(local_socket_address):
            raise
    cmd_socket = socket(AF_UNIX)
    cmd_socket.bind(local_socket_address)
    cmd_socket.listen(5)
    while not is_exiting.isSet():
        logging.debug("accepting")
        (conn, addr) = cmd_socket.accept()
        logging.debug("accepted")
        received = conn.recv(4)
        if not received:
            continue
        length, = unpack("<i", received)
        if length <= 0 or length > MAX_LENGTH:
            logging.debug("invalid header: {0}".format(length))
            conn.close() # invalid header
            continue
        try:#
            mesg = json.loads(conn.recv(length))
            if not isinstance(mesg, dict):
                logging.debug("not a javascript object")
                continue
            if not mesg.has_key("action"):
                raise ActionError("action not specified")
            logging.debug("action: {0}".format(mesg["action"]))
            try:
                lock.acquire_write()
                conn.send(action_map[mesg["action"]](mesg))
            finally:
                lock.release()
        except ValueError:
            logging.debug("malformed json string")
        except ActionError as e:
            logging.debug(e)
        except KeyError as e:
            logging.debug("action not found: {0}".format(mesg["action"]))
        except SocketError as e:
            logging.debug("socket error: {0}".format(e))
        finally:
            conn.close()

cmd = threading.Thread(target=command_server)
cmd.setDaemon(True)
cmd.start()

def cmd_shutdown():
    global is_exiting, cmd_socket, local_socket_address, cmd
    is_exiting.set();
    cmd_socket.close()
    socket(AF_UNIX).connect(local_socket_address)
    cmd.join()
class AJAXHandler(RequestHandler):
    @gen.coroutine
    def get(self):
        try:
            def grab_lock(self, callback=None):
                lock.acquire_read()
                self.write(stat_res)
                callback()
            yield gen.Task(grab_lock, self)
        finally:
            lock.release()
try:
    app = Application([url(r"/ajax", AJAXHandler),
                        url(r'/()', StaticFileHandler, {'path': "./index.html"}),
                        url(r'/(.*)', StaticFileHandler, {'path': "./"})])
    app.listen(PORT)
    IOLoop.current().start()
except KeyboardInterrupt:
    cmd_shutdown()
