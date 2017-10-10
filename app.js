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
const randomWord = require('random-word');
var SpeechToText = require('./modules/SpeechToText');
var EntitiesList = require('./modules/EntitiesList');
var postprocess = require("./modules/PostProcess");
var CountdownTimer = require('./modules/CountdownTimer')
var CanonCamera = require('./modules/CanonCamera')	
var FootPedal = require('./modules/FootPedal')				// Singleton
var OnAirSign = require('./modules/OnAirSign')				// Singleton




/*
┬┌┐┌┬┌┬┐┬┌─┐┬  ┬┌─┐┌─┐
│││││ │ │├─┤│  │┌─┘├┤ 
┴┘└┘┴ ┴ ┴┴ ┴┴─┘┴└─┘└─┘
*/

async.each([process.env.STORAGE_ROOT, process.env.VIDEO_ROOT], mkdirp, function(err){
	if(err) debug(err);
})

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
┬  ┬┬┌┬┐┌─┐┌─┐  ┌┬┐┬┬─┐┌─┐┌─┐┌┬┐┌─┐┬─┐┬ ┬  ┌─┐┌─┐┌─┐┌┐┌
└┐┌┘│ ││├┤ │ │   │││├┬┘├┤ │   │ │ │├┬┘└┬┘  └─┐│  ├─┤│││
 └┘ ┴─┴┘└─┘└─┘  ─┴┘┴┴└─└─┘└─┘ ┴ └─┘┴└─ ┴   └─┘└─┘┴ ┴┘└┘
*/
Video.scan(function(err) {
	if(err) debug(err);
	Video.list(function(err, docs){
		if(err) return debug("error loading videos");
	});
});









/******************************************************************************************
 █████╗ ██████╗ ██████╗     ███████╗███████╗████████╗██╗   ██╗██████╗ 
██╔══██╗██╔══██╗██╔══██╗    ██╔════╝██╔════╝╚══██╔══╝██║   ██║██╔══██╗
███████║██████╔╝██████╔╝    ███████╗█████╗     ██║   ██║   ██║██████╔╝
██╔══██║██╔═══╝ ██╔═══╝     ╚════██║██╔══╝     ██║   ██║   ██║██╔═══╝ 
██║  ██║██║     ██║         ███████║███████╗   ██║   ╚██████╔╝██║     
╚═╝  ╚═╝╚═╝     ╚═╝         ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝                                                              

Pretty standard stuff, just a few Handlebars helpers
******************************************************************************************/

var app = express();

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









/******************************************************************************************
██████╗  ██████╗ ██╗   ██╗████████╗███████╗███████╗
██╔══██╗██╔═══██╗██║   ██║╚══██╔══╝██╔════╝██╔════╝
██████╔╝██║   ██║██║   ██║   ██║   █████╗  ███████╗
██╔══██╗██║   ██║██║   ██║   ██║   ██╔══╝  ╚════██║
██║  ██║╚██████╔╝╚██████╔╝   ██║   ███████╗███████║
╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝
- /  This will be the admin debug screen
- /booth
- /onboard GET
- /onboard POST
- /videos
******************************************************************************************/

app.get('/', function(req, res, next) {
	res.render('index', { title: 'NOLA300 Admin' });
});

app.get('/booth', function(req, res, next) {
	res.render('booth', { layout: false });
});

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

/*
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
*/






/******************************************************************************************
███████╗ ██████╗  ██████╗██╗  ██╗███████╗████████╗███████╗
██╔════╝██╔═══██╗██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝██╔════╝
███████╗██║   ██║██║     █████╔╝ █████╗     ██║   ███████╗
╚════██║██║   ██║██║     ██╔═██╗ ██╔══╝     ██║   ╚════██║
███████║╚██████╔╝╚██████╗██║  ██╗███████╗   ██║   ███████║
╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝

These are the various socket namespaces that different 
front-end apps connect to.
- onboard: 
- booth: 
- video: 
- texture: 
******************************************************************************************/                                                  

var io = socketio();
app.io = io;

// Set up socket namespaces
var onboard_socket = io.of('/onboard');
var booth_socket = io.of('/booth');
var video_socket = io.of('/video');
var texture_socket = io.of('/texture');


//-----------------------------------------------------------------------------------------
onboard_socket.on("connection", function( client ) {
	debug("/onboard client joined")

	storage.getItem("story").then(story => {
		var status = (story) ? "wait" : "ready";
		client.emit("submit_status", status);
	});

	client.on('disconnect', () => {
		debug("/onboard client left")
	});
});

//-----------------------------------------------------------------------------------------
booth_socket.on("connection", function( client ) {
	debug("/booth client joined")

	storage.getItem("story", (err, story) => {
		if(err) throw new Error(err);

		if(story) {
			client.emit("set_name", story.fname+" "+story.lname);
		} else {
			client.emit("set_name", "?");
		}
	});

	client.on('disconnect', () => {
		debug("/booth client left")
	});
});

//-----------------------------------------------------------------------------------------
video_socket.on("connection", function( client ) {
	debug("/video client joined")
	var blacklist = [];

	var query = { file_present: true,  _id: { $nin: blacklist } };
	Video.findRandom(query, {}, {limit: 50}, function(err, docs) {
		if (err) return debug(results); // 5 elements

		var playlist = docs.map(d => { return d.as_playlist(); })
		client.emit("playlist", playlist);
	});

	client.on('tock', (data) => { });

	client.on('disconnect', () => {
		debug("/video client left")
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

//-----------------------------------------------------------------------------------------
texture_socket.on("connection", function( client ) {
	debug("/texture client joined")


	client.on('tock', (data) => { });

	client.on('disconnect', () => {
		debug("/texture client left")
	});

	var loop = function() {
		client.emit("tick", Date.now());
		setTimeout(loop, 1000);
	}
	loop();
});





//-----------------------------------------------------------------------------------------
/******************************************************************************************
███████╗███████╗███████╗███████╗██╗ ██████╗ ███╗   ██╗
██╔════╝██╔════╝██╔════╝██╔════╝██║██╔═══██╗████╗  ██║
███████╗█████╗  ███████╗███████╗██║██║   ██║██╔██╗ ██║
╚════██║██╔══╝  ╚════██║╚════██║██║██║   ██║██║╚██╗██║
███████║███████╗███████║███████║██║╚██████╔╝██║ ╚████║
╚══════╝╚══════╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝

This is a storytelling session. 
It is possible to start a session once a user has submitted the onboarding form.

A storytelling session is started by pressing the 
Footpedal. When you start a session, a bunch of things
happen:
- Cameras start recording
- "ON AIR" sign goes on
- Speech to Text starts
- The "story" persistent object gets updated
- Countdown Timer starts from 120,000 millis

When the user hits the foot pedal again (or the timer
runs out), the session ends. This includes a bunch of 
actions:
- A "shortID" is generated
- Cameras stop recording 
- ...
******************************************************************************************/

var cam0 = new CanonCamera("0");
var cam1 = new CanonCamera("1");
var session_in_progress = false;
var starting = false;
var ending = false;


var timer = new CountdownTimer();
timer.on("done", function() {
	debug("TIMER DONE!");
	if(session_in_progress) end_session();
});
timer.on("tick", (str) => {
	booth_socket.emit('time', str);
});


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
		async.parallel([
			cam0.record.bind(cam0, null), 
			cam1.record.bind(cam0, null), 
			SpeechToText.start, 
			OnAirSign.on
		], done); 
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








/******************************************************************************************

███████╗██████╗ ███████╗███████╗ ██████╗██╗  ██╗
██╔════╝██╔══██╗██╔════╝██╔════╝██╔════╝██║  ██║
███████╗██████╔╝█████╗  █████╗  ██║     ███████║
╚════██║██╔═══╝ ██╔══╝  ██╔══╝  ██║     ██╔══██║
███████║██║     ███████╗███████╗╚██████╗██║  ██║
╚══════╝╚═╝     ╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝

This is the speech-to-text event handler.  Whenever Watson decides it's heard a "sentence",
this handler is fired with an object with the following keys:

- text: (String) the text that was recognized
- elapsed (Number): the number of millis since STT was begun
- time (Number): Date.time that the recognized speech was returned from Watson
- nlu (Object): If present, this is the Watson Natural Language Understanding object with a
	complex set of keys and values.

******************************************************************************************/                                                                            

/*
var whitelist = [];
fs.readFile('whitelist.txt', function(err, data) {
    if(err) throw err;
    var array = data.toString().split("\n");
    whitelist = array.map((str) => { 
    	return str.toLowerCase().trim();
    });
});
*/

var texture_words = [];
SpeechToText.on("sentence", (sentence) => {
	debug(util.inspect(sentence, {depth: 10}));

	if(sentence.has_nlu()) {

		var tmp = sentence.get_words();
		if(tmp) texture_words = tmp;

		if(sentence.has_emotion()) {
			texture_socket.emit("emotion", sentence.get_emotion());
		}
	}

	storage.getItem("story", (err, story) => {
		if(err) throw new Error(err);
		if(!story) return debug("Warning: SpeechToText result with no story to add to.")

		// Find the videos based on previous speech and put them into playlist

		story.sentences.push( sentence.json() );
		storage.setItem("story", story).catch(err => {
			debug("Warning: error saving story after adding sentence.")
		});
	});
});



// TO DO: MOve this to the texure_socket on_connect handler so that it only
// gets sent out if there is a client connected.
var send_word = function(done) {
	if(texture_words.length==0) return setTimeout(done, 500);

	var w = texture_words.shift();
	var message = { text: w };
	debug("!! text", message);
	texture_socket.emit("text", message);

	var t = 1000 + Math.random() * 1000;
	setTimeout(done, t);
}
async.forever(send_word, err => {})




/******************************************************************************************

██████╗  ██████╗ ███████╗████████╗██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗
██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝
██████╔╝██║   ██║███████╗   ██║   ██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗
██╔═══╝ ██║   ██║╚════██║   ██║   ██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║
██║     ╚██████╔╝███████║   ██║   ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║
╚═╝      ╚═════╝ ╚══════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝

Every 10 seconds, scan process.env.STORAGE_ROOT for completed recordings (defined as any
folder inside STORAGE_ROOT that has an "info.json" file inside). See the Postprocess 
module for more information about what happens next. 

******************************************************************************************/

async.forever(postprocess, err => {
	debug("postprocess returned an error:", err);
});














/******************************************************************************************
███████╗██████╗ ██████╗  ██████╗ ██████╗ 
██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
█████╗  ██████╔╝██████╔╝██║   ██║██████╔╝
██╔══╝  ██╔══██╗██╔══██╗██║   ██║██╔══██╗
███████╗██║  ██║██║  ██║╚██████╔╝██║  ██║
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝                     
******************************************************************************************/

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
