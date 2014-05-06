
var updater = {
    socket: null,

    start: function() {
    },

    showMessage: function(message) {
    }
};

var KOMA_TYPES = {
  "king":["king","king"], //王
  "rook":["rook","promoted_rook"], //飛車
  "bishop":["bishop","promoted_bishop"], //角
  "gold_general":["gold","gold"], //金
  "silver_general":["silver","promoted_silver"], //銀
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
  this.id = uuid();
  this.koma_img_path = STATIC_URL + "images/" + koma_type[0] + ".png";
  this.koma = new Image();
  this.koma.width = 80
  this.koma.src = this.koma_img_path;

  this.promoted_koma_img_path = STATIC_URL + "images/" + koma_type[1] + ".png";
  this.promoted_koma = new Image();
  this.promoted_koma.width = 80
  this.promoted_koma.src = this.promoted_koma_img_path;

  this.promoted = false;

  this.elm = document.createElement("div");
  this.elm.appendChild(this.koma);

  this.draggable();
};
Koma.prototype.turnOver = function(){
  this.promoted = !this.promoted;
  if(this.promoted){
    //TODO:komaの位置にpromoted_komaを挿入
    this.elm = this.promoted_koma;
  }
  else{
    //TODO:promoted_komaの位置にkomaを挿入
    this.elm = this.koma;
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
    var x,y,offsetX,offsetY;
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
      that.elm.style.top = e.pageY + offsetY + "px";
      that.elm.style.left = e.pageX + offsetX + "px";

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
 

  var koma = new Koma("pawn");
  document.body.appendChild(koma.elm);

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
    if(data["type"] == "move koma"){
      //TODO:move many koma 
      koma.elm.style.top = data["move_to_y"];
      koma.elm.style.left = data["move_to_x"];
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

