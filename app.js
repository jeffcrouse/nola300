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
var CountdownTimer = require('./modules/CountdownTimer')
var FootPedal = require('./modules/FootPedal')
var GoogleSheet = require('./modules/GoogleSheet')
var CanonCamera = require('./modules/CanonCamera')
var Story = require('./modules/Story')


var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var db_url = 'mongodb://localhost:27017/nola300';
mongoose.connect(db_url, {useMongoClient: true}, function(err){
	if(err) throw("couldn't connect to", db_url);
	else debug("connected to", db_url);
});



// var cam0 = new CanonCamera("0");
// var cam1 = new CanonCamera("1");


var app = express();

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


/**************************************************
██████╗  ██████╗ ██╗   ██╗████████╗███████╗███████╗
██╔══██╗██╔═══██╗██║   ██║╚══██╔══╝██╔════╝██╔════╝
██████╔╝██║   ██║██║   ██║   ██║   █████╗  ███████╗
██╔══██╗██║   ██║██║   ██║   ██║   ██╔══╝  ╚════██║
██║  ██║╚██████╔╝╚██████╔╝   ██║   ███████╗███████║
╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝
**************************************************/                                                  

app.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

app.get('/onboard', function(req, res, next) {
	var data = {
		layout: false,
		places: GoogleSheet.places,
		items: GoogleSheet.items,
		themes: GoogleSheet.themes,
		title: 'Nola300 Onboarding'
	}
	res.render('onboard', data);
});

app.post('/onboard', function(req, res, next){

	var story = new Story();
	story.name.first = req.body.fname;
	story.name.last = req.body.lname;
	story.email = req.body.email;

	if(req.body.places) 	story.entities.places = req.body.places;
	if(req.body.items) 		story.entities.items = req.body.items;
	if(req.body.themes) 	story.entities.themes = req.body.themes;

	story.save(function(err, doc){
		if(err) {
			var errors = Object.keys(err.errors).map(function(key){
				return err.errors[key].message;
			});	
			res.json({status: "ERROR", messages: errors});
		} else {
			res.json({status: "OK", shortID: doc.shortID});
		}
	});
});

app.get('/booth', function(req, res, next) {
	res.render('booth', { layout: false, title: 'Nola300 Booth Interface' });
});

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






/**************************************************************************
███████╗ ██████╗  ██████╗ ████████╗██████╗ ███████╗██████╗  █████╗ ██╗     
██╔════╝██╔═══██╗██╔═══██╗╚══██╔══╝██╔══██╗██╔════╝██╔══██╗██╔══██╗██║     
█████╗  ██║   ██║██║   ██║   ██║   ██████╔╝█████╗  ██║  ██║███████║██║     
██╔══╝  ██║   ██║██║   ██║   ██║   ██╔═══╝ ██╔══╝  ██║  ██║██╔══██║██║     
██║     ╚██████╔╝╚██████╔╝   ██║   ██║     ███████╗██████╔╝██║  ██║███████╗
╚═╝      ╚═════╝  ╚═════╝    ╚═╝   ╚═╝     ╚══════╝╚═════╝ ╚═╝  ╚═╝╚══════╝
**************************************************************************/                                                                   


var timer = new CountdownTimer();
timer.on("done", () => {
	console.log("TIMER DONE!");
});

FootPedal.on("press", function(date){
	debug("footpedal pressed")
});





/**************************************************************
███████╗ ██████╗  ██████╗██╗  ██╗███████╗████████╗██╗ ██████╗ 
██╔════╝██╔═══██╗██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝██║██╔═══██╗
███████╗██║   ██║██║     █████╔╝ █████╗     ██║   ██║██║   ██║
╚════██║██║   ██║██║     ██╔═██╗ ██╔══╝     ██║   ██║██║   ██║
███████║╚██████╔╝╚██████╗██║  ██╗███████╗   ██║██╗██║╚██████╔╝
╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝╚═╝╚═╝ ╚═════╝ 
**************************************************************/                                             

var io = socketio();


/*
┌┐ ┌─┐┌─┐┌┬┐┬ ┬
├┴┐│ ││ │ │ ├─┤
└─┘└─┘└─┘ ┴ ┴ ┴
*/

var booth = io.of('/booth');
booth.on( "connection", function( socket ) {
	debug("booth client joined")
	app.timer.begin();
});


setInterval(() => {
	booth.emit('time', timer.get_time())
}, 100);



/*
┌─┐┌┐┌┌┐ ┌─┐┌─┐┬─┐┌┬┐
│ ││││├┴┐│ │├─┤├┬┘ ││
└─┘┘└┘└─┘└─┘┴ ┴┴└──┴┘
*/

var onboard = io.of('/onboard');
onboard.on( "connection", function( socket ) {
   debug("onboard client joined")
});



app.io = io;
module.exports = app;
