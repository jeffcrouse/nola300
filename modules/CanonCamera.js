require('dotenv').config({ silent: true }); 
const spawn = require('child_process').spawn;
const path = require('path');
const async = require('async');

//
//	TO DO
//	Throw some kind of error when something comes from canon-video-capture stderr
//	Timestamp sentences beginning and end
// 	DO NOT ALLOW RECORDING WHILE A DOWNLOAD IS IN PROGRESS!!!!
//

var canon = path.join(__dirname, "..", "bin", "canon-cli");
// String.prototype.trim = function() {
//   return this.replace(/^\s+|\s+$/g, "");
// };


var CanonCamera = function(id) {

	var debug = require('debug')('camera'+id);
	var self = this;
	var proc = null;
	var args = ['--id', id, '--delete-after-download', "--debug", "--overwrite", "--default-dir", process.env.STORAGE_ROOT];
	var download_callback = null;
	var exit_callback = null;
	var closed = false;

	var on_stdout_data = function(data) {
		data = data.toString().trim();
		debug(data);

		var words = data.split(" ");
		if(words[0]=="[status]" || words[0]=="[warning]") {
			//debug(data);

			if(words[1]=="downloaded") {
				if(download_callback) {
					download_callback(null, words[2]);
					download_callback = null;
				}
			}

			if(words[1]=="done") {
				if(exit_callback) {
					exit_callback();
					exit_callback = null;
				}
			}
		}
	}

	var on_stderr_data = function(data) {
		data = data.toString().trim();
		
		// TODO: what do we do on error?  Close the process, no?

		if(data.indexOf("[error]")==0) {
			debug(data);
		}
	}

	var on_close = function(code) {
		debug("child process exited with code "+code);
		proc = null;
	}
	

	this.record = function(filename, callback){
		callback = callback || function(){};
		
		var command = "record";
		if(filename) command += " "+filename;
		debug(command);
		proc.send(command, err => {
			callback(err)
		});
	}


	// This shouldn't return until the resulting video is completely done downloading.
	this.stop = function(filename, callback){
		callback = callback || function(){};

		var command = "stop";
		if(filename) command += " "+filename;
		debug(command);

		proc.send(command, err => {
			if(err) callback(err);
			else download_callback = callback;
		});
	}

	this.cancel = function(callback) {
		callback = callback || function(){};
		if(proc) proc.send("cancel", err => {
			callback(err)
		});
	}

	this.close = function(callback) {
		if(!proc || !proc.connected) return callback();

		closed = true;
		var command = "exit";
		debug(command);
		proc.send(command, err => {
			if(err) debug(err);
			debug("exit command sent");
			exit_callback = callback;
		});
	}


	var stay_connected = function(done) {
		if(closed) return;

		if(!proc || !proc.connected) {
			debug("canon-cli "+args.join(" "));
			proc = spawn(canon, args, {stdio: ["ipc"]});

			proc.stdout.on('data', on_stdout_data);
			proc.stderr.on('data', on_stderr_data);
			proc.on('close', on_close);
			//proc.send("stop");
		}
		if(!closed) setTimeout(done, 2000);
	}

	async.forever(stay_connected, err => {
		debug("camera stay_connected exited", err);
	});
}

module.exports = CanonCamera;