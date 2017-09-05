require('dotenv').config({ silent: true }); 
var debug = require('debug')('app');
var express = require('express');
const path = require('path');
const util = require('util');
const favicon = require('serve-favicon');
var logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
//var mongoose = require("mongoose");
var socketio = require('socket.io')
// var mongoose = require('mongoose');
var storage = require('node-persist');
var _ = require('underscore');
const { check, validationResult } = require('express-validator/check');
const { matchedData } = require('express-validator/filter');
var promisify = require("promisify-node");
var fs = promisify("fs");
const mkdirp = require('mkdirp');
var glob = require("glob")

mkdirp(process.env.STORAGE_ROOT, function(err){
	if(err) debug(err);
});


/*
┌┬┐┌─┐┌┬┐┌─┐┌┐ ┌─┐┌─┐┌─┐
 ││├─┤ │ ├─┤├┴┐├─┤└─┐├┤ 
─┴┘┴ ┴ ┴ ┴ ┴└─┘┴ ┴└─┘└─┘
*/

// mongoose.Promise = global.Promise;
// var db_url = 'mongodb://localhost:27017/nola300';
// mongoose.connect(db_url, {useMongoClient: true}, function(err){
// 	if(err) throw("couldn't connect to", db_url);
// 	else debug("connected to", db_url);
// });

/*
var finished_stories = [];

// Try to load onboard_story_id and then load the story itself
storage.init().then(() => {
	
	storage.getItem("onboard_story_id").then(id => {
		if(!id) return debug("no onboard_story_id found")

		Story.load(id).then(story => {
			if(story) {
				debug("onboard_story", story.id)
				onboard_story = story;
			}
		}).catch((err)=>{
			debug("!! failed to load", value);
		})
	}).catch((err)=>{
		debug(err);
	});

	storage.getItem("booth_story_id").then(id => {
		if(!id) return debug("no booth_story_id found")

		Story.load(id).then( story => {
			if(story) {
				debug("booth_story", story.id)
				booth_story = story;
			}
		}).catch((err)=>{
			debug("!! failed to load", value);
		})
	}).catch((err)=>{
		debug(err);
	});

	storage.getItem("finished_stories").then(ids=>{
		if(!ids) return debug("no finished_stories found");

		// TO DO: load IDS.
	});

});
*/


storage.initSync({dir: "persist"});

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
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

debug("ENV =", app.get('env'));

app.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
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
var GoogleSheet = require('./modules/GoogleSheet');
var onboard_socket = io.of('/onboard');

app.get('/onboard', function(req, res, next) {
	var data = {
		layout: false,
		places: GoogleSheet.places,
		items: GoogleSheet.items,
		themes: GoogleSheet.themes
	}
	res.render('onboard', data);
});


var valid = [
	check('fname').exists().isLength({ min: 2, max: 20 }).withMessage('Please provide a valid first name'), 
	check('lname').exists().isLength({ min: 2, max: 30 }).withMessage('Please provide a valid last name'), 
	check('email').exists().isEmail().withMessage('Please provide a valid email address'),
	check('entities.*').exists() // TODO: these are not being captured by matchedData (nor, presumably, being checked)
];

app.post('/onboard', valid, function(req, res, next) {

	// If only 1 checkbox is selected, it comes in as a straing rather than an array, so we have to coerce it.
	// TODO: Look at https://github.com/expressjs/body-parser and see if there is a better way
	if(_.isString(req.body.places)) req.body.places = [req.body.places];
	if(_.isString(req.body.items)) req.body.items = [req.body.items];
	if(_.isString(req.body.themes)) req.body.themes = [req.body.themes];

	storage.getItem("story").then(story => {
		if(story) 
			return res.json({status: "NOT_READY", messages: ["there is already a story on deck. please wait."]});

		const errors = validationResult(req);
		if(!errors.isEmpty()) 
			return res.status(422).json({ status: "ERROR", errors: err.array() });

		var data = matchedData(req); 

		storage.setItem("story", data).then(() => {
			booth_socket.emit("set_name", data.fname+" "+data.lname);
			onboard_socket.emit("submit_status", "wait");
			onboard_socket.emit("reset_form");
			res.json({status: "OK"});
		}).catch(err => {
			return res.status(422).json({ status: "ERROR", errors: err });
		});
	}).catch(err => {
		return res.status(422).json({ status: "ERROR", errors: err });
	});
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
var FootPedal = require('./modules/FootPedal')
var CanonCamera = require('./modules/CanonCamera')
var SpeechToText = require('./modules/SpeechToText');
var OnAirSign = require('./modules/OnAirSign')

var cam0 = new CanonCamera("0");
var cam1 = new CanonCamera("1");
var booth_socket = io.of('/booth');

function makeID(len) {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
	for(var i=0; i < len; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}



var start_session = function() {
	return new Promise(function(resolve, reject){
		storage.getItem("story").then(story => {
			if(!story) reject("no story present");
			else {
				debug("timer.begin(120000)")
				timer.begin(120000);
				story.start = Date.now();
				story.sentences = [];
				console.log(story);
				debug("storage.setItem")
				return storage.setItem("story", story);
			}
		}).then(() => {
			debug("cam0.record()")
			return cam0.record();
		}).then(() => {
			debug("cam1.record()")
			return cam1.record();
		}).then(() => {
			debug("OnAirSign.on()")
			return OnAirSign.on();
		}).then(() => {
			debug("SpeechToText.start()")
			return SpeechToText.start();
		}).then(resolve).catch( err => {
			debug(err);
			cam0.stop().then(cam1.stop()).then(OnAirSign.off()).then(() => {
				timer.stop();
				reject(err);
			});
		});
	});
}


var end_session = function() {
	return new Promise(function(resolve, reject){
		storage.getItem("story").then(story => {
			if(!story) return reject("no story present");

			story.id = makeID(8);
			story.end = Date.now();
			story.cam0 = util.format("%s/%s_0.mp4", process.env.STORAGE_ROOT, story.id);
			story.cam1 = util.format("%s/%s_1.mp4", process.env.STORAGE_ROOT, story.id);
			timer.stop();
			booth_socket.emit("set_message", "thank you");
			return story;

		}).then(story => {
			debug("stopping cameras ");
			return Promise.all([cam0.stop(story.cam0), cam1.stop(story.cam1)]).then(() => {
				return story;
			});
		}).then(story => {
			debug("SpeechToText.stop()")
			return SpeechToText.stop().then(() => { return story;} ); 
		}).then(story => {
			debug("saving data to text file.");
			var data = JSON.stringify(story, null, 4);
			var data_file = path.join(process.env.STORAGE_ROOT, story.id)+".json";
			return fs.writeFile(data_file, data, 'utf8');
		}).then(() => {
			debug("wait 5 seconds and then reset everything.");
			return new Promise(function(resolve, reject){
				setTimeout(() => {
					storage.removeItem("story").then(() => {
						onboard_socket.emit("submit_status", "ready");
						booth_socket.emit("reset");
						resolve();
					}).catch(reject);
				}, 5000);
			});
		}).then(resolve).catch(reject);
	});
}



var recording = false;
FootPedal.on("press", function(date){
	debug("footpedal pressed")

	if(recording) {
		debug("end_session()")
		end_session().then(() => { 
			debug("RECORDING ENDED!")
			recording = false; 
		}).catch(err => {
			debug("!!! COULD NOT STOP RECORDING")
		});
	} else {
		debug("start_session()")
		start_session().then(() => {
			debug("RECORDING BEGUN!")
			recording = true;
		}).catch(err => {
			debug("!!! COULD NOT START RECORDING")
		});
	}
});


// MAIN ROUTE
app.get('/booth', function(req, res, next) {
	res.render('booth', { layout: false });
});

                                     
booth_socket.on( "connection", function( socket ) {
	debug("booth socket client joined")
	storage.getItem("story").then(story => {
		if(story) booth_socket.emit("set_name", story.fname+" "+story.lname);
	})		
});



var timer = new CountdownTimer();
timer.on("done", function() {
	debug("TIMER DONE!");
	if(recording) end_session();
});
timer.on("tick", (str) => {
	booth_socket.emit('time', str);
});


SpeechToText.on("sentence", function(sentence){
	console.log(util.inspect(sentence, {depth: 10}));
	storage.getItem("story").then(story => {
		if(!story) return debug("!! SpeechToText result with no story to add to.")

		story.sentences.push( sentence );
		storage.setItem("story", story).catch(err => {
			debug("!! error saving story after adding sentence.")
		});
	});
});


	



/********************************************************************************************
██████╗  ██████╗ ███████╗████████╗   ██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗
██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝   ██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝
██████╔╝██║   ██║███████╗   ██║█████╗██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗
██╔═══╝ ██║   ██║╚════██║   ██║╚════╝██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║
██║     ╚██████╔╝███████║   ██║      ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║
╚═╝      ╚═════╝ ╚══════╝   ╚═╝      ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝
**********************************************************************************************/



var loop = function() {
	var pattern = util.format("%s/.json", process.env.STORAGE_ROOT);
	glob("**/*.js", options, function (er, files) {
		console.log(files);

		setTimeout(loop, 1000);
	})
}

loop();






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
app.close = function() {
	return FootPedal.close().then(OnAirSign.close()).then(cam0.close()).then(cam1.close());
}

module.exports = app;
