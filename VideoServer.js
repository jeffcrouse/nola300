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
    //debug(message);
    player_socket.emit("text", message);

    var t = 2000 + Math.random() * 5000;
    setTimeout(send_word, t);
};
send_word();



var n = 0;

var lines = [
    ["NUM", "TEXT", "SETIMENT", "KEYWORDS", "ENTITIES", "EMOTIONS", "CONCEPTS"]
];

var SpeechToText = require('./modules/SpeechToText');
SpeechToText.start();
SpeechToText.on("sentence", function(sentence){
    debug(util.inspect(sentence, {depth: 10}));

    
    var sentiment = null;
    var keywords = null;
    var entities = null;
    var emotion = null;
    var concepts = null;

    if(sentence.nlu) {
        var nlu = sentence.nlu;
        if(nlu.sentiment) {
            var doc = nlu.sentiment.document;
            sentiment = Math.round(doc.score*100) + "% " + doc.label;
        }
        if(nlu.keywords) {
            keywords = nlu.keywords.map(x => { return `${Math.round(x.relevance*100)}% ${x.text}`; }).join("\n");
        }
        if(nlu.entities) {
            entities = nlu.entities.map(x => { return `${Math.round(x.relevance*100)}% ${x.text} (${x.type})`; }).join("\n");
        }
        if(nlu.emotion) {
            var e = nlu.emotion.document.emotion;
            emotion = Object.keys(e).map(x => { return `${Math.round(e[x]*100)}% ${x}`; }).join("\n");
        }
        if(nlu.concepts) {
            concepts = nlu.concepts.map(x => { return `${Math.round(x.relevance*100)}% ${x.text}`; }).join("\n");
        }
    }

    lines.push([n, sentence.text, sentiment, keywords, entities, emotion, concepts]);
    debug(lines[lines.length-1]);
    n++;
});

var filename = "013 Sabreen.csv";
var save_file = (done) => {
    var text = "";
    lines.forEach( line => {
    	console.log(line);
    	text += line.map(function(val){ return `"${val}"`; }).join(",") + "\r\n";
    });
    fs.writeFile(filename, text, done); 
}

var graceful_exit = function() {
	debug("saving file");
    SpeechToText.stop();
    save_file( err => {
        process.exit(0);
    });
}

process.on('SIGTERM', graceful_exit);
process.on('SIGINT', graceful_exit);
