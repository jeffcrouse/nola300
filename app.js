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
const exec = require("child_process").exec;
var fs = require("fs");
const mkdirp = require('mkdirp');
var storage = require('node-persist');	
storage.initSync();
const { check, validationResult } = require('express-validator/check');
var Video = require('./Video')
var Story = require('./Story')
const async = require('async');
var hbs = require('hbs');
const randomWord = require('random-word');
var SpeechToText = require('./modules/SpeechToText');
var postprocess = require("./modules/PostProcess");
var CountdownTimer = require('./modules/CountdownTimer')
var CanonCamera = require('./modules/CanonCamera')
var OnAirSign = require('./modules/OnAirSign');				// Singleton
var StateManager = require('./modules/StateManager');
var VDMX = require('./modules/VDMX');						// Singleton
var moment = require('moment');






/****************************************************************************************
┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┌┬┐┌─┐┌┬┐┌┬┐
└─┐ │ ├─┤ │ ├┤   ││││ ┬│││ │ 
└─┘ ┴ ┴ ┴ ┴ └─┘  ┴ ┴└─┘┴ ┴ ┴ 
This StateManager is used across the app to keep track of the current state
Whenever the state is changed, "state" fires off a state_change event 
We use this to notify anyone listening to the ui socket to the "state_change" event.
****************************************************************************************/

const APPSTATES = {
	IDLE: 			"idle",
	SUBMITTED: 		"submitted",
	STARTING: 		"starting",
	IN_PROGRESS: 	"in progress",
	STOPPING: 		"stopping",
}
var state = new StateManager(APPSTATES.IDLE);
state.on("state_change", (old_state, new_state) => {
	debug("state_change", old_state, "=>", new_state);
	
	if(ui_socket)
		ui_socket.emit("state", new_state);

	// switch(new_state) {
	// 	case APPSTATES.STARTING: 		 break;
	// 	case APPSTATES.IDLE: 			  break;
	// 	case APPSTATES.STOPPING:  		 break;
	// 	case APPSTATES.IN_PROGRESS: 	break;
	// 	case APPSTATES.SUBMITTED: 		break;
	// 	default: debug("UNKNOWN STATE"); break;
	// }
});







/****************************************************************************************
╔╦╗┬┬─┐┌─┐┌─┐┌┬┐┌─┐┬─┐┬ ┬  ╔═╗┬ ┬┌─┐┌─┐┬┌─
 ║║│├┬┘├┤ │   │ │ │├┬┘└┬┘  ║  ├─┤├┤ │  ├┴┐
═╩╝┴┴└─└─┘└─┘ ┴ └─┘┴└─ ┴   ╚═╝┴ ┴└─┘└─┘┴ ┴
Make sure all of the required directories exist
****************************************************************************************/


async.each([process.env.STORAGE_ROOT, process.env.VIDEO_ROOT], mkdirp, function(err){
	if(err) debug(err);
})



/****************************************************************************************
┌┬┐┌─┐┌┬┐┌─┐┌┐ ┌─┐┌─┐┌─┐
 ││├─┤ │ ├─┤├┴┐├─┤└─┐├┤ 
─┴┘┴ ┴ ┴ ┴ ┴└─┘┴ ┴└─┘└─┘
- If there is an active story, set the state to SUBMITTED.
- Otherwise,  set the state to IDLE
- Video.scan: check the database against the filesystem, and check filesystem against
database.
****************************************************************************************/

mongoose.Promise = global.Promise;
var db_url = 'mongodb://localhost:27017/nola300-client';
mongoose.connect(db_url, {useMongoClient: true}, function(err){
	if(err) throw("couldn't connect to", db_url);
	else debug("connected to", db_url);

	// Check for an active story!
	Story.findOne({active:true}).exec((err, item) => {
		if(err) throw new Error(err);
		if(item) state.set(APPSTATES.SUBMITTED);
		else state.set(APPSTATES.IDLE);
	});

	Video.scan(function(err) { if(err) debug(err); });
});










/******************************************************************************************
 █████╗ ██████╗ ██████╗     ███████╗███████╗████████╗██╗   ██╗██████╗ 
██╔══██╗██╔══██╗██╔══██╗    ██╔════╝██╔════╝╚══██╔══╝██║   ██║██╔══██╗
███████║██████╔╝██████╔╝    ███████╗█████╗     ██║   ██║   ██║██████╔╝
██╔══██║██╔═══╝ ██╔═══╝     ╚════██║██╔══╝     ██║   ██║   ██║██╔═══╝ 
██║  ██║██║     ██║         ███████║███████╗   ██║   ╚██████╔╝██║     
╚═╝  ╚═╝╚═╝     ╚═╝         ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝                                                              

Pretty standard Express.js (https://expressjs.com/) stuff, and just a few Handlebars helpers
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

hbs.registerHelper("dateFormat", function( date, format ) {
    return moment(date).format(format);
});
hbs.registerHelper("firstLetter", function( str ) {
    return str.charAt(0);
});









/******************************************************************************************
██████╗  ██████╗ ██╗   ██╗████████╗███████╗███████╗
██╔══██╗██╔═══██╗██║   ██║╚══██╔══╝██╔════╝██╔════╝
██████╔╝██║   ██║██║   ██║   ██║   █████╗  ███████╗
██╔══██╗██║   ██║██║   ██║   ██║   ██╔══╝  ╚════██║
██║  ██║╚██████╔╝╚██████╔╝   ██║   ███████╗███████║
╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝
******************************************************************************************/

/**
*	Brand Ambassador interface
*	Provides a cancel button, and various status information
*/
app.get('/', function(req, res, next) {
	res.render('index', { layout: false, title: 'NOLA300 Admin' });
});


/**
*	Gets an HTML table with the most recent videos and their state
*/
app.get('/recent', function(req, res, next) {
	Story.find({}).sort({createdAt: -1}).limit(5).exec((err, docs) => {
		if(err) debug(err);
		res.render('recent', {layout: false, stories: docs});
	});
});


/**
*	Timer Interface
*	This is loaded on a Raspberry Pi in the booth, and does 3 things:
*	1. Welcomes the user into the booth by name
*	2. Counts down the timer
*	3. Thanks the user and asks them to leave the booth
*	All of this is accomplished through the "ui" socket
*/
app.get('/timer', function(req, res, next) {
	res.render('timer', { layout: false });
});

/**
*	Onboarding form 
*/
app.get('/onboard', function(req, res, next) {
	var data = { layout: false };
	var template = "mobile";
	res.render(template, data);
});


/**
*	POST endpoint for the onboarding form submission.
*	1. First check to see if there is currently an active user. If so, send an error.
*	2. Then validate the form
*	3. Then make a new story (it is the active one by default)
*	4. Set the APPSTATE to "SUBMITTED"
*	5. Tell all of the "ui" socket listeners about the new user.
*/
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

			state.set(APPSTATES.SUBMITTED);
			if(ui_socket) 
				ui_socket.emit("story", doc);

			res.json({status: "OK"});
		});
	});	
});

/**
*	Mostly for debugging purposes -- just a way to see all of the videos in the datbase
*/
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


/**
*	Shows which videos were last sent by the "videos" socket
*/
/*
app.get('/playlist', function(req, res, next) {
	var data = { layout: false };
	res.render('playlist', data);
});
*/


/**
*	Open a browser window with the app status 
*/
exec(`open http://127.0.0.1:3000`);














/******************************************************************************************
███████╗ ██████╗  ██████╗██╗  ██╗███████╗████████╗███████╗
██╔════╝██╔═══██╗██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝██╔════╝
███████╗██║   ██║██║     █████╔╝ █████╗     ██║   ███████╗
╚════██║██║   ██║██║     ██╔═██╗ ██╔══╝     ██║   ╚════██║
███████║╚██████╔╝╚██████╗██║  ██╗███████╗   ██║   ███████║
╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝

These are the socket namespaces that front-end apps connect to for real-time updates.

- /ui: Communicate with the web interfaces: onboarding, timer interface, and admin index
	- SEND state 				one of the STATEs
	- SEND story 				a story object, emitted at the correct times (mostly during state changes)
	- SEND countdown 			sent frequently while a session is in progress with time remaining string
	- SEND cam_status 			
	- RCV cancel 				cancel's the current user's sesssion
	- RCV pedal 				fakes a footpedal press
- /video: 
	- SEND playlist 			an array of video objs (with path,id), sorted by relevance
	- RCV blacklist 			the ID of a video that shouldn't be played again in this session
	- RCV get_random			request for a random set of videos
- /emotion
	- SEND emotion 				a JSON object of emotions and their current values coming from SpeechToText

******************************************************************************************/                                                  

var io = socketio();
app.io = io;

// Set up socket namespaces
var ui_socket = io.of('/ui');	
//var video_socket = io.of('/video');
//var emotion_socket = io.of('/emotion')

//-----------------------------------------------------------------------------------------
ui_socket.on("connection", function( client ) {
	debug("/ui client joined")

	client.emit("state", state.get());

	Story.findOne({active:true}).exec((err, doc) => {
		if(err) throw new Error(err);
		if(doc) 
			client.emit("story", doc);
	});

	storage.getItem("emotion", (err, value) => {
		client.emit("emotion", value);
	});

	client.on("pedal", on_pedal);

	client.on("cancel", () => {
		end_session(true);
	});

	client.on('disconnect', () => {
		debug("/ui client left")
	});
});


/*
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
});
*/



















/******************************************************************************************
███████╗███████╗███████╗███████╗██╗ ██████╗ ███╗   ██╗
██╔════╝██╔════╝██╔════╝██╔════╝██║██╔═══██╗████╗  ██║
███████╗█████╗  ███████╗███████╗██║██║   ██║██╔██╗ ██║
╚════██║██╔══╝  ╚════██║╚════██║██║██║   ██║██║╚██╗██║
███████║███████╗███████║███████║██║╚██████╔╝██║ ╚████║
╚══════╝╚══════╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝

This is a storytelling session. It is started by the foot pedal. It is possible to start 
a session once a user has submitted the onboarding form.
*****************************************************************************************/




var cam0 = new CanonCamera("0");
var cam1 = new CanonCamera("1");

/**
* 	Continually send the status of the 2 cameras to any ui socket that is listening
*/
async.forever((done) => {
	ui_socket.emit("cam_status", 0, cam0.getIsOpened());
	ui_socket.emit("cam_status", 1, cam1.getIsOpened());
	setTimeout(done, 1000);
}, err => {
	debug("cam_status exited", err);
});



/**
*	Create a CountdownTimer object.  
*	This object responds to  timer.begin(millis) and begins a countdown
*   - "tick"  	Fired every 100 millis with the remaining time
* 	- "done"  	Fired when the timer is done.
*/
var timer = new CountdownTimer();
timer.on("done", function() {
	debug("TIMER DONE!");
	if(state.is(APPSTATES.IN_PROGRESS)) 
		end_session(false);
});
timer.on("tick", (t) => {
	ui_socket.emit('countdown', t);
});



/**
* 	A storytelling session is started by pressing the  Footpedal. When you start a session, 
*	a bunch of things happen:
* 	1. Set the state to "STARTING"
* 	2. Find and update the active story
* 	3. Start the 2 cameras, TTS, and turn the OnAir sign on
* 	4. Start the CountdownTimer at 45 seconds 
* 	5. Set the state to "IN_PROGRESS"
*/
var start_session = function() {

	debug("start_session");

	state.set(APPSTATES.STARTING);

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
			OnAirSign.on,
			VDMX.fadeIn
		], done); 
	}

	async.series([update_story, send_random_videos, start_devices], err => {
		if(err) return debug(err);

		timer.begin(45000);
		Video.update({}, {$set: {'blacklisted' : false}}, {multi: true});

		state.set(APPSTATES.IN_PROGRESS);
	});
}


/**
*	When the user hits the foot pedal again (or the countdown timer runs out), 
* 	the session ends.  This includes a bunch of actions:
* 	1. If the elapsed time is less than 5 seconds, wait until we have reached 5 seconds
* 		and then automatically end.
* 	2. Stop the timer.
* 	3. Set the state to "STOPPING"
* 	4. Wait a second (this is because of the fadeout in the final video edit)
*	5. Get the current active story so we can update it. Add an endTime
* 	6. Make a directory where we can save all of the videos
*	7. stop the cameras, turn of STT, and turn off OnAir sign
* 	8. Mark the story as "readyToEdit"
*	9. Clear the "active" flag from all stories
*	10. Clear the blacklist of videos
*	11. Finally, set the APPSTATE to "IDLE"
*/
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
	state.set(APPSTATES.STOPPING);
	

	var story = null;

	var wait = done => {
		setTimeout(done, 2000);
	}

	var get_story = done => {
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
		async.parallel([cam0.cancel, cam1.cancel, SpeechToText.stop, OnAirSign.off, VDMX.fadeOut], done);
	}

	var stop_devices = done => {
		debug("stop_devices");
		var stop_0 = (cb) => {  cam0.stop(`${story.directory}/vid_00.mp4`, cb); }
		var stop_1 = (cb) => {  cam1.stop(`${story.directory}/vid_01.mp4`, cb); }
		async.parallel([stop_0, stop_1, SpeechToText.stop, OnAirSign.off, VDMX.fadeOut], done);
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
		tasks = [wait, get_story, mkdir, stop_devices, mark_ready, clear_active];
	}

	async.series(tasks, (err) => {
		ending = false;
		if(err) return debug(err);

		// video_socket.emit("blacklist", []);
		Video.update({}, {$set: {'blacklisted' : false}}, {multi: true});
		storage.removeItem("emotion");
		state.set(APPSTATES.IDLE);
	});
}





/**
*	FootPedal fires a "press" event any time the pedal is pressed.
* 	Depending on the current APPSTATE, do something...
*/

var FootPedal = require('./modules/FootPedal');				// Singleton
var on_pedal = function() {
	debug("footpedal pressed");

	switch(state.get()) {
		case APPSTATES.STARTING:
		case APPSTATES.STOPPING:
			debug("ignoring pedal press. events in progress.");
			return;
		case APPSTATES.IDLE:
			debug("ignoring pedal press. no user present.");
			return;
		case APPSTATES.IN_PROGRESS:
			end_session(false);
			break;
		case APPSTATES.SUBMITTED:
			start_session();
			break;
		default: debug("UNKNOWN STATE"); break;
	}
}
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

If there is an active story, add the sentence to that story.

If the sentence has NLU, we use it for 3 things:
1. Send the emotion to the "emotion" socket for use by the overlay video player
2. Use the "search terms" (concepts, entities, keywords) to rank all of the videos
3. Get a set of 20 videos that rank the highest based on that search.

******************************************************************************************/                                                                            



SpeechToText.on("sentence", (sentence) => {
	debug(util.inspect(sentence.toJson(), {depth: 10}));

	Story.findOne({active:true}).exec((err, doc) => {
		if(err) throw new Error(err);
		if(!doc) return debug("Warning: SpeechToText result with no user to add to.")

		doc.sentences.push( sentence.toJson() );
		doc.save();
	});

	if(sentence.has_nlu()) {

		var terms = sentence.get_search_terms();
		debug("search terms",  terms);
		Video.setScores( terms );


		if(sentence.has_emotion()) {
			var emo = sentence.get_top_emotion();
			debug("emotion", emo);
			storage.setItem('emotion', emo);
			ui_socket.emmit('emotion', emo);
		}

		/*
		// DO YOU FEEL THE EMOTION? if so, send it to the emotion_socket
		video_socket.emit("query", terms);
		Video.getPlaylist(terms, blacklist, 20, (err, playlist) => {
			if(err) return debug(err);
			playlist = 	playlist.map(d => { return d.as_playlist(); });
			video_socket.emit("playlist", playlist);
		});
		*/
	}
});











/******************************************************************************************
██╗   ██╗██████╗ ███╗   ███╗██╗  ██╗    ███████╗████████╗██╗   ██╗███████╗███████╗
██║   ██║██╔══██╗████╗ ████║╚██╗██╔╝    ██╔════╝╚══██╔══╝██║   ██║██╔════╝██╔════╝
██║   ██║██║  ██║██╔████╔██║ ╚███╔╝     ███████╗   ██║   ██║   ██║█████╗  █████╗  
╚██╗ ██╔╝██║  ██║██║╚██╔╝██║ ██╔██╗     ╚════██║   ██║   ██║   ██║██╔══╝  ██╔══╝  
 ╚████╔╝ ██████╔╝██║ ╚═╝ ██║██╔╝ ██╗    ███████║   ██║   ╚██████╔╝██║     ██║     
  ╚═══╝  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝    ╚══════╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝     
******************************************************************************************/                                                                                               


var send_video = function(done) {
	var query = { blacklisted: false, file_present: true };
	Video.findOne(query).sort({score: -1}).exec((err, doc) => {
		if(err) return setTimeout(done, 100)

		VDMX.send(doc.osc_address, () => {
			doc.blacklisted = true;
			doc.save((doc, err) => {
				debug("waiting", doc.duration)
				setTimeout(done, doc.duration);
			});
		});
	});
}
async.forever(send_video);


var textures = { anger: 4, disgust: 2, fear: 4, joy: 7, sadness: 6 };
var next_texture = Date.now();
var send_texture = function(done) {
	var now = Date.now();
	if(now > next_texture) {
		storage.getItem("emotion", (err, value) => {
			var e = "sadness";
			if(value) e = value;
			var n = Math.ceil(Math.random()*textures[e]);
			var address = `/${emo}${n}`;
			VDMX.send(address);
			next_texture = now + 5000;
		});
	}
	setTimeout(done, 50);
}
async.forever(send_texture);



















/******************************************************************************************

██████╗  ██████╗ ███████╗████████╗██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗
██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝
██████╔╝██║   ██║███████╗   ██║   ██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗
██╔═══╝ ██║   ██║╚════██║   ██║   ██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║
██║     ╚██████╔╝███████║   ██║   ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║
╚═╝      ╚═════╝ ╚══════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝

Every 5 seconds, run the "scan" static function on the Story model.
This function looks for any videos that haven't been edited and uploaded edits/uploads them
******************************************************************************************/

async.forever((done) => {
	Story.scan(err => {
		if(err) debug(err);
		setTimeout(done, 5000);
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
	async.parallel([FootPedal.close, OnAirSign.close, VDMX.close, cam0.close, cam1.close], done);
}

module.exports = app;
