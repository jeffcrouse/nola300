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
var mongoose = require('mongoose');
var storage = require('node-persist');
var _ = require('underscore');

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



// Try to load onboard_story_id and then load the story itself
storage.init().then(() => {
	
	storage.getItem("onboard_story_id").then((id) => {
		if(!id) return debug("no onboard_story_id found")

		Story.load(id).then( story => {
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

	storage.getItem("booth_story_id").then((id) => {
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

var Story = require('./modules/Story_nodb')
var GoogleSheet = require('./modules/GoogleSheet');
var onboard_socket = io.of('/onboard');
var onboard_story = null;

app.get('/onboard', function(req, res, next) {
	var data = {
		layout: false,
		places: GoogleSheet.places,
		items: GoogleSheet.items,
		themes: GoogleSheet.themes
	}
	res.render('onboard', data);
});

app.post('/onboard', function(req, res, next){
	
	// If only 1 checkbox is selected, it comes in as a straing rather than an array, so we have to coerce it.
	if(_.isString(req.body.places)) req.body.places = [req.body.places];
	if(_.isString(req.body.items)) req.body.items = [req.body.items];
	if(_.isString(req.body.themes)) req.body.themes = [req.body.themes];

	//console.log("post", req.body);

	

	var a = Story.create(req.body);
	var b = a.then( story => { return story.save() });
	Promise.all([a, b]).then( ([a, story]) => {
		debug("created story", story);

		res.json({status: "OK"});

		if(session_in_progress) {
			onboard_story = story;
			storage.setItem("onboard_story_id", onboard_story.id);
		} else {
			booth_story = story;
			storage.setItem("booth_story_id", booth_story.id);
			booth_socket.emit("set_name", booth_story.name);
		}

	}).catch( errors => {
		debug(errors);
		res.json({status: "ERROR", messages: errors});
	});
});

onboard_socket.on( "connection", function( socket ) {
	var status = (session_in_progress) ? "occupied" : "empty";
	onboard_socket.emit("booth_status", status);
	debug("onboard socket client joined")
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

var session_in_progress = false;
var booth_story = null;
var cam0 = new CanonCamera("0");
var cam1 = new CanonCamera("1");
var booth_socket = io.of('/booth');



FootPedal.on("press", function(date){
	debug("footpedal pressed")
	if(!booth_story) {
		debug("!! no story set in booth");
		return;
	}

	// TO DO: Make this all async/promisified
	if(session_in_progress) {

		onboard_socket.emit("booth_status", "empty");

		OnAirSign.off();

		var path_cam0 = booth_story.getVideoPath(0);
		var path_cam1 = booth_story.getVideoPath(1);

		timer.stop();
		cam0.stop(path_cam0);
		cam1.stop(path_cam1);
		SpeechToText.stop()
		story.session.end = Date.now();

		booth_story.finish();
		booth_story = null;

		if(onboard_story) {
			booth_story = onboard_story;
			onboard_story = null;
			storage.setItem("onboard_story_id", null);
			storage.setItem("booth_story_id", booth_story.id);
			booth_socket.emit("set_name", booth_story.name);
		}

		session_in_progress = false;

	} else {

		var path_cam0 = booth_story.getVideoPath(0);
		var path_cam1 = booth_story.getVideoPath(1);

		onboard_socket.emit("booth_status", "occupied");
		onboard_socket.emit("reset_form", true);
		


		OnAirSign.on();
		timer.begin(120000);
		cam0.record(path_cam0);
		cam1.record(path_cam1);
		SpeechToText.start();
		booth_story.session.start = Date.now();
		session_in_progress = true;
	}
});


// MAIN ROUTE
app.get('/booth', function(req, res, next) {
	res.render('booth', { layout: false });
});

                                     
booth_socket.on( "connection", function( socket ) {
	debug("booth socket client joined")
	if(booth_story) booth_socket.emit("set_name", booth_story.name);
});


// setInterval(() => {
// 	booth_socket.emit('time', timer.get_time_str())
// }, 100);




var timer = new CountdownTimer();
timer.on("done", () => {
	if(session_in_progress) {

		debug("TODO: FORCEFULLY END SESSION HERE")
	}
});


SpeechToText.on("sentence", function(sentence){
	console.log(util.inspect(sentence, {depth: 10}));
	if(booth_story) 
		booth_story.addSentence( sentence );
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
	Promise.all([FootPedal.close(), cam0.close(), cam1.close()]).then(done).catch(console.error);
}

module.exports = app;
