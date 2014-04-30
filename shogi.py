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
      person.write_message({"aa":"aa"})

  def remove(self, exited_person):
    for person in self.persons:
      if not person == exited_person:
        person.write_message({"aa":"Someone exited"})
        self.persons.remove(exited_person)

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
    self.joining_room = None
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
    else:
      lobby.remove(self)
    ShogiSocketHandler.waiters.remove(self)

  @classmethod
  def send_updates(cls, chat):
    logging.info("sending message to %d waiters", len(cls.waiters))
    for waiter in cls.waiters:
      try:
        waiter.write_message(chat)
      except:
        logging.error("Error sending message", exc_info=True)

  def on_message(self, message):
    message = tornado.escape.json_decode(message)
    if(message["type"] == "initialize"):
      self.password = message["password"]
      ShogiSocketHandler.lobby.add(message,self)
    else:
      room.on_message(message)


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

