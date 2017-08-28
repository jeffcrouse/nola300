require('dotenv').config({ silent: true }); 
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require("mongoose");
var socketio = require('socket.io')
var CountdownTimer = require('./CountdownTimer')



var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('./client_secret.json');
var doc = new GoogleSpreadsheet('1-8qrqjGRQ6O8kGfZ-gFILUmwIlSU5f--mX-v3wViHrc');
var places = {};
var items = {}
var themes = {};

var make_key = function(name) {
	return name.toLowerCase().replace(/ /g,"_");
}

doc.useServiceAccountAuth(creds, function (err) {
	doc.getRows(1, function (err, rows) {

		rows.forEach((row) => {
			var key = make_key(row.name);
			places[key] = row.name;
		});

		console.log("places", places);
	});
	doc.getRows(2, function (err, rows) {
		rows.forEach((row) => {
			var key = make_key(row.name);
			items[key] = row.name;
		});
		console.log("items", items);
	});
	doc.getRows(3, function (err, rows) {
		rows.forEach((row) => {
			var key = make_key(row.name);
			themes[key] = row.name;
		});
		console.log("themes", themes);
	});
});


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.set('view options', { layout: 'layout' });

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.png')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



app.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

app.get('/onboard', function(req, res, next) {

	var data = {
		layout: false,
		places: places,
		items: items,
		themes: themes,
		title: 'Nola300 Onboarding'
	}
	res.render('onboard', data);
});

app.post('/onboard', function(req, res, next){
	
	
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

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});


app.timer = new CountdownTimer();
app.timer.on("done", () => {
	console.log("TIMER DONE!");
});




var io = socketio();
var boothns = io.of('/booth');

// socket.io events
boothns.on( "connection", function( socket ) {
	console.log("booth client joined")
	app.timer.begin();
});

setInterval(() => {
	boothns.emit('time', app.timer.get_time())
}, 100);



var onbns = io.of('/onboard');
onbns.on( "connection", function( socket ) {
   console.log("onboard client joined")
});



app.io = io;
module.exports = app;
