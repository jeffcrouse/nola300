require('dotenv').config({ silent: true }); 
const spawn = require('child_process').spawn;
const path = require('path');

//
//	TO DO
//	Throw some kind of error when something comes from canon-video-capture stderr
//	Timestamp sentences beginning and end
// 	DO NOT ALLOW RECORDING WHILE A DOWNLOAD IS IN PROGRESS!!!!
//

var canon = path.join("/Users", "jeff", "Developer", "canon-video-capture", "build", "Release", "canon-video-capture");
String.prototype.trim = function() {
  return this.replace(/^\s+|\s+$/g, "");
};


var CanonCamera = function(id) {

	var debug = require('debug')('camera'+id);
	var self = this;
	var proc = spawn(canon, ['--id', id, '--delete-after-download', "--overwrite", "--default-dir", process.env.STORAGE_ROOT], {stdio: ["ipc"]});
	var download_callback = null;

	proc.stdout.on('data', (data) => {
		data = data.toString().trim();

		var words = data.split(" ");
		if(words[0]=="[status]" || words[0]=="[warning]") {
			debug(data);

			if(words[1]=="downloaded") {
				if(download_callback) {
					download_callback(null, words[2]);
					download_callback = null;
				}
			}
		}
	});

	proc.stderr.on('data', (data) => {
		data = data.toString().trim();
		
		if(data.indexOf("[error]")==0) {
			debug(data);
			throw data;
		}
	});

	proc.on('close', (code) => {
		debug("child process exited with code "+code);
	});

	proc.send("stop");


	this.record = function(filename, callback){
		var command = "record";
		if(filename) command += " "+filename;
		debug(command);
		proc.send(command, callback);
	}


	// This shouldn't return until the resulting video is completely done downloading.
	this.stop = function(filename, callback){
		var command = "stop";
		if(filename) command += " "+filename;
		debug(command);
		proc.send(command, err => {
			if(err) callback(err);
			else download_callback = callback;
		});
	}

	this.close = function(callback) {
		var command = "exit";
		debug(command);
		proc.send(command, callback);
	}
}

module.exports = CanonCamera;