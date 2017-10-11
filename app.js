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
var FootPedal = require('./modules/FootPedal');				// Singleton
var OnAirSign = require('./modules/OnAirSign');				// Singleton
var StateManager = require('./modules/StateManager');





/******************************************************************************************
 █████╗ ██████╗ ██████╗     ███████╗███████╗████████╗██╗   ██╗██████╗ 
██╔══██╗██╔══██╗██╔══██╗    ██╔════╝██╔════╝╚══██╔══╝██║   ██║██╔══██╗
███████║██████╔╝██████╔╝    ███████╗█████╗     ██║   ██║   ██║██████╔╝
██╔══██║██╔═══╝ ██╔═══╝     ╚════██║██╔══╝     ██║   ██║   ██║██╔═══╝ 
██║  ██║██║     ██║         ███████║███████╗   ██║   ╚██████╔╝██║     
╚═╝  ╚═╝╚═╝     ╚═╝         ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝                                                              

Pretty standard stuff, just a few Handlebars helpers
We also make sure required directories exist, initialize persistent storiage, and 
connect to the database.
******************************************************************************************/



/*
┬┌┐┌┬┌┬┐┬┌─┐┬  ┬┌─┐┌─┐
│││││ │ │├─┤│  │┌─┘├┤ 
┴┘└┘┴ ┴ ┴┴ ┴┴─┘┴└─┘└─┘
*/

/*
┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┌┬┐┌─┐┌┬┐┌┬┐
└─┐ │ ├─┤ │ ├┤   ││││ ┬│││ │ 
└─┘ ┴ ┴ ┴ ┴ └─┘  ┴ ┴└─┘┴ ┴ ┴ 
*/

const STATE = {
	IDLE: 			"idle",
	SUBMITTED: 		"submitted",
	STARTING: 		"starting",
	IN_PROGRESS: 	"in progress",
	STOPPING: 		"stopping",
}
var state = new StateManager(STATE.IDLE);




async.each([process.env.STORAGE_ROOT, process.env.VIDEO_ROOT], mkdirp, function(err){
	if(err) debug(err);
})

storage.initSync({dir: "persist"});
storage.getItem("user", (err, user) => {
	if(err) 
		throw new Error(err);
	if(user) 
		state.set(STATE.SUBMITTED);
	else 
		state.set(STATE.IDLE);
});

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
Video.scan(function(err) { if(err) debug(err); });





/*
┌─┐─┐ ┬┌─┐┬─┐┌─┐┌─┐┌─┐  ┌─┐┌─┐┌┬┐┬ ┬┌─┐
├┤ ┌┴┬┘├─┘├┬┘├┤ └─┐└─┐  └─┐├┤  │ │ │├─┘
└─┘┴ └─┴  ┴└─└─┘└─┘└─┘  └─┘└─┘ ┴ └─┘┴  
*/

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
	res.render('index', { layout: false, title: 'NOLA300 Admin' });
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
		storage.getItem("user", (err, item) => {
			if(item) throw "user still in progress.";

			// Validate post request
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				throw errors.array().map(item => { return item.msg; }).join(",");
			}

			var user = matchedData(req); 
			storage.setItem("user", user, (err) => {
				if(err) throw err;

				state.set(STATE.SUBMITTED);
				ui_socket.emit("user", user);

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

These are the socket namespaces that front-end apps connect to for real-time updates.

- /ui: Communicate with the web interfaces: onboarding, booth interface, and admin index
	- SEND state 						one of the STATEs
	- SEND user 						a user object, emitted at the correct times (mostly during state changes)
	- SEND countdown 					sent frequently while a session is in progress with time remaining string
	- RCV cancel 						cancel's the current user's sesssion
- /video: 
	- SEND playlist: an array of video objs (with path,id), sorted by relevance
	- RCV blacklist: the ID of a video that shouldn't be played again in this session
- /emotion
	- SEND emotion: a JSON object of emotions and their current values coming from SpeechToText

******************************************************************************************/                                                  

var io = socketio();
app.io = io;

// Set up socket namespaces
var ui_socket = io.of('/ui');	
var video_socket = io.of('/video');
var emotion_socket = io.of('/emotion')


//-----------------------------------------------------------------------------------------
ui_socket.on("connection", function( client ) {
	debug("/ui client joined")

	client.emit("state", state.get());

	storage.getItem("user", (err, user) => {
		if(err) throw new Error(err);
		if(user) 
			client.emit("user", user);
	});

	client.on("cancel", () => {
		end_session(true);
	});

	client.on('disconnect', () => {
		debug("/ui client left")
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
});

//-----------------------------------------------------------------------------------------
emotion_socket.on("connection", function( client ) {
	debug("/emotion client joined")

	client.on('disconnect', () => {
		debug("/emotion client left")
	});

	/*
	var send_word = function(done) {
		if(texture_words.length==0) return setTimeout(done, 500);

		var w = texture_words.shift();
		client.emit("text", { text: w });

		var t = 1000 + Math.random() * 1000;
		setTimeout(done, t);
	}
	send_word();
	*/
});



//-----------------------------------------------------------------------------------------
state.on("state_change", (old_state, new_state) => {
	if(ui_socket)
		ui_socket.emit("state", new_state);
});


















/******************************************************************************************
███████╗███████╗███████╗███████╗██╗ ██████╗ ███╗   ██╗
██╔════╝██╔════╝██╔════╝██╔════╝██║██╔═══██╗████╗  ██║
███████╗█████╗  ███████╗███████╗██║██║   ██║██╔██╗ ██║
╚════██║██╔══╝  ╚════██║╚════██║██║██║   ██║██║╚██╗██║
███████║███████╗███████║███████║██║╚██████╔╝██║ ╚████║
╚══════╝╚══════╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝

This is a storytelling session. It is started by the foot pedal
It is possible to start a session once a user has submitted the onboarding form.

A storytelling session is started by pressing the 
Footpedal. When you start a session, a bunch of things
happen:
- Cameras start recording
- "ON AIR" sign goes on
- Speech to Text starts
- The "user" persistent object gets updated
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

var timer = new CountdownTimer();
timer.on("done", function() {
	debug("TIMER DONE!");
	if(state.is(STATE.IN_PROGRESS)) 
		end_session(false);
});
timer.on("tick", (str) => {
	ui_socket.emit('countdown', str);
});



//-----------------------------------------------------------------------------------------
var start_session = function() {

	debug("start_session");

	state.set(STATE.STARTING);

	var user = null;

	var get_user = done => {
		storage.getItem("user", (err, item) => {
			if(err) return done(err);
			if(!item) return done("no user present. ignoring.");
			user = item;
			done(null);
		});
	}

	var update_user = done => {
		user.start = Date.now();
		user.sentences = [];
		user.location = process.env.NOLA_LOCATION;
		storage.setItem("user", user, done);
	}

	var start_devices = done => {
		async.parallel([
			cam0.record.bind(cam0, null), 
			cam1.record.bind(cam0, null), 
			SpeechToText.start, 
			OnAirSign.on
		], done); 
	}

	async.series([get_user, update_user, start_devices], err => {
		if(err) return debug(err);

		timer.begin(120000);
		
		state.set(STATE.IN_PROGRESS);
	});
}

//-----------------------------------------------------------------------------------------
var end_session = function(cancel) {
	debug("end_session");
	timer.stop();

	state.set(STATE.STOPPING);


	var user = null;
	var directory = null;

	var get_user = done => {
		debug("get_user");
		storage.getItem("user", (err, item) => {
			if(err) return done(err);
			if(!item) return done("no user present. ignoring.");

			user = item;
			user.id = shortid.generate();
			user.end = Date.now();
			user.duration = user.end - user.start;

			directory = path.join(process.env.STORAGE_ROOT, user.id);
			done(null);
		});
	}
		
	var mkdir = done => {
		debug("mkdir", directory);
		mkdirp(directory, done);
	}

	var stop_devices = done => {
		debug("stop_devices");
		var stop_0 = (cb) => { 
			var path = (cancel) ? null : `${directory}/vid_00.mp4`
			cam0.stop(path, cb); 
		}
		var stop_1 = (cb) => { 
			var path = (cancel) ? null : `${directory}/vid_01.mp4`
			cam1.stop(path, cb); 
		}
		async.parallel([stop_0, stop_1, SpeechToText.stop, OnAirSign.off], done);
	}

	var save_to_file = done => {
		debug("save_to_file");
		var data_file = path.join(directory, "info.json");
		var data = JSON.stringify(user, null, 4);
		return fs.writeFile(data_file, data, 'utf8', done);
	}

	var remove_from_storage = done => {
		debug("remove_from_storage");
		storage.removeItem("user", done);
	}
	
	var wait_5 = done => {
		debug("wait_5");
		setTimeout(done, 5000);
	}

	var tasks = [];
	if(cancel){
		tasks = [stop_devices, remove_from_storage, wait_5];
	} else {
		tasks = [get_user, mkdir, stop_devices, save_to_file, remove_from_storage, wait_5];
	}

	async.series(tasks, (err) => {
		ending = false;
		if(err) return debug(err);

		state.set(STATE.IDLE);
	});
}



//-----------------------------------------------------------------------------------------
FootPedal.on("press", function(date){
	debug("footpedal pressed");

	switch(state.get()) {
		case STATE.STARTING:
		case STATE.ENDING:
			debug("ignoring pedal press. events in progress.");
			return;
		case STATE.IDLE:
			debug("ignoring pedal press. no user present.");
			return;
		case STATE.IN_PROGRESS:
			end_session(false);
			break;
		case STATE.SUBMITTED:
			start_session();
			break;
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

		// Replace the texture_words if the current sentence
		// has any words to offer
		var tmp = sentence.get_texture_words();
		if(tmp) texture_words = tmp;

		// DO YOU FEEL THE EMOTION?
		// if so, send it to the texture_socket
		if(sentence.has_emotion()) {
			texture_socket.emit("emotion", sentence.get_emotion());
		}
	}

	storage.getItem("user", (err, user) => {
		if(err) throw new Error(err);
		if(!user) return debug("Warning: SpeechToText result with no user to add to.")

		// TODO: Find the videos based on previous speech and put them into playlist

		user.sentences.push( sentence.json() );
		storage.setItem("user", user).catch(err => {
			debug("Warning: error saving user after adding sentence.")
		});
	});
});




















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
