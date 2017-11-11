require('dotenv').config({ silent: true }); 
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const path = require('path');
const async = require('async');


// String.prototype.trim = function() {
//   return this.replace(/^\s+|\s+$/g, "");
// };


var CanonCamera = function(id) {

	var debug = require('debug')('camera'+id);


	var exe = path.join(__dirname, "..", "bin", "canon-cli");
	var proc = null;
	var download_callback = null;
	var exit_callback = null;
	var closeRequested = false;
	var isOpened = false;
	var serial = null;

	this.getIsOpened = function() {
		return isOpened;
	}

	var on_stdout_data = function(data) {
		data = data.toString().trim();
		debug(data);

		var matches = data.match(/opened session with ([0-9]+)/);
		if(matches) {
			isOpened = true;
			serial = matches[1];
			debug("found camera", serial)
			return;
		}

		matches = data.match(/downloaded ([^ ]+)/);
		if(matches) {
			var filename = matches[1];
			if(download_callback) {
				download_callback(null, filename);
				download_callback = null;
			}
			return;
		}

		if(data.match(/exiting/)) {
			if(exit_callback) {
				exit_callback();
				exit_callback = null;
			}
			return;
		}
	}

	var on_stderr_data = function(data) {
		data = data.toString().trim();
		//debug(data);
		var matches = data.match(/\[error\] ([^ ]+)/);
		if(matches) {
			debug("ERROR", matches[1])
			proc.send("exit");
		}
	}

	var on_close = function(code) {
		debug("child process exited with code "+code);
		isOpened = false;
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

		closeRequested = true;
		var command = "exit";
		debug(command);
		proc.send(command, err => {
			if(err) debug(err);
			debug("exit command sent");
			exit_callback = callback;
		});
	}


	var find_body = function(body, done) {
		debug("looking for "+body);
		var cmd = `${exe} --list-devices`;
		exec(cmd, (error, stdout, stderr) => {	
			try {
				var cameras = JSON.parse(stdout);
				//debug(cameras);
				var id = null;
				for(var i=0; i<cameras.length; i++) {
					if(cameras[i].body==body) id = cameras[i].port; 
				}
				done(null, id);
			} catch(e) {
				done(e);
			}
		});
	}
	
	var stay_connected = function(done) {
		if(closeRequested) return;

		if(!proc || !proc.connected) {				
			var args = ['--id', id, '--delete-after-download', "--debug", "--overwrite", "--default-dir", process.env.STORAGE_ROOT];
			debug(exe, args.join(" "));

			proc = spawn(exe, args, {stdio: ["ipc"]});
			proc.stdout.on('data', on_stdout_data);
			proc.stderr.on('data', on_stderr_data);
			proc.on('close', on_close);
		}
		if(!closeRequested) setTimeout(done, 2000);
	}

	async.forever(stay_connected, err => {
		debug("camera stay_connected exited", err);
	});
}

module.exports = CanonCamera;