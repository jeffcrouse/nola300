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

	var obj = null;
	var folder = null;
	var archive = null;

	var parse_info = function(done) {
		fs.readFile(filename, "utf8", function(err, data){
			if(err) return done(err);
			try {
				obj = JSON.parse(data);
				folder = path.join(process.env.STORAGE_ROOT, obj.id);
				archive = folder+".tar.gz";
				done(null);
			} catch(e) {
				return done(e);
			}
		});
	}

	var make_archive = function(done) {
		var cmd = `cd "${process.env.STORAGE_ROOT}" && tar -zcvf ${obj.id}.tar.gz ./${obj.id}`;
		debug(cmd);
		exec(cmd, {cwd: process.env.STORAGE_ROOT}, (err) => {
			if(err) return done(err);
			fs.access(archive, fs.R_OK | fs.W_OK, done);
			// TODO Remove archive if command didn't complete successfully?
		});
	}

	var upload = function(done) {
		debug("uploading", archive)
		var formData = {
			archive: fs.createReadStream(archive),
			data: JSON.stringify(obj)
		};
		request.post({url: api_post_url, formData: formData}, function(err, httpResponse, body){
			debug(body);
			if(err) done(err);
			else if(body == "OK") done(null);
			else done("unexpected response from server: "+body);
		});
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

	async.series([parse_info, make_archive, upload, remove_folder, remove_archive, announce], callback);

}


var loop = function(done) {
	// Loop through each */info.json file in STORAGE_ROOT
	// Each of these will be a story that is complete, but not yet uploaded
	var pattern = util.format("%s/*/info.json", process.env.STORAGE_ROOT);
	glob(pattern, {cwd: process.env.STORAGE_ROOT}, function (err, files) {
		if(err) return debug(err);

		async.eachSeries(files, process_story, (err) => {
			if(err) debug(err);
			setTimeout(done, 10000);
		});
	});
}

module.exports = loop;