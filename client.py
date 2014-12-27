from socket import socket, AF_UNIX
from struct import pack, unpack
from sys import stdout, stdin
import argparse
import json
parser = argparse.ArgumentParser()
parser.add_argument('--create')
parser.add_argument('--add')
parser.add_argument('--clear')
parser.add_argument('--drop')
parser.add_argument('--alter')
parser.add_argument('--type')
parser.add_argument('col', nargs='*')
args = parser.parse_args()

def check_id(val):
    try:
        return int(val)
    except ValueError:
        print('invalid mid value')
        exit(1)

if __name__ == '__main__':
    if args.create:
        cmd = {'action': 'create'}
        if len(args.create) >= 1:
            cmd["name"] = args.create
        if args.type is None:
            print('please specify a type')
            exit(1)
        cmd["metadata"] = {'type' : args.type}
    elif args.add:
        cmd = {'action': 'add', 'jid': check_id(args.add), 'record' : args.col}
    elif args.clear:
        cmd = {'action': 'clear', 'jid': check_id(args.clear)}
    elif args.drop:
        cmd = {'action': 'drop', 'jid': check_id(args.drop)}
    elif args.alter:
        cmd = {'action': 'alter', 'jid': check_id(args.alter),
                'records' : [l[:-1].split() for l in stdin.readlines()]}
    else:
        print('please specify an action')
        exit(1)

    s = socket(AF_UNIX)
    s.connect("./lab_monitor.socket")
    mesg = json.dumps(cmd)
    mesg = pack("<i", len(mesg)) + mesg
    s.send(mesg)
    stdout.write(s.recv(1024))
    s.close()
