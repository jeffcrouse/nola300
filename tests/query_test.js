require('dotenv').config({ silent: true }); 
var debug = require('debug')('qt');
var mongoose = require('mongoose');
var Video = require('../Video')


mongoose.Promise = global.Promise;
var db_url = 'mongodb://localhost:27017/nola300-client';
mongoose.connect(db_url, {useMongoClient: true}, function(err){
	if(err) throw("couldn't connect to", db_url);
	else debug("connected to", db_url);

	var blacklist = [];
	var query = { 
		_id: { "$nin": blacklist },
		file_present: true,
		score: { "$gt": 0 }  
	};

	Video.find(query).sort({'score': -1}).exec((err, scored) => {
		console.log(scored);
		process.exit();
	});
});
