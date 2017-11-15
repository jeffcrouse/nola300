var osc = require('node-osc');
const async = require('async');
var mongoose = require('mongoose');
var Video = require('../Video')


/****************************************************************************************
┌┬┐┌─┐┌┬┐┌─┐┌┐ ┌─┐┌─┐┌─┐  
 ││├─┤ │ ├─┤├┴┐├─┤└─┐├┤   
─┴┘┴ ┴ ┴ ┴ ┴└─┘┴ ┴└─┘└─┘  
****************************************************************************************/


var db_url = 'mongodb://localhost:27017/nola300-client';
mongoose.connect(db_url, {useMongoClient: true}, function(err){
	if(err) throw("couldn't connect to", db_url);
	else console.log("connected to", db_url);

	Video.update({}, {$set: {'blacklisted' : false}}, {multi: true}, (err) => {
		if(err) console.log(debug);
	});
});





/****************************************************************************************
╔═╗╔═╗╔═╗
║ ║╚═╗║  
╚═╝╚═╝╚═╝
****************************************************************************************/


var client = new osc.Client('127.0.0.1', 1234);

client.send("/random", 1, () => {});

// var opacity = 0;
// var theta = 0;

// async.forever(done => {
// 	opacity = 0.5 + Math.sin(theta) * 0.5;
// 	client.send('/opacity', opacity,  () => { });
// 	theta += (Math.PI / 50);
// 	setTimeout(done, 50);
// });


/*
var send_video = function(done) {

	
	var query = { blacklisted: false, file_present: true };
	Video.findOne(query).sort({score: -1}).exec((err, doc) => {
		if(err||!doc) {
			console.log("no videos found for VDMX. waiting...")
			return setTimeout(done, 1000);
		}
		console.log(doc.osc_address);
		doc.blacklisted = true;
		doc.save((err) => {
			console.log("waiting", doc.duration)
			setTimeout(done, doc.duration*1000);
		})

	});
}
async.forever(send_video);
*/
