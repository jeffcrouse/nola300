require('dotenv').config({ silent: true }); 
var debug = require('debug')('app');
var express = require('express');
const path = require('path');
const util = require('util');
const favicon = require('serve-favicon');
var logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
var socketio = require('socket.io');
var mongoose = require('mongoose');
var storage = require('node-persist');
var _ = require('underscore');
const { check, validationResult } = require('express-validator/check');
const { matchedData } = require('express-validator/filter');
var fs = require("fs");
const mkdirp = require('mkdirp');
var shortid = require('shortid');
var Video = require('./Video')
const async = require('async');
var hbs = require('hbs');
var SpeechToText = require('./modules/SpeechToText');
var EntitiesList = require('./modules/EntitiesList');


/*
┬┌┐┌┬┌┬┐┬┌─┐┬  ┬┌─┐┌─┐
│││││ │ │├─┤│  │┌─┘├┤ 
┴┘└┘┴ ┴ ┴┴ ┴┴─┘┴└─┘└─┘
*/
async.each([process.env.STORAGE_ROOT, process.env.VIDEO_ROOT], mkdirp, function(err){
	if(err) debug(err);
})


var postprocess = require("./modules/PostProcess");
async.forever(postprocess, err => {
	debug("postprocess returned an error:", err);
});


storage.initSync({dir: "persist"});




/*
┌┬┐┌─┐┌┬┐┌─┐┌┐ ┌─┐┌─┐┌─┐
 ││├─┤ │ ├─┤├┴┐├─┤└─┐├┤ 
─┴┘┴ ┴ ┴ ┴ ┴└─┘┴ ┴└─┘└─┘
*/

mongoose.Promise = global.Promise;
var db_url = 'mongodb://localhost:27017/nola300-client';
mongoose.connect(db_url, {useMongoClient: true}, function(err){
	if(err) throw("couldn't connect to", db_url);
	else debug("connected to", db_url);
});





/*
┌─┐┌─┐┌─┐
├─┤├─┘├─┘
┴ ┴┴  ┴  
*/

var app = express();
var io = socketio();
app.io = io;

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

debug("ENV =", app.get('env'));

app.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

hbs.registerHelper("join", function( array, sep ) {
    return array.join( sep );
});

hbs.registerHelper('json', function(obj) {
	debug(JSON.stringify(obj));
	return JSON.stringify(obj);
});



/*****************************************************************************************
 ▄▄▄▄▄▄▄▄▄▄▄  ▄▄        ▄  ▄▄▄▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄  
▐░░░░░░░░░░░▌▐░░▌      ▐░▌▐░░░░░░░░░░▌ ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░▌ 
▐░█▀▀▀▀▀▀▀█░▌▐░▌░▌     ▐░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌
▐░▌       ▐░▌▐░▌▐░▌    ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌
▐░▌       ▐░▌▐░▌ ▐░▌   ▐░▌▐░█▄▄▄▄▄▄▄█░▌▐░▌       ▐░▌▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄█░▌▐░▌       ▐░▌
▐░▌       ▐░▌▐░▌  ▐░▌  ▐░▌▐░░░░░░░░░░▌ ▐░▌       ▐░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌
▐░▌       ▐░▌▐░▌   ▐░▌ ▐░▌▐░█▀▀▀▀▀▀▀█░▌▐░▌       ▐░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀█░█▀▀ ▐░▌       ▐░▌
▐░▌       ▐░▌▐░▌    ▐░▌▐░▌▐░▌       ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌▐░▌     ▐░▌  ▐░▌       ▐░▌
▐░█▄▄▄▄▄▄▄█░▌▐░▌     ▐░▐░▌▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄█░▌▐░▌       ▐░▌▐░▌      ▐░▌ ▐░█▄▄▄▄▄▄▄█░▌
▐░░░░░░░░░░░▌▐░▌      ▐░░▌▐░░░░░░░░░░▌ ▐░░░░░░░░░░░▌▐░▌       ▐░▌▐░▌       ▐░▌▐░░░░░░░░░░▌ 
 ▀▀▀▀▀▀▀▀▀▀▀  ▀        ▀▀  ▀▀▀▀▀▀▀▀▀▀   ▀▀▀▀▀▀▀▀▀▀▀  ▀         ▀  ▀         ▀  ▀▀▀▀▀▀▀▀▀▀  
*****************************************************************************************/                                                                                        

//var Story = require('./modules/Story_nodb')

var onboard_socket = io.of('/onboard');

app.get('/onboard', function(req, res, next) {
	var data = {
		layout: false,
		places: EntitiesList.places,
		items: EntitiesList.items,
		themes: EntitiesList.themes
	}
	res.render('onboard', data);
});


var valid = [
	check('fname').exists().isLength({ min: 2, max: 20 }).withMessage('Please provide a valid first name'), 
	check('lname').exists().isLength({ min: 2, max: 30 }).withMessage('Please provide a valid last name'), 
	check('email').exists().isEmail().withMessage('Please provide a valid email address'),
	check('entities.*').exists() // TODO: make sure there are at least 2 entities selected.
];

app.post('/onboard', valid, function(req, res, next) {
	debug("req.body", req.body);

	try {
		storage.getItem("story", (err, item) => {
			if(item) throw "story still in progress.";

			// Validate post request
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				throw errors.array().map(item => { return item.msg; }).join(",");
			}

			var data = matchedData(req); 

			booth_socket.emit("set_name", data.fname+" "+data.lname);
			onboard_socket.emit("submit_status", "wait");
			onboard_socket.emit("reset_form");

			prepopulate_playlist( data );

			storage.setItem("story", data, err => {
				if(err) throw err;
				res.json({status: "OK"});
			});
		});
	} catch(e) {
		debug("catch", e);
		return res.status(422).send(e);
	}	
});


onboard_socket.on("connection", function( socket ) {
	debug("onboard socket client joined")

	storage.getItem("story").then(story => {
		var status = (story) ? "wait" : "ready";
		onboard_socket.emit("submit_status", status);
	});
});








/****************************************************************
 ▄▄▄▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄         ▄ 
▐░░░░░░░░░░▌ ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌
▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌ ▀▀▀▀█░█▀▀▀▀ ▐░▌       ▐░▌
▐░▌       ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌     ▐░▌     ▐░▌       ▐░▌
▐░█▄▄▄▄▄▄▄█░▌▐░▌       ▐░▌▐░▌       ▐░▌     ▐░▌     ▐░█▄▄▄▄▄▄▄█░▌
▐░░░░░░░░░░▌ ▐░▌       ▐░▌▐░▌       ▐░▌     ▐░▌     ▐░░░░░░░░░░░▌
▐░█▀▀▀▀▀▀▀█░▌▐░▌       ▐░▌▐░▌       ▐░▌     ▐░▌     ▐░█▀▀▀▀▀▀▀█░▌
▐░▌       ▐░▌▐░▌       ▐░▌▐░▌       ▐░▌     ▐░▌     ▐░▌       ▐░▌
▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄█░▌     ▐░▌     ▐░▌       ▐░▌
▐░░░░░░░░░░▌ ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌     ▐░▌     ▐░▌       ▐░▌
 ▀▀▀▀▀▀▀▀▀▀   ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀       ▀       ▀         ▀ 
****************************************************************/

var CountdownTimer = require('./modules/CountdownTimer')
var CanonCamera = require('./modules/CanonCamera')	
var FootPedal = require('./modules/FootPedal')				// Singleton
var OnAirSign = require('./modules/OnAirSign')				// Singleton

var cam0 = new CanonCamera("0");
var cam1 = new CanonCamera("1");
var booth_socket = io.of('/booth');
var session_in_progress = false;
var starting = false;
var ending = false;


var start_session = function() {
	debug("start_session");
	var story = null;

	var get_story = done => {
		storage.getItem("story", (err, item) => {
			if(err) return done(err);
			if(!item) return done("no story present. ignoring.");
			story = item;
			done(null);
		});
	}

	var update_story = done => {
		story.start = Date.now();
		story.sentences = [];
		story.location = process.env.NOLA_LOCATION;
		storage.setItem("story", story, done);
	}

	var start_devices = done => {
		async.parallel([cam0.record.bind(cam0, null), cam1.record.bind(cam0, null), SpeechToText.start, OnAirSign.on], done); 
	}

	starting = true;
	async.series([get_story, update_story, start_devices], err => {
		starting = false;
		if(err) return debug(err);

		timer.begin(120000);
		debug("session_in_progress=true");
		session_in_progress = true;
	});
}


var end_session = function() {
	debug("end_session");
	timer.stop();
	booth_socket.emit("set_message", "thank you");
	
	var story = null;
	var directory = null;

	var get_story = done => {
		debug("get_story");
		storage.getItem("story", (err, item) => {
			if(err) return done(err);
			if(!item) return done("no story present. ignoring.");

			story = item;
			story.id = shortid.generate();
			story.end = Date.now();
			story.duration = story.end - story.start;

			directory = path.join(process.env.STORAGE_ROOT, story.id);
			done(null);
		});
	}
		
	var mkdir = done => {
		debug("mkdir", directory);
		mkdirp(directory, done);
	}

	var stop_devices = done => {
		debug("stop_devices");
		var stop_0 = (cb) => { cam0.stop(`${directory}/vid_00.mp4`, cb); }
		var stop_1 = (cb) => { cam1.stop(`${directory}/vid_01.mp4`, cb); }
		async.parallel([stop_0, stop_1, SpeechToText.stop, OnAirSign.off], done);
	}

	var save_to_file = done => {
		debug("save_to_file");
		var data_file = path.join(directory, "info.json");
		var data = JSON.stringify(story, null, 4);
		return fs.writeFile(data_file, data, 'utf8', done);
	}

	var remove_from_storage = done => {
		debug("remove_from_storage");
		storage.removeItem("story", done);
	}
	
	var wait_5 = done => {
		debug("wait_5");
		setTimeout(done, 5000);
	}

	ending = true;
	async.series([get_story, mkdir, stop_devices, save_to_file, remove_from_storage, wait_5], (err) => {
		ending = false;
		if(err) return debug(err);

		clear_playlist();
		booth_socket.emit("reset");
		onboard_socket.emit("submit_status", "ready");
		debug("session_in_progress=false");
		session_in_progress = false;
	});
}

FootPedal.on("press", function(date){
	debug("footpedal pressed")
	if(starting || ending) {
		debug("ignoring pedal press while events are in progress")
		return;
	}

	if(session_in_progress) {
		end_session();
	} else {
		start_session();
	}
});


// MAIN ROUTE
app.get('/booth', function(req, res, next) {
	res.render('booth', { layout: false });
});

                                     
booth_socket.on( "connection", function( socket ) {
	debug("booth socket client joined")
	storage.getItem("story", (err, story) => {
		if(err) throw new Error(err);

		if(story) {
			booth_socket.emit("set_name", story.fname+" "+story.lname);
		} else {
			booth_socket.emit("set_name", "?");
		}
	})		
});



var timer = new CountdownTimer();
timer.on("done", function() {
	debug("TIMER DONE!");
	if(session_in_progress) end_session();
});
timer.on("tick", (str) => {
	booth_socket.emit('time', str);
});







/********************************************************************************************************
 ▄▄▄▄▄▄▄▄▄▄▄  ▄            ▄▄▄▄▄▄▄▄▄▄▄  ▄         ▄  ▄            ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄ 
▐░░░░░░░░░░░▌▐░▌          ▐░░░░░░░░░░░▌▐░▌       ▐░▌▐░▌          ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
▐░█▀▀▀▀▀▀▀█░▌▐░▌          ▐░█▀▀▀▀▀▀▀█░▌▐░▌       ▐░▌▐░▌           ▀▀▀▀█░█▀▀▀▀ ▐░█▀▀▀▀▀▀▀▀▀  ▀▀▀▀█░█▀▀▀▀ 
▐░▌       ▐░▌▐░▌          ▐░▌       ▐░▌▐░▌       ▐░▌▐░▌               ▐░▌     ▐░▌               ▐░▌     
▐░█▄▄▄▄▄▄▄█░▌▐░▌          ▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄█░▌▐░▌               ▐░▌     ▐░█▄▄▄▄▄▄▄▄▄      ▐░▌     
▐░░░░░░░░░░░▌▐░▌          ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌               ▐░▌     ▐░░░░░░░░░░░▌     ▐░▌     
▐░█▀▀▀▀▀▀▀▀▀ ▐░▌          ▐░█▀▀▀▀▀▀▀█░▌ ▀▀▀▀█░█▀▀▀▀ ▐░▌               ▐░▌      ▀▀▀▀▀▀▀▀▀█░▌     ▐░▌     
▐░▌          ▐░▌          ▐░▌       ▐░▌     ▐░▌     ▐░▌               ▐░▌               ▐░▌     ▐░▌     
▐░▌          ▐░█▄▄▄▄▄▄▄▄▄ ▐░▌       ▐░▌     ▐░▌     ▐░█▄▄▄▄▄▄▄▄▄  ▄▄▄▄█░█▄▄▄▄  ▄▄▄▄▄▄▄▄▄█░▌     ▐░▌     
▐░▌          ▐░░░░░░░░░░░▌▐░▌       ▐░▌     ▐░▌     ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌     ▐░▌     
 ▀            ▀▀▀▀▀▀▀▀▀▀▀  ▀         ▀       ▀       ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀       ▀      
********************************************************************************************************/


// This will contain all of the videos ranked by order 
var playlist = [];
Video.find().exec( function( err, videos ) {
	if( err ) return debug(err);
	videos.forEach(vid => {

	});
});


// This gets called immediately when a story is submitted/save
var prepopulate_playlist = function(data) {
	storage.getItem("story", (err, story) => {
		if(err) throw new Error(err);


	});

	// look at data.entities.places, data.entities.items and data.entities.themes
	// try to find a match. Give each video a score.
	// and sort
}


var clear_playlist = function() {
	playlist = []
}




app.get('/playlist', function(req, res, next) {
	var data = {};
	data.playlist = playlist.map(vid => {
		return vid.full_path();
	});

	res.json({ "playlist": playlist });
});






/*****************************************************************************
 ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄         ▄ 
▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌
▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀▀▀ ▐░▌       ▐░▌
▐░▌          ▐░▌       ▐░▌▐░▌          ▐░▌          ▐░▌          ▐░▌       ▐░▌
▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄▄▄ ▐░▌          ▐░█▄▄▄▄▄▄▄█░▌
▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌          ▐░░░░░░░░░░░▌
 ▀▀▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀▀▀ ▐░▌          ▐░█▀▀▀▀▀▀▀█░▌
          ▐░▌▐░▌          ▐░▌          ▐░▌          ▐░▌          ▐░▌       ▐░▌
 ▄▄▄▄▄▄▄▄▄█░▌▐░▌          ▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄▄▄ ▐░▌       ▐░▌
▐░░░░░░░░░░░▌▐░▌          ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌
 ▀▀▀▀▀▀▀▀▀▀▀  ▀            ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀         ▀ 
*****************************************************************************/                                                                            


SpeechToText.on("sentence", function(sentence){
	debug(util.inspect(sentence, {depth: 5}));
	storage.getItem("story", (err, story) => {
		if(err) throw new Error(err);
		if(!story) return debug("!! SpeechToText result with no story to add to.")


		// Find the videos based on previous speech and put them into playlist


		story.sentences.push( sentence );
		storage.setItem("story", story).catch(err => {
			debug("!! error saving story after adding sentence.")
		});
	});
});





/**********************************************************************************
 ▄               ▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄ 
▐░▌             ▐░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░▌ ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
 ▐░▌           ▐░▌  ▀▀▀▀█░█▀▀▀▀ ▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀▀▀ 
  ▐░▌         ▐░▌       ▐░▌     ▐░▌       ▐░▌▐░▌          ▐░▌       ▐░▌▐░▌          
   ▐░▌       ▐░▌        ▐░▌     ▐░▌       ▐░▌▐░█▄▄▄▄▄▄▄▄▄ ▐░▌       ▐░▌▐░█▄▄▄▄▄▄▄▄▄ 
    ▐░▌     ▐░▌         ▐░▌     ▐░▌       ▐░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌▐░░░░░░░░░░░▌
     ▐░▌   ▐░▌          ▐░▌     ▐░▌       ▐░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░▌       ▐░▌ ▀▀▀▀▀▀▀▀▀█░▌
      ▐░▌ ▐░▌           ▐░▌     ▐░▌       ▐░▌▐░▌          ▐░▌       ▐░▌          ▐░▌
       ▐░▐░▌        ▄▄▄▄█░█▄▄▄▄ ▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄▄▄ ▐░█▄▄▄▄▄▄▄█░▌ ▄▄▄▄▄▄▄▄▄█░▌
        ▐░▌        ▐░░░░░░░░░░░▌▐░░░░░░░░░░▌ ▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌
         ▀          ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀   ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀▀▀▀ 
***********************************************************************************/                                                                                    


app.get('/videos', function(req, res, next) {

	var data = {
		layout: false,
		places: EntitiesList.places,
		items: EntitiesList.items,
		themes: EntitiesList.themes
	}

	Video.scan(function(err) {
		if(err) debug(err);

		Video.list(function(err, docs){
			if(err) throw new Error("!! error loading videos")
			data.videos = docs;
			res.render('videos', data);
		});
	});
});


app.post('/videos', valid, function(req, res, next){
	console.log(req.body);

	if(["places", "items", "themes"].indexOf(req.body.entity) == -1) {
		return res.status(422).json({ status: "ERROR", errors: "invalid entity name" });
	}

	Video.findById(req.body.video, (err, video) => {
		if(err) return res.status(422).json({ status: "ERROR", errors: err });	

		if(!req.body.video || !mongoose.Types.ObjectId.isValid(req.body.video)) 
			return res.status(422).json({ status: "ERROR", errors: "invalid or missing video ID" });

		video[req.body.entity] = req.body.values;
		video.save(function(err, doc){
			if(err) return res.status(422).json({ status: "ERROR", errors: err });
			else res.json({status: "OK"});
		});
	});
});









/**************************************************************************
   ___  ____   ____    ___   ____        _____ ______  __ __  _____  _____ 
  /  _]|    \ |    \  /   \ |    \      / ___/|      T|  T  T|     ||     |
 /  [_ |  D  )|  D  )Y     Y|  D  )    (   \_ |      ||  |  ||   __j|   __j
Y    _]|    / |    / |  O  ||    /      \__  Tl_j  l_j|  |  ||  l_  |  l_  
|   [_ |    \ |    \ |     ||    \      /  \ |  |  |  |  :  ||   _] |   _] 
|     T|  .  Y|  .  Yl     !|  .  Y     \    |  |  |  l     ||  T   |  T   
l_____jl__j\_jl__j\_j \___/ l__j\_j      \___j  l__j   \__,_jl__j   l__j   
**************************************************************************/

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	
	debug("err", err);

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});


// Close function to be called from the graceful shutdown procedure in app/www
app.close = function(done) {
	debug("closing");
	async.parallel([FootPedal.close, OnAirSign.close, cam0.close, cam1.close], done);
}

module.exports = app;
