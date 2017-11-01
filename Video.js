require('dotenv').config({ silent: true }); 
var debug = require('debug')('video');
var mongoose = require('mongoose');
const path = require('path');
var Schema = mongoose.Schema;
const glob = require('glob');
const async = require('async');
const fs = require('fs');
const exec = require("child_process").exec;
var random = require('mongoose-simple-random');
var which = require('which');

var ffprobe = "ffprobe";
which('ffprobe', function (err, resolvedPath) {
	if(err) throw err;
	ffprobe = resolvedPath;
});



var VideoSchema = Schema({
	name: 			{ type: String, required: true },
	file_present:   { type: Boolean, default: false },
	duration: 		{ type: Number, default: null },
	score: 			{ type: Number, default: 0 },
	places: 		[ { type: String } ],
	items: 			[ { type: String } ],
	themes: 		[ { type: String } ]
});

VideoSchema.plugin(random);

var lean = function(doc, ret, options) {
	ret.id = ret._id;
	delete ret._id;
	delete ret.__v;
	return ret;
}

if (!VideoSchema.options.toObject) VideoSchema.options.toObject = {};
VideoSchema.options.toObject.transform = lean;

if (!VideoSchema.options.toJSON) VideoSchema.options.toJSON = {};
VideoSchema.options.toJSON.transform = lean;

// --------------------------------------------------------------------------------------
VideoSchema.virtual('full_path').get(function(){
	return path.join(process.env.VIDEO_ROOT, this.name);
});

// --------------------------------------------------------------------------------------
VideoSchema.pre('save', function(next) {
	if(this.duration) next(null);
	else this.set_duration(next);
});

// --------------------------------------------------------------------------------------
VideoSchema.methods.as_playlist = function() {
	return {
		id: this._id,
		path: this.full_path,
		score: this.score
	};
}

// --------------------------------------------------------------------------------------
VideoSchema.methods.set_duration = function(callback) {
	var cmd = `${ffprobe} -i "${this.full_path}"`;
	debug(cmd);
	exec(cmd, (err, stdout, stderr) => {
		var matches = stderr.match(/Duration:\s{1}(\d+?):(\d+?):(\d+\.\d+?),/);
		if(err) {
			callback(err);
		} else if(!matches || matches.length < 4) {
			callback("Couldn't determine video duration");
		} else {
			var hours = parseInt(matches[1], 10);
			var minutes = parseInt(matches[2], 10);
			var seconds = parseFloat(matches[3], 10);
			var duration = (hours*3600) + (minutes*60) + seconds;

			this.duration = duration;
			callback();
		}
	});
}

// --------------------------------------------------------------------------------------
VideoSchema.statics.list = function(callback) {
	return this.find().exec( function( err, videos ) {
		if( err ) return callback( err );
		callback(null, videos);
	});
};


// --------------------------------------------------------------------------------------
VideoSchema.statics.scanFiles = function(done) {

	debug("scan_files", process.env.VIDEO_ROOT)
	glob("*.mp4", {cwd: process.env.VIDEO_ROOT}, (err, files) => {
		if( err ) return done( err );

		//debug("looping through mp4s", files)
		async.eachSeries(files, (item, callback) => {
			var _root = path.basename(item);
			//debug("searching for", _root, "in database");

			this.find({name: _root}).exec((err, docs) => {
				if(err) return callback(err);

				var video = null;
				if(docs.length==0) {
					video = new this({name: _root});
				} else {
					video = docs[0]
				}
				video.file_present = true;
				video.save(callback);
			});
		}, done);
	})
} 

// --------------------------------------------------------------------------------------
VideoSchema.statics.scanDatabase = function(done) {
	
	debug("scan_db")

	this.find().exec( ( err, docs ) => {
		if( err ) return done( err );
		//debug("looping through db documents")

		async.eachSeries(docs, (item, callback) => {
			var _path = path.join(process.env.VIDEO_ROOT, item.name)

			//debug("looking for", _path, "in filesystem");
			fs.stat(_path, (err, stat) => {
				if(err == null) {
					item.file_present = true;
				} else if(err.code == 'ENOENT') {
					item.file_present = false;
				} else {
					console.log('Some other error: ', err.code);
				}
				item.save(callback);
			});
		}, done);
	});
}


// --------------------------------------------------------------------------------------
VideoSchema.statics.scan = function(callback) {
	return async.series([this.scanFiles.bind(this), this.scanDatabase.bind(this)], callback);
}


// --------------------------------------------------------------------------------------
var get_score = function(terms, tags) {
	var results = [];

	terms.forEach((t) => {
		var i = tags.indexOf( t.text.toLowerCase() ); 
		if(i > -1) {
			//debug("found", t.text, "with relevance", t.relevance)
			results.push(t);
		}
	});

	var total = results.reduce((total, term) => { 
		return total + term.relevance; 
	}, 0);

	return total;
}

// --------------------------------------------------------------------------------------
VideoSchema.statics.setScores = function(terms, callback) {

	// this.update({}, {'$set': {'score' : 0}}, {multi: true}, function(err, properties){
	// 	if(err) return callback(err);

		this.find().exec( function( err, docs ) {
			if( err ) return callback( err );

			async.each(docs, (doc, done) => {

				var places = get_score(terms, doc.places);
				var items = get_score(terms, doc.items);
				var themes = get_score(terms, doc.themes);

				doc.score = (items*3) + (places*2) + (themes);

				doc.save(done);

			}, callback);
		});
	//});
}

// --------------------------------------------------------------------------------------
VideoSchema.statics.getPlaylist = function(terms, blacklist, length, callback) {
	this.setScores(terms, (err) => {
		if(err) return callback(err);

		var query = { 
			_id: { "$nin": blacklist },
			file_present: true,
			score: { "$gt": 0 }  
		};
		this.find(query).sort({'score': -1}).exec((err, scored) => {
			if(err) return callback(err);

			if(scored.length >= length) {
				return callback(null, scored);
			} else {
				var limit = length - scored.length;				
				var query = { 
					file_present: true,  
					_id: { "$nin": blacklist },
					_id: { "$nin": scored.map( doc => { return doc._id }) } 
				};
				this.findRandom(query, {}, {"limit": limit}, (err, random) => {
					if (err) return callback(err);

					callback(null, scored.concat(random));
				});
			} // end else
		});
	});
}


module.exports = mongoose.model( 'Video', VideoSchema, 'videos' );

