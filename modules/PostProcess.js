require('dotenv').config({ silent: true }); 
var debug = require('debug')('postprocess');
const path = require('path');
const util = require('util');
var fs = require("fs");
var glob = require("glob");
const exec = require('child_process').exec;
const async = require('async');
var request = require('request');
// var AWS = require('aws-sdk');
// AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
// var s3bucket = new AWS.S3({params: {Bucket: 'nola300'}});


var api_post_url = "http://localhost:3001/upload";

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

		var folder = util.format("%s/%s", process.env.STORAGE_ROOT, obj.id);
		var archive = folder+".tar.gz";

		var make_archive = function(done) {
			var cmd = util.format('cd "%s" && tar -zcvf %s.tar.gz ./%s', process.env.STORAGE_ROOT, obj.id, obj.id);
			debug(cmd);
			exec(cmd, {cwd: process.env.STORAGE_ROOT}, (err) => {
				if(err) return done(err);
				fs.access(archive, fs.R_OK | fs.W_OK, done);
			});
		}

		var upload = function(done) {
			debug("uploading", archive)
			var formData = {
				archive: fs.createReadStream(archive),
				data: data
			};
			request.post({url: api_post_url, formData: formData}, function(err, httpResponse, body){
				debug(body);
				if(err) done(err);
				else if(body == "OK") done(null);
				else done("unexpected response from server: "+body);
			});	
			// fs.readFile(archive, (err, data) =>{
			// 	if(err) return done(err);
			// 	s3bucket.upload({ Key: path.basename(archive), Body: data }, done);
			// });
		}

		var remove_folder = function(done) {
			var cmd = util.format('rm -rf %s', obj.id);
			exec(cmd, {cwd: process.env.STORAGE_ROOT}, done);
		}

		var remove_archive = function(done) {
			var cmd = util.format('rm -rf %s.tar.gz', obj.id);
			exec(cmd, {cwd: process.env.STORAGE_ROOT}, done);
		}

		var announce = function(done) {
			debug("done with", obj.id);
			done(null);
		}

		async.series([make_archive, upload, remove_folder, remove_archive, announce], callback);
	});
}


var loop = function(done) {
	// Loop through each */info.json file in STORAGE_ROOT
	// Each of these will be a story that is complete, but not yet uploaded
	var pattern = util.format("%s/*/info.json", process.env.STORAGE_ROOT);
	glob(pattern, {cwd: process.env.STORAGE_ROOT}, function (err, files) {
		if(err) return debug(err);

		async.eachSeries(files, process_story, (err) => {
			if(err) return debug(err);
			setTimeout(done, 10000);
		});
	});
}

module.exports = loop;