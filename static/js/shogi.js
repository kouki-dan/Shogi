
var KOMA_TYPES = {
  "king":["king","king"], //王
  "rook":["rook","promoted_rook"], //飛車
  "bishop":["bishop","promoted_bishop"], //角
  "gold":["gold","gold"], //金
  "silver":["silver","promoted_silver"], //銀
  "knight":["knight","promoted_knight"], //馬
  "lance":["lance","promoted_lance"], //香車
  "pawn":["pawn","promoted_pawn"] //歩
}

var Koma = function(koma_type){
  if(typeof koma_type == "string"){
    koma_type = KOMA_TYPES[koma_type]
  }
  if(koma_type == undefined){
    throw "koma_type "+koma_type+" is not defined"
  }
  this.id = Koma.generateId();
  this.koma_img_path = STATIC_URL + "images/" + koma_type[0] + ".png";
  this.koma = new Image();
  this.koma.width = 80
  this.koma.src = this.koma_img_path;

  this.promoted_koma_img_path = STATIC_URL + "images/" + koma_type[1] + ".png";
  this.promoted_koma = new Image();
  this.promoted_koma.width = 80
  this.promoted_koma.src = this.promoted_koma_img_path;

  this.promoted = false;
  this.direction = true;

  this.elm = document.createElement("div");
  this.elm.appendChild(this.koma);

  this.draggable();
};
Koma.prototype.turnover = function(promoted){
  var send = true;
  if(promoted != undefined){
    this.promoted = promoted;
    send = false;
  }
  else{
    this.promoted = !this.promoted;
  }

  if(this.promoted){
    this.elm.appendChild(this.promoted_koma);
    this.elm.removeChild(this.koma);
  }
  else{
    this.elm.appendChild(this.koma);
    this.elm.removeChild(this.promoted_koma);
  }

  if(send){
    socket.send(JSON.stringify({
      "type":"turnover koma",
      "koma_id":this.id,
      "promoted":this.promoted,
    }));
  }
  
};
Koma.prototype.turnback = function(direction){
  var send = true;
  if(direction != undefined){
    this.direction = direction;
    send = false;
  }
  else{
    this.direction = !this.direction;
  }

  if(this.direction){
    this.elm.style.webkitTransform = "rotate(0deg)";
    this.elm.style.mozTransform = "rotate(0deg)";
  }
  else{
    this.elm.style.webkitTransform = "rotate(180deg)";
    this.elm.style.mozTransform = "rotate(180deg)";
  }

  if(send){
    socket.send(JSON.stringify({
      "type":"turnback koma",
      "koma_id":this.id,
      "direction":this.direction,
    }));
  }
};
Koma.prototype.dragend = function(e){
  console.log("dragend");
  socket.send(JSON.stringify({
    "type":"move koma",
    "koma_id":this.id,
    "move_to_x":this.elm.style.left,
    "move_to_y":this.elm.style.top,
  }));
};
Koma.prototype.draggable = function(){
  (function(){
    var that = this;
    var dragging = false;
    var x, y, offsetX, offsetY;
    this.elm.style.position = "absolute";
    this.elm.addEventListener("mousedown",function(e){
      e.preventDefault();
      dragging = true;
      offsetX = (that.elm.getBoundingClientRect().left + scrollX) - e.pageX;
      offsetY = (that.elm.getBoundingClientRect().top + scrollY) - e.pageY;
    },true);
    window.addEventListener("mousemove",function(e){
      if(!dragging){
        return;
      }
      var x = e.pageX + offsetX + "px";
      var y = e.pageY + offsetY + "px";
      that.moveTo(x, y);
    },true);
    window.addEventListener("mouseup",function(e){
      if(dragging){
       if(that.dragend){
         that.dragend(e);
       }
      }
      dragging = false;
    },true);
  }).call(this);
};
Koma.prototype.moveTo = function(x,y){
  this.elm.style.left = x;
  this.elm.style.top = y;
  if(this != Koma.prevMovedKoma){
    Koma.prevMovedKoma = this;
    Koma.prevZIndex++;
    this.elm.style.zIndex = Koma.prevZIndex;
  }
};
Koma.prototype.getPosition = function(){
  return {
    "x":this.elm.style.left,
    "y":this.elm.style.top,
  };
};
Koma.prevMovedKoma;
Koma.prevZIndex = 0;
Koma.generateId = function(){
  Koma._nowId++;
  return Koma._nowId.toString();
}
Koma._nowId = 0;


function makeImg(path, width, height){
  var img = new Image();
  img.src = path;
  img.className = "nonedrag";
  if(width){
    img.width = width;
  }
  if(height){
    img.height = height;
  }
  return img;
}

window.addEventListener("load",function(){
  var grid_path = STATIC_URL + "images/grid.png";
  var board = document.getElementById("shogi");
  board.style.width = "720px";
  board.style.height = "720px";

  var turns = document.createElement("div");
  turns.style.position = "fixed";
  turns.style.bottom = "0px";
  turns.style.right = "0px";
  var turnover = document.createElement("div");
  turnover.innerText = "ひっくり返る";
  turnover.addEventListener("click",function(){
    if(Koma.prevMovedKoma){
      Koma.prevMovedKoma.turnover();
    }
  },true);
  turns.appendChild(turnover);
  var turnback = document.createElement("div");
  turnback.innerText = "うらぎる";
  turnback.addEventListener("click",function(){
    if(Koma.prevMovedKoma){
      Koma.prevMovedKoma.turnback();
    }
  },true);
  
  turns.appendChild(turnback);

  document.body.appendChild(turns);

  var img = makeImg(grid_path,700,80);
  board.appendChild(img);
  for(var y = 0; y < 9; y++){
    for(var x = 0; x < 9; x++){
      var img = makeImg(grid_path);
      img.style.float = "left";
      board.appendChild(img);
    }
  }
  var img = makeImg(grid_path, 700, 80);
  board.appendChild(img);
 

  var koma_field = [
  ["lance","knight","silver","gold","king","gold","silver","knight","lance"],
  ["","bishop","","","","","","rook",""],
  ["pawn","pawn","pawn","pawn","pawn","pawn","pawn","pawn","pawn"],
  [],
  [],
  [],
  ["pawn","pawn","pawn","pawn","pawn","pawn","pawn","pawn","pawn"],
  ["","rook","","","","","","bishop",""],
  ["lance","knight","silver","gold","king","gold","silver","knight","lance"]];

  var koma_map = {}
  for(var y = 0; y < koma_field.length; y++){
    for(var x = 0; x < koma_field[y].length; x++){
      if(koma_field[y][x] != ""){
        var koma = new Koma(koma_field[y][x]);
        document.body.appendChild(koma.elm);
        koma_map[koma.id] = koma;

        koma.moveTo(80*x+10+"px", 80*y+200+"px");
        if(y <= 3){
          koma.turnback(false);
        }
      }
    }
  }

  var url = "ws://" + location.host + "/shogisocket";
  socket = new WebSocket(url);
  socket.onmessage = function(event) {
    console.log(JSON.parse(event.data));
    var data = JSON.parse(event.data);
    if(data["type"] == "initialize"){
      if(data["status"] == "complete"){
        console.log("Connected");
        document.getElementById("url").value = ""+location.href+"?id="+data["password"];
      }
      else{
        alert("Connection Failed");
      }
    }
    if(data["type"] == "joined room"){
      if(data["parent"] == false){
        socket.send(JSON.stringify({"type":"request koma's position"}))
      }
    }
    if(data["type"] == "move koma"){
      var koma = koma_map[data["koma_id"]];
      koma.moveTo(data["move_to_x"],data["move_to_y"]);
    }
    if(data["type"] == "turnover koma"){
      var koma = koma_map[data["koma_id"]];
      koma.turnover(data["promoted"]);
    }
    if(data["type"] == "turnback koma"){
      var koma = koma_map[data["koma_id"]];
      koma.turnback(data["direction"]);
    }
    if(data["type"] == "request koma's position"){
      var komas_position = {};
      komas_position["positions"] = {}
      for(var koma_id in koma_map){
        komas_position["positions"][koma_id] = koma_map[koma_id].getPosition();
      }
      komas_position["type"] = "koma's position data";
      socket.send(JSON.stringify(komas_position));
    }
    if(data["type"] == "koma's position data"){
      for(var koma_id in data["positions"]){
        var x = data["positions"][koma_id]["x"];
        var y = data["positions"][koma_id]["y"];
        koma_map[koma_id].moveTo(x, y);
      }
    }
  }
  var query = getQueryString();
  
  var password = query["id"] || uuid();
  socket.onopen = function(){
    socket.send(JSON.stringify({
      "type":"initialize",
      "password":password
    }));
  };

},true);


var uuid = function(){
  var S4 = function() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
}

function getQueryString()
{
  var result = {};
  if(1 < window.location.search.length){
    var query = window.location.search.substring( 1 );
    var parameters = query.split('&');

    for(var i = 0; i < parameters.length; i++){
      var element = parameters[ i ].split( '=' );
      var paramName = decodeURIComponent( element[ 0 ] );
      var paramValue = decodeURIComponent( element[ 1 ] );
      result[ paramName ] = paramValue;
    }
  }
  return result;
}

