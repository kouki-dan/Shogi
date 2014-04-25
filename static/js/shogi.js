
var updater = {
    socket: null,

    start: function() {
    },

    showMessage: function(message) {
    }
};

window.addEventListener("load",function(){
  var grid_path = STATIC_URL + "images/grid.png";
  var board = document.getElementById("shogi");
  board.style.width = "720px";
  board.style.height = "720px";
  for(var y = 0; y < 9; y++){
    for(var x = 0; x < 9; x++){
      var img = new Image();
      img.src = grid_path;
      img.style.float = "left";
      board.appendChild(img);
    }
  }


  var url = "ws://" + location.host + "/shogisocket";
  socket = new WebSocket(url);
  socket.onmessage = function(event) {
    console.log(JSON.parse(event.data));
  }


},true);


