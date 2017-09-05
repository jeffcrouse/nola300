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
					download_callback(words[1]);
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

	this.record = function(filename){
		return new Promise((resolve, reject) => {
			debug("record");
			proc.send("record", function(err){
				if(err) reject(err);
				else resolve();
			});
		});
	}


	this.stop = function(filename){
		return new Promise((resolve, reject) => {
			debug("stop "+filename);
			proc.send("stop "+filename, function(err){
				if(err) return reject(err);

				download_callback = resolve;
			});
		});
	}

	this.close = function() {
		debug("closing");
		return new Promise((resolve, reject) => {
			proc.send("exit", function(err){
				if(err) reject(err);
				else resolve();
			});
			//proc.kill('SIGINT');
		});
	}
}

module.exports = CanonCamera;