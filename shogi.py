#!/usr/local/bin/python3

import os.path
from collections import defaultdict
import uuid

import tornado.auth
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket

from tornado.options import define, options

define("port", default=8888, help="run on the given port", type=int)

class HomeHandler(tornado.web.RequestHandler):
  def get(self):
    self.render("index.html")


class Room(object):
  """
    socket.send('{"type":"initialize","password":"aa"}')
  """  
  def __init__(self, persons):
    self.persons = persons
    self.id = uuid.uuid4()
    for person in self.persons:
      person.joining_room = self

    self.broadcast({"type":"joined room",
      "members":[person.id for person in self.persons],
      })

  def remove(self, exited_person):
    for person in self.persons:
      if not person == exited_person:
        person.write_message({"aa":"Someone exited"})
        self.persons.remove(exited_person)

  def on_message(self, message, sender):
    """
      socket.send('{"type":"move koma","password":"aa"}')
    """
    if(message.get("type") == "move koma"):
      self.movedKoma(message, sender)
    if(message.get("type") == "turnover koma"):
      self.turnoverKoma(message, sender)
    if(message.get("type") == "turnback koma"):
      self.turnbackKoma(message, sender)

  def movedKoma(self, message, sender):
    send_data = {}
    send_data["type"] = "move koma"
    send_data["sender_id"] = sender.id
    send_data["koma_id"] = message["koma_id"]
    send_data["move_to_x"] = message["move_to_x"]
    send_data["move_to_y"] = message["move_to_y"]
    print(str(send_data))
    self.broadcast(send_data, sender=sender)

  def turnoverKoma(self, message, sender):
    send_data = {}
    send_data["type"] = "turnover koma"
    send_data["sender_id"] = sender.id
    send_data["koma_id"] = message["koma_id"]
    send_data["promoted"] = message["promoted"]
    print(str(send_data))
    self.broadcast(send_data, sender=sender)

  def turnbackKoma(self, message, sender):
    send_data = {}
    send_data["type"] = "turnback koma"
    send_data["sender_id"] = sender.id
    send_data["koma_id"] = message["koma_id"]
    send_data["direction"] = message["direction"]
    print(str(send_data))
    self.broadcast(send_data, sender=sender)

  def broadcast(self, message, sender=None):
    for person in self.persons:
      if not person == sender:
        person.write_message(message)

  def output_now_status(self):
    print("ROOM:"+str(self.id))
    for person in self.persons:
      print(person)
    print("---------")

class Lobby(object):
  def __init__(self):
    self.passwords = defaultdict(list)
  def add(self, message, person):
    password = message["password"]
    self.passwords[password].append(person)
    if(len(self.passwords[password]) >= 2):
      room = Room(self.passwords[password])
      del self.passwords[password]
      ShogiSocketHandler.rooms.append(room)

  def remove(self, exited_person):
    self.passwords[exited_person.password].remove(exited_person)
    if(len(self.passwords[exited_person.password]) == 0):
      del self.passwords[exited_person.password]

  def output_now_status(self):
    print("Lobby")
    for password in self.passwords:
      print("Password:" + password)
      for person in self.passwords[password]:
        print(person)
    print("==================")
  


class ShogiSocketHandler(tornado.websocket.WebSocketHandler):
  rooms = []
  lobby = Lobby()
  waiters = set()
  def __init__(self, *args, **kwargs):
    super(ShogiSocketHandler, self).__init__(*args, **kwargs)
    self.id = str(uuid.uuid4())
    self.joining_room = None
    self.initialized = False
    ShogiSocketHandler.lobby.output_now_status()
    for room in ShogiSocketHandler.rooms:
      room.output_now_status()

  def allow_draft76(self):
    # for iOS 5.0 Safari
    return True

  def open(self):
    ShogiSocketHandler.waiters.add(self)

  def on_close(self):
    if self.joining_room:
      self.joining_room.remove(self)
    elif self.initialized:
      ShogiSocketHandler.lobby.remove(self)
    ShogiSocketHandler.waiters.remove(self)
    print(str(self) + " exited")

  def on_message(self, message):
    message = tornado.escape.json_decode(message)
    if(message["type"] == "initialize" and not self.initialized ):
      #TODO:Add function which can be initialized only once when completed
      self.password = message["password"]
      ShogiSocketHandler.lobby.add(message, self)
      self.write_message({"type":"initialize",
        "status":"complete",
        "id":self.id,
        "password":self.password,
        })
      self.initialized = True

    if(self.joining_room and self.initialized):
      self.joining_room.on_message(message,sender=self)


class Application(tornado.web.Application):
  def __init__(self):
    handlers = [
        (r"/", HomeHandler),
        (r"/shogisocket", ShogiSocketHandler),
        ]
    settings = dict(
        template_path=os.path.join(os.path.dirname(__file__), "templates"),
        static_path=os.path.join(os.path.dirname(__file__), "static"),
        xsrf_cookies=True,
        cookie_secret="SECRET",
        login_url="/auth/login",
        debug=True,
        )
    tornado.web.Application.__init__(self, handlers, **settings)


def main():
    tornado.options.parse_command_line()
    http_server = tornado.httpserver.HTTPServer(Application())
    http_server.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    main()

