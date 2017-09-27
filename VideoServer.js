require('dotenv').config({ silent: true }); 
var debug = require('debug')('app');
var express = require('express');  
var app = express();  
var logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
var server = require('http').createServer(app);  
var io = require('socket.io')(server);
var hbs = require('hbs');
var mongoose = require('mongoose');
var fs = require("fs");
const path = require('path');
const util = require('util');
const favicon = require('serve-favicon');
var SpeechToText = require('./modules/SpeechToText');
var Video = require('./Video')
const randomWord = require('random-word');

mongoose.Promise = global.Promise;
var db_url = 'mongodb://localhost:27017/nola300-client';
mongoose.connect(db_url, {useMongoClient: true}, function(err){
    if(err) throw("couldn't connect to", db_url);
    else debug("connected to", db_url);
});




// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.set('view options', { layout: 'layout' });

app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.png')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

hbs.registerHelper("join", function( array, sep ) {
    return array.join( sep );
});

hbs.registerHelper('json', function(obj) {
    debug(JSON.stringify(obj));
    return JSON.stringify(obj);
});


server.listen(4200); 





var blacklist = [];
var playlist = [];
var query = {
    "file_present": true, 
    "_id": { $nin: blacklist } 
};
Video.find(query).limit(100).exec((err, docs) => {
    if(err) return debug(err);
    playlist = docs.map(function(doc){ return doc.as_playlist(); })
});




var player_socket = io.of('/player');
player_socket.on("connection", function( client ) {
	debug("player_socket client joined")

    client.emit("playlist", playlist);

    client.on('greeting', function(data) {
        debug(data);
    });

	client.on("blacklist", function(msg) {
		debug("blacklist", msg)
        if(blacklist.indexOf(msg) > -1) {
            debug("warning: video is already blacklisted.")
        } else {
           blacklist.push(msg);
            debug(blacklist); 
        }
	});

    var loop = function() {
    	client.emit("tick", Date.now());
    	setTimeout(loop, 1000);
    }
    loop();
});


var send_word = function() {
    var message = {
        text: randomWord()
    };
    debug(message);
    player_socket.emit("text", message);

    var t = 2000 + Math.random() * 5000;
    setTimeout(send_word, t);
};
send_word();




var SpeechToText = require('./modules/SpeechToText');
SpeechToText.start();
SpeechToText.on("sentence", function(sentence){
    debug(util.inspect(sentence, {depth: 5}));
   
});

