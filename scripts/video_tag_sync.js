var GoogleSpreadsheet = require('google-spreadsheet');
var debug = require('debug')('googlesheet');
var creds = require('../NOLA300-4870992b91c4.json');
var doc = new GoogleSpreadsheet('1aaI3wPWvhK-YFqYBjF8RtFjqquytUYANbOYGfnqeVbA');
var Video = require('../Video')
var async = require('async');
var mongoose = require('mongoose');



mongoose.Promise = global.Promise;
var db_url = 'mongodb://localhost:27017/nola300-client';
mongoose.connect(db_url, {useMongoClient: true}, function(err){
	if(err) throw("couldn't connect to", db_url);
	else debug("connected to", db_url);
});


var proc = function(s){ return s.trim().toLowerCase() }



Video.remove({}, err => {
	Video.scan(err => {
		doc.useServiceAccountAuth(creds, function (err) {
			doc.getRows(1, function (err, rows) {
				if(err) return console.log(err);

				async.forEachSeries(rows, (row, done) => {
					Video.findOne({name: row.filename}).exec((err, doc)=>{
						if(err) return done(err)
						if(!doc) return done(row.filename+" not found");

						doc.places = row.places.split(",").map(proc);
						doc.items = row.items.split(",").map(proc);
						doc.themes = row.themes.split(",").map(proc);

						doc.save(done);
					});
				}, function(err){
					if(err) console.log(err);

					console.log("done")
					process.exit();
				});
			})
		});
	});
});

