var osc = require('node-osc');
const async = require('async');
var mongoose = require('mongoose');

/****************************************************************************************
┌┬┐┌─┐┌┬┐┌─┐┌┐ ┌─┐┌─┐┌─┐  
 ││├─┤ │ ├─┤├┴┐├─┤└─┐├┤   
─┴┘┴ ┴ ┴ ┴ ┴└─┘┴ ┴└─┘└─┘  
****************************************************************************************/


// var db_url = 'mongodb://localhost:27017/nola300-client';
// mongoose.connect(db_url, {useMongoClient: true}, function(err){
// 	if(err) throw("couldn't connect to", db_url);
// 	else debug("connected to", db_url);
// });


// var query = { file_present: true };
// Video.findRandom(query, {}, {limit: 40}, (err, docs) => {
// 	if (err) return debug(results); // 5 elements

// 	var playlist = docs.map(d => { return d.as_playlist(); })
// 	done(null);
// });




/****************************************************************************************
╔═╗╔═╗╔═╗
║ ║╚═╗║  
╚═╝╚═╝╚═╝
****************************************************************************************/


var client = new osc.Client('127.0.0.1', 1234);

var opacity = 0;
var theta = 0;

async.forever(done => {
	opacity = 0.5 + Math.sin(theta) * 0.5;
	client.send('/opacity', opacity,  () => { });
	theta += (Math.PI / 50);
	setTimeout(done, 50);
});



async.forever(done => {
	var n = Math.ceil(Math.random() * 4);
	console.log('/vid'+n);
	client.send('/vid'+n, n, () => { });
	setTimeout(done, 1000);
});




