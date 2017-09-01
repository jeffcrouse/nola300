require('dotenv').config({ silent: true }); 
var debug = require('debug')('app');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require("mongoose");
var socketio = require('socket.io')
var mongoose = require('mongoose');
var storage = require('node-persist');

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
//var Story = require('./modules/Story')



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

var Story = require('modules/Story');
var GoogleSheet = require('./modules/GoogleSheet');
var onboard_socket = io.of('/onboard');
var onboard_story = null;

storage.init().then(() => {
	storage.getItem("onboard_story").then((value) => {
		onboard_story = new Story(value);
	});
});

onboard_socket.emit("booth_status", "empty");

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
	var story = new Story();
	story.populate(req.body, true).then((story)=>{
		onboard_story = story;
		res.json( {status: "OK"} );
	}).catch( (errors)=>{
		res.json({status: "ERROR", messages: errors});
	});
});

onboard_socket.on( "connection", function( socket ) {
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

	if(session_in_progress) {
		end_session();
	} else {
		if(booth_story==null) {
			
		}
		start_session();
	}
});


// MAIN ROUTE
app.get('/booth', function(req, res, next) {
	res.render('booth', { layout: false });
});

                                     


booth_socket.on( "connection", function( socket ) {
	debug("booth socket client joined")
	app.timer.begin();
});


setInterval(() => {
	booth_socket.emit('time', timer.get_time_str())
}, 100);


var onair_sign = function(on) {
	return new Promise((resolve, reject) => {
		resolve();
	});
}

var start_session = function() {
	onboard.emit("booth_status", "occupied");
	onboard.emit("reset_form", true);
	timer.begin(120000);
	onair_sign(true);
	cam0.record();
	cam1.record();
	SpeechToText.start();
	story.record.start = Date.now();
	session = true;
}
var end_session = function() {
	onboard.emit("booth_status", "empty");
	// pause and then send next story to booth interface
	onair_sign(false);

	var path_cam0 = session_story.getVideoPath(0);
	var path_cam1 = session_story.getVideoPath(1);

	timer.stop();
	cam0.stop(path_cam0);
	cam1.stop(path_cam1);
	SpeechToText.stop()
	story.record.end = Date.now();
	session = false;
}

var timer = new CountdownTimer();
timer.on("done", () => {
	if(session) {
		end_session();
	}
});


SpeechToText.on("sentence", function(sentence){
	console.log(util.inspect(sentence, {depth: 10}));
	story.addSentence( sentence );
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
