require('dotenv').config({ silent: true }); 
var debug = require('debug')('app');
var express = require('express');
const path = require('path');
const util = require('util');
const favicon = require('serve-favicon');
var logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
var socketio = require('socket.io')
var mongoose = require('mongoose');
var storage = require('node-persist');
var _ = require('underscore');
const { check, validationResult } = require('express-validator/check');
const { matchedData } = require('express-validator/filter');
var promisify = require("promisify-node");
var fs = promisify("fs");
const mkdirp = require('mkdirp');
var shortid = require('shortid');
var postprocess = require("./PostProcess");
var Video = require('./Video')
const async = require('async');
var hbs = require('hbs');


mkdirp(process.env.STORAGE_ROOT, function(err){
	if(err) debug(err);
});
mkdirp(process.env.VIDEO_ROOT, function(err){
	if(err) debug(err);
});



async.forever(postprocess, err => {
	debug("postprocess returned an error:", err);
});




/*
┌┬┐┌─┐┌┬┐┌─┐┌┐ ┌─┐┌─┐┌─┐
 ││├─┤ │ ├─┤├┴┐├─┤└─┐├┤ 
─┴┘┴ ┴ ┴ ┴ ┴└─┘┴ ┴└─┘└─┘
*/

mongoose.Promise = global.Promise;
var db_url = 'mongodb://localhost:27017/nola300';
mongoose.connect(db_url, {useMongoClient: true}, function(err){
	if(err) throw("couldn't connect to", db_url);
	else debug("connected to", db_url);
});


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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

debug("ENV =", app.get('env'));

app.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

hbs.registerHelper( "join", function( array, sep ) {
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
	check('entities.*').exists() // TODO: make sure there are at least 2 entities selected.
];

app.post('/onboard', valid, function(req, res, next) {
	debug("req.body", req.body);

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
var recording = false;



var start_session = function() {
	storage.getItem("story", (err, story) => {
		if(err) throw new Error(err);
		if(!story) throw new Error("no story present");
		
		timer.begin(120000);
		story.start = Date.now();
		story.sentences = [];
		debug("storage.setItem")

		storage.setItem("story", story, err => {
			if(err) throw new Error("couldn't save story");

			async.parallel([cam0.record.bind(cam0, null), cam1.record.bind(cam0, null), OnAirSign.on, SpeechToText.start], err => {
				if(err) throw new Error("error communicating with devices");

				debug("recording!");
				recording = true;
			});
		});
	});
}


var end_session = function() {
	storage.getItem("story", (err, story) => {
		if(err) throw new Error(err);
		if(!story) throw new Error("no story present");
		
		timer.stop();
		booth_socket.emit("set_message", "thank you");

		story.id = shortid.generate();
		story.end = Date.now();

		debug("stopping cameras, STT, and OnAirSign");
		
		var stop_devices = function(done) {
			var stop_0 = (cb) => { cam0.stop(util.format("%s/%s_0.mp4", process.env.STORAGE_ROOT, story.id), cb); }
			var stop_1 = (cb) => { cam1.stop(util.format("%s/%s_1.mp4", process.env.STORAGE_ROOT, story.id), cb); }
			async.parallel([stop_0, stop_1, SpeechToText.stop, OnAirSign.off], done);
		}

		var save_to_disk = function(done) {
			var data_file = path.join(process.env.STORAGE_ROOT, story.id)+".json";
			debug("saving to disk", data_file);
			var data = JSON.stringify(story, null, 4);
			return fs.writeFile(data_file, data, 'utf8', done);
		}

		var remove_from_storage = function(done) {
			storage.removeItem("story", done);
		}
		
		var wait_5 = function(done) {
			setTimeout(done, 5000);
		}

		async.series([stop_devices, save_to_disk, remove_from_storage, wait_5], (err) => {
			if(err) throw new Error(err);

			booth_socket.emit("reset");
			onboard_socket.emit("submit_status", "ready");

			debug("not recording!");
			recording = false;
		})
	});
}


FootPedal.on("press", function(date){
	debug("footpedal pressed")

	if(recording) {
		debug("end_session()")
		end_session();
	} else {
		debug("start_session()")
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
	debug(util.inspect(sentence, {depth: 5}));
	storage.getItem("story", (err, story) => {
		if(err) throw new Error(err);
		if(!story) return debug("!! SpeechToText result with no story to add to.")

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
		places: GoogleSheet.places,
		items: GoogleSheet.items,
		themes: GoogleSheet.themes
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
	async.parallel([FootPedal.close, OnAirSign.close, cam0.close, cam1.close], done);
}

module.exports = app;
