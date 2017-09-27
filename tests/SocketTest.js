var express = require('express');  
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);

app.use(express.static(__dirname + '/bower_components'));  
app.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});

server.listen(4200); 


io.on('connection', function(client) {  
    console.log('Client connected...');

    client.on('join', function(data) {
        console.log(data);
    });
});




var video_socket = io.of('/video');
video_socket.on("connection", function( client ) {
	console.log("video_socket client joined")


    client.on('join', function(data) {
        console.log(data);
    });

	client.on("greeting", function(msg) {
		console.log("greetng", msg)
	});

    var loop = function() {
    	client.emit("tick", ""+Date.now());
    	setTimeout(loop, 500);
    }
    loop();
});
