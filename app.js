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
var _ = require('lodash');
var fs = require("fs");
const mkdirp = require('mkdirp');
const { check, validationResult } = require('express-validator/check');
// const { matchedData } = require('express-validator/filter');
var Video = require('./Video')
var Story = require('./Story')
const async = require('async');
var hbs = require('hbs');
const randomWord = require('random-word');
var SpeechToText = require('./modules/SpeechToText');
//var EntitiesList = require('./modules/EntitiesList');
var postprocess = require("./modules/PostProcess");
var CountdownTimer = require('./modules/CountdownTimer')
var CanonCamera = require('./modules/CanonCamera')
var OnAirSign = require('./modules/OnAirSign');				// Singleton
var StateManager = require('./modules/StateManager');


fs.statSync(process.env.STORAGE_ROOT).isDirectory();


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

state.on("state_change", (old_state, new_state) => {
	if(ui_socket)
		ui_socket.emit("state", new_state);
});




/*
┬┌┐┌┬┌┬┐┬┌─┐┬  ┬┌─┐┌─┐
│││││ │ │├─┤│  │┌─┘├┤ 
┴┘└┘┴ ┴ ┴┴ ┴┴─┘┴└─┘└─┘
*/


async.each([process.env.STORAGE_ROOT, process.env.VIDEO_ROOT], mkdirp, function(err){
	if(err) debug(err);
})



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

	Story.findOne({active:true}).exec((err, item) => {
		if(err) throw new Error(err);
		if(item) state.set(STATE.SUBMITTED);
		else  state.set(STATE.IDLE);
	});

	Video.scan(function(err) { if(err) debug(err); });
});





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
- /timer
- /onboard GET
- /onboard POST
- /videos
******************************************************************************************/

app.get('/', function(req, res, next) {
	res.render('index', { layout: false, title: 'NOLA300 Admin' });
});

app.get('/timer', function(req, res, next) {
	res.render('timer', { layout: false });
});

app.get('/onboard', function(req, res, next) {
	var data = { layout: false };
	var template = "mobile";
	res.render(template, data);
});



var valid = [
	check('firstName').exists().isLength({ min: 2, max: 20 }).withMessage('Please provide a valid first name'), 
	check('lastName').exists().isLength({ min: 2, max: 30 }).withMessage('Please provide a valid last name'), 
	check('zipCode').exists().isLength({ min: 5, max: 5 }).withMessage('Please provide a valid zipcode'),
	check('email').exists().isEmail().withMessage('Please provide a valid email address'),
	check('acceptTerms').exists().withMessage('Please accept terms and conditions'),
	check('emailList').exists()
];
app.post('/onboard', valid, function(req, res, next) {
	debug("req.body", req.body);

	Story.findOne({active:true}).exec((err, doc) => {

		if(doc) 
			return res.status(422).send("story still in progress.");

		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			var message = errors.array().map(item => { return item.msg; }).join(",");
			return res.status(422).send(message);
		}


		var data = _.pick(req.body, ["firstName", "lastName", "zipCode", "email", "acceptTerms", "emailList"]);
		var story = new Story(data);
		story.active = true;

		story.save((err, doc) => {
			if(err) {
				debug("mongoose error", err);
				return res.status(422).send(err);
			}

			state.set(STATE.SUBMITTED);
			ui_socket.emit("story", doc);

			res.json({status: "OK"});
		});
	});	
});

app.get('/videos', function(req, res, next) {

	Video.scan(function(err) {
		if(err) throw (err);

		Video.list(function(err, docs){
			if(err) throw new Error("!! error loading videos")
			var data = { layout: false, videos: docs }
			res.render('videos', data);
		});
	});
});

app.get('/playlist', function(req, res, next) {
	var data = { layout: false };
	res.render('playlist', data);
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

	Story.findOne({active:true}).exec((err, doc) => {
		if(err) throw new Error(err);
		if(doc) 
			client.emit("story", doc);
	});

	client.on("pedal", on_pedal);

	client.on("cancel", () => {
		end_session(true);
	});

	client.on('disconnect', () => {
		debug("/ui client left")
	});
});

var blacklist = [];
var send_random_videos = done => {
	var query = { file_present: true,  _id: { $nin: blacklist } };
	Video.findRandom(query, {}, {limit: 40}, (err, docs) => {
		if (err) return debug(results); // 5 elements

		var playlist = docs.map(d => { return d.as_playlist(); })
		video_socket.emit("playlist", playlist);
		done(null);
	});
}

//-----------------------------------------------------------------------------------------
video_socket.on("connection", function( client ) {
	debug("/video client joined")
	
	client.emit("blacklist", blacklist);

	client.on('disconnect', () => {
		debug("/video client left")
	});

	client.on("blacklist", function(msg) {
		debug("blacklist", msg)
		if(blacklist.indexOf(msg) > -1) {
			debug("warning: video is already blacklisted.")
		} else {
			blacklist.push(msg);
			client.broadcast.emit("blacklist", blacklist); // broadcast it back out to any other listening clients
			debug(blacklist); 
		}
	});

	client.on("get_random", () => {
		var query = { file_present: true,  _id: { $nin: blacklist } };
		Video.findRandom(query, {}, {limit: 20}, (err, docs) => {
			if (err) return debug(results); // 5 elements

			var playlist = docs.map(d => { return d.as_playlist(); })
			video_socket.emit("playlist", playlist);
		});
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
- Cameras stop recording 
- ...
******************************************************************************************/




var cam0 = new CanonCamera("0");
var cam1 = new CanonCamera("1");


var cam_status = (done) => {
	ui_socket.emit("cam_status", 0, cam0.getIsOpened());
	ui_socket.emit("cam_status", 1, cam1.getIsOpened());
	setTimeout(done, 1000);
}
async.forever(cam_status, err => {
	debug("cam_status exited", err);
});

var timer = new CountdownTimer();
timer.on("done", function() {
	debug("TIMER DONE!");
	if(state.is(STATE.IN_PROGRESS)) 
		end_session(false);
});
timer.on("tick", (t) => {
	ui_socket.emit('countdown', t);
});



//-----------------------------------------------------------------------------------------
var start_session = function() {

	debug("start_session");

	state.set(STATE.STARTING);

	var update_story = done => {
		Story.findOne({active:true}).exec((err, doc) => {
			if(err) return done(err);
			if(!doc) return done("no user present. ignoring.");
			
			doc.sentences = [];	// reset the sentences in case this is a re-record
			doc.startTime = Date.now();
			doc.location = process.env.NOLA_LOCATION;
			doc.save(done);
		});
	}

	var start_devices = done => {
		async.parallel([
			cam0.record.bind(cam0, null), 
			cam1.record.bind(cam1, null), 
			SpeechToText.start, 
			OnAirSign.on
		], done); 
	}

	async.series([update_story, send_random_videos, start_devices], err => {
		if(err) return debug(err);

		timer.begin(45000);
		
		state.set(STATE.IN_PROGRESS);
	});
}

//-----------------------------------------------------------------------------------------
var end_session = function(cancel) {
	debug("end_session");

	// If we're under 5 seconds, end the session after 5 seconds
	if(timer.elapsed() < 5000) {
		var wait = 5000 - timer.elapsed();
		debug("too short!  stopping automatically in", wait);
		setTimeout(() => { end_session(cancel); }, wait);
		return;
	}

	timer.stop();
	state.set(STATE.STOPPING);

	blacklist = [];
	video_socket.emit("blacklist", []);

	var story = null;

	var wait_2 = done => {
		setTimeout(done, 2000);
	}

	var get_user = done => {
		debug("get_user");

		Story.findOne({active: true}).exec((err, doc) => {
			if(err) return done(err);
			if(!doc) return done("no story present. ignoring.");

			doc.endTime = Date.now();
			story = doc;
			doc.save(done);
		});
	}
	
	var mkdir = done => {
		debug("mkdir", story.directory);
		mkdirp(story.directory, done);
	}

	var cancel_devices = done => {
		async.parallel([cam0.cancel, cam1.cancel, SpeechToText.stop, OnAirSign.off], done);
	}

	var stop_devices = done => {
		debug("stop_devices");
		var stop_0 = (cb) => {  cam0.stop(`${story.directory}/vid_00.mp4`, cb); }
		var stop_1 = (cb) => {  cam1.stop(`${story.directory}/vid_01.mp4`, cb); }
		async.parallel([stop_0, stop_1, SpeechToText.stop, OnAirSign.off], done);
	}

	var mark_ready = done => {
		story.readyForEdit = true;
		story.save(done);
	}

	var clear_active = done => {
		debug("clear_active");
		Story.update({}, {$set: {'active' : false}}, {multi: true}, done);
	}

	var tasks = [];
	if(cancel){
		tasks = [cancel_devices, clear_active];
	} else {
		tasks = [wait_2, get_user, mkdir, stop_devices, mark_ready, clear_active];
	}

	async.series(tasks, (err) => {
		ending = false;
		if(err) return debug(err);

		state.set(STATE.IDLE);
	});
}



//-----------------------------------------------------------------------------------------
var on_pedal = function() {
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
}

var FootPedal = require('./modules/FootPedal');				// Singleton
FootPedal.on("press", on_pedal);



















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
//SpeechToText.start();
SpeechToText.on("sentence", (sentence) => {
	debug(util.inspect(sentence.toJson(), {depth: 10}));

	if(sentence.has_nlu()) {
		// DO YOU FEEL THE EMOTION? if so, send it to the emotion_socket
		if(sentence.has_emotion()) {
			var emo = sentence.get_emotion();
			debug("emotion", emo);
			emotion_socket.emit("emotion", emo);
		}
 
		var terms = sentence.get_search_terms();
		debug( "search terms",  terms )

		video_socket.emit("query", terms);
		Video.getPlaylist(terms, blacklist, 20, (err, playlist) => {
			if(err) return debug(err);
			playlist = 	playlist.map(d => { return d.as_playlist(); });
			video_socket.emit("playlist", playlist);
		});
	}

	Story.findOne({active:true}).exec((err, doc) => {
		if(err) throw new Error(err);
		if(!doc) return debug("Warning: SpeechToText result with no user to add to.")

		doc.sentences.push( sentence.toJson() );
		doc.save();
	});
});



















/******************************************************************************************

██████╗  ██████╗ ███████╗████████╗██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗
██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝
██████╔╝██║   ██║███████╗   ██║   ██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗
██╔═══╝ ██║   ██║╚════██║   ██║   ██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║
██║     ╚██████╔╝███████║   ██║   ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║
╚═╝      ╚═════╝ ╚══════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝

Every 10 seconds...

******************************************************************************************/


async.forever((done) => {
	Story.scan(err => {
		if(err) debug(err);
		setTimeout(done, 10000);
	})
}, debug);
















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
