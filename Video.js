require('dotenv').config({ silent: true }); 
var debug = require('debug')('video');
var mongoose = require('mongoose');
const path = require('path');
var Schema = mongoose.Schema;
const glob = require('glob');
const async = require('async');
const fs = require('fs');
const exec = require("child_process").exec;


var VideoSchema = Schema({
	name: 			{ type: String, required: true },
    file_present:   { type: Boolean, default: false },
    duration:       { type: Number, default: null },
	places: 		[ { type: String } ],
	items: 			[ { type: String } ],
	themes: 		[ { type: String } ]
});


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

// ----------------------------------------------------------
VideoSchema.virtual('full_path').get(function(){
    return path.join(process.env.VIDEO_ROOT, this.name);
});


// ----------------------------------------------------------
VideoSchema.methods.as_playlist = function() {
    return {
        path: this.full_path,
        id: this._id
    };
}


// ----------------------------------------------------------
VideoSchema.methods.set_duration = function(callback) {
    var cmd = `ffprobe -i "${this.full_path}"`;
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

// ----------------------------------------------------------
VideoSchema.pre('save', function(next) {
    if(this.duration) next(null);
    else this.set_duration(next);
});

// ----------------------------------------------------------
VideoSchema.statics.list = function(callback) {
    return this.find().exec( function( err, videos ) {
        if( err ) return callback( err );
        callback(null, videos);
    });
};

// ----------------------------------------------------------
VideoSchema.statics.scanFiles = function(done) {
    var self = this;

    debug("scan_files", process.env.VIDEO_ROOT)
    glob("*.mp4", {cwd: process.env.VIDEO_ROOT}, function(err, files){
        if( err ) return done( err );

        debug("looping through mp4s", files)
        async.eachSeries(files, function(item, callback){
            var _root = path.basename(item);
            debug("searching for", _root, "in database");

            self.find({name: _root}).exec(function(err, docs) {
                if(err) return callback(err);

                var video = null;
                if(docs.length==0) {
                    video = new self({name: _root});
                } else {
                    video = docs[0]
                }
                video.file_present = true;
                video.save(callback);
            });
        }, done);
    })
} 

// ----------------------------------------------------------
VideoSchema.statics.scanDatabase = function(done) {
    debug("scan_db")
    var self = this;
    self.find().exec( function( err, docs ) {
        if( err ) return done( err );
        debug("looping through db documents")

        async.eachSeries(docs, function(item, callback) {
            var _path = path.join(process.env.VIDEO_ROOT, item.name)

            debug("looking for", _path, "in filesystem");
            fs.stat(_path, function(err, stat) {
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

// ----------------------------------------------------------
VideoSchema.statics.scan = function(callback) {
    return async.series([this.scanFiles.bind(this), this.scanDatabase.bind(this)], callback);
}

module.exports = mongoose.model( 'Video', VideoSchema, 'videos' );