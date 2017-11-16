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
var StateManager = require('./modules/StateManager');
var moment = require('moment');


if(process.env.USE_MUSIC) {
	var VLCPlayer = require('./modules/VLCPlayer');
	var music = new VLCPlayer(process.env.MUSIC_PATH);
	music.fadeIn();
}

if(process.env.USE_ONAIR) {
	var OnAirSign = new ArduinoDevice("serialNumber", "85438333935351A02251", "onair");
}



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
	clear_blacklist();
});


var clear_blacklist = done => {
	done = done || function(err){ if(err) debug(err); }
	Video.update({}, {$set: {'blacklisted' : false}}, {multi: true}, done);
}







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
	res.render(process.env.NOLA_LOCATION, data);
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
		story.location = process.env.NOLA_LOCATION;
		story.numCameras = process.env.NUM_CAMERAS;

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
app.get('/playlist', function(req, res, next) {
	var data = { layout: false };
	res.render('playlist', data);
});



/**
*	Open a browser window with the app status 
*/
//exec(`open http://127.0.0.1:3000`);














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
var video_socket = io.of('/video');
var emotion_socket = io.of('/emotion')

//-----------------------------------------------------------------------------------------
ui_socket.on("connection", function( client ) {
	debug("/ui client joined")

	client.emit("state", state.get());

	Story.findOne({active:true}).exec((err, doc) => {
		if(err) throw new Error(err);
		if(doc) {
			client.emit("story", doc);
			client.emit("emotion", doc.value);
		}
	});

	client.on("pedal", on_pedal);

	client.on("cancel", () => {
		end_session(true);
	});

	client.on('disconnect', () => {
		debug("/ui client left")
	});
});



var send_random_videos = done => {
	var query = { file_present: true,  blacklisted: false };
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
	

	client.on('disconnect', () => {
		debug("/video client left")
	});

	client.on("blacklist", function(id) {
		Video.findById(id, function (err, doc) {
			doc.blacklisted = true;
			doc.save((err) => {
				if(err) debug(err);
			})
		});
	});

	client.on("get_random", () => {
		var query = { file_present: true,  blacklisted: false };
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

var cameras = [];
for(var i=0; i<process.env.NUM_CAMERAS; i++) {
	cameras.push( new CanonCamera(i.toString()) );
}


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

	if(process.env.USE_MUSIC) music.fadeOut();
	state.set(APPSTATES.STARTING);

	var update_story = done => {
		Story.findOne({active:true}).exec((err, doc) => {
			if(err) return done(err);
			if(!doc) return done("no user present. ignoring.");
			
			doc.sentences = [];	// reset the sentences in case this is a re-record
			doc.startTime = Date.now();
			doc.save(done);
		});
	}

	var start_devices = done => {
		var tasks = [SpeechToText.start];
		for(var i=0; i<cameras.length; i++) {
			tasks.push(  cameras[i].record.bind(cameras[i]) );
		}
		if(process.env.USE_ONAIR) tasks.push(OnAirSign.on);
		async.parallel(tasks, done); 
	}

	// send_random_videos
	async.series([update_story, send_random_videos, start_devices, clear_blacklist], err => {
		if(err) return debug(err);
		timer.begin(45000);
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
	
	if(process.env.USE_MUSIC) music.fadeIn();

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
		var tasks = [SpeechToText.stop];
		if(process.env.USE_ONAIR) tasks.push(OnAirSign.off);
		for(var i=0; i<cameras.length; i++) {
			var camera = cameras[i];
			tasks.push(camera.cancel.bind(camera));
		}
		async.parallel(tasks, done);
	}

	var stop_devices = done => {
		debug("stop_devices");
		var tasks = [SpeechToText.stop];
		for(var i=0; i<cameras.length; i++) {
			var camera = cameras[i];
			var path = `${story.directory}/vid_0${i}.mp4`;
			tasks.push( camera.stop.bind(camera, path) );
		}
		if(process.env.USE_ONAIR) tasks.push(OnAirSign.off);
		async.parallel(tasks, done);
	}

	var mark_ready = done => {
		story.readyForEdit = true;
		story.save(done);
	}

	var clear_active = done => {
		debug("clear_active");
		Story.update({}, {$set: {'active' : false}}, {multi: true}, done);
	}

	var clear_blacklist = done => {
		Video.update({}, {$set: {'blacklisted' : false}}, {multi: true}, done);
	}

	var tasks = [];
	if(cancel){
		tasks = [cancel_devices, clear_active, clear_blacklist];
	} else {
		tasks = [wait, get_story, mkdir, stop_devices, mark_ready, clear_active, clear_blacklist];
	}

	async.series(tasks, (err) => {
		ending = false;
		if(err) return debug(err);
		state.set(APPSTATES.IDLE);
	});
}





/**
*	FootPedal fires a "press" event any time the pedal is pressed.
* 	Depending on the current APPSTATE, do something...
*/
var on_pedal = function(date) {
	debug("footpedal pressed", date);

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

if(process.env.USE_FOOTPEDAL) {
	var FootPedal = new ArduinoDevice("manufacturer", "Teensyduino", "footpedal");
	FootPedal.on("d", on_pedal);
}




/****************************************************************************************
███████╗████████╗ █████╗ ████████╗██╗   ██╗███████╗
██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██║   ██║██╔════╝
███████╗   ██║   ███████║   ██║   ██║   ██║███████╗
╚════██║   ██║   ██╔══██║   ██║   ██║   ██║╚════██║
███████║   ██║   ██║  ██║   ██║   ╚██████╔╝███████║
╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚══════╝
****************************************************************************************/

/**
* 	Continually send the status of the devices
*/
async.forever(done => {
	var devices = [];
	if(process.env.USE_ONAIR) devices.push({name: "onair", status: OnAirSign.getIsOpened() })
	if(process.env.USE_FOOTPEDAL) devices.push({name: "footpedal", status: FootPedal.getIsOpened() })
	for(var i=0; i<cameras.length; i++)
		devices.push({name: `cam${i}`, status: cameras[i].getIsOpened()});

	ui_socket.emit("devices", devices);
	setTimeout(done, 1000);
}, err => {
	debug("cam_status exited", err);
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

		if(sentence.has_nlu()) {
			var terms = sentence.get_search_terms();
			debug("search terms",  terms);

			Video.getPlaylist(terms, 20, (err, playlist) => {
				if(err) return debug(err);
				playlist = 	playlist.map(d => { return d.as_playlist(); });
				video_socket.emit("playlist", playlist);
			});
		}

		if(sentence.has_emotion()) {
			var emo = sentence.get_top_emotion();
			debug("emotion", emo);
			emotion_socket.emit('emotion', emo);
		}
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
	var tasks = [];
	for(var i=0; i<cameras.length; i++) {
		tasks.push(cameras[i].close);
	}

	if(process.env.USE_ONAIR) 		tasks.push(OnAirSign.exit);
	if(process.env.USE_MUSIC) 		tasks.push(music.quit);
	if(process.env.USE_FOOTPEDAL) 	tasks.push(FootPedal.exit);

	async.parallel(tasks, done);
}

module.exports = app;
