require('dotenv').config({ silent: true }); 
var debug = require('debug')('postprocess');
const path = require('path');
const util = require('util');
var fs = require("fs");
var glob = require("glob");
const exec = require('child_process').exec;
const async = require('async');
var AWS = require('aws-sdk');

AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
var s3bucket = new AWS.S3({params: {Bucket: 'nola300'}});


/********************************************************************************************
██████╗  ██████╗ ███████╗████████╗   ██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗
██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝   ██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝
██████╔╝██║   ██║███████╗   ██║█████╗██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗
██╔═══╝ ██║   ██║╚════██║   ██║╚════╝██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║
██║     ╚██████╔╝███████║   ██║      ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║
╚═╝      ╚═════╝ ╚══════╝   ╚═╝      ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝
**********************************************************************************************/

var process_story = function(filename, callback) {

	fs.readFile(filename, "utf8", function(err, data){
		if(err) return done(err);
		var obj = null;
		
		try {
			obj = JSON.parse(data);
		} catch(e) {
			return done(e);
		}

		var _root = util.format("%s/%s", process.env.STORAGE_ROOT, obj.id);
		var archive = _root+".tar.gz";

		var make_archive = function(done) {
			var pattern = _root+"*";
			var cmd = util.format("tar cvzf %s %s", archive, pattern);
			debug(cmd);
			exec(cmd, {cwd: process.env.STORAGE_ROOT}, done);
		}

		var upload = function(done) {
			debug("uploading", archive)
			fs.readFile(archive, (err, data) =>{
				if(err) return done(err);

				var params = { Key: path.basename(archive), Body: data };
        		s3bucket.upload(params, done);
        	});
		}

		var remove_files = function(done) {
			var pattern = util.format("%s/%s*", process.env.STORAGE_ROOT, obj.id);
			debug("removing", pattern)
			glob(pattern, (err, files) => {
				if(err) return done(err);
				else async.eachSeries(files, fs.unlink, done);
			});
		}

		async.series([make_archive, upload, remove_files], callback);
	});
}


var loop = function(done) {
	// Loop through each .json file in STORAGE_ROOT
	// Each of these will be a story that is complete, but not yet uploaded
	var pattern = util.format("%s/*.json", process.env.STORAGE_ROOT);
	glob(pattern, {cwd: process.env.STORAGE_ROOT}, function (err, files) {
		if(err) return debug(err);

		async.eachSeries(files, process_story, (err) => {
			if(err) return debug(err);
			setTimeout(done, 10000);
		});
	});
}

module.exports = loop;