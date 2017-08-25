const spawn = require('child_process').spawn;
const path = require('path');

//
//	TO DO
//	Throw some kind of error when something comes from canon-video-capture stderr
//	Timestamp sentences beginning and end
//

var canon = path.join("/Users", "jeff", "Developer", "canon-video-capture", "build", "Release", "canon-video-capture");

var CanonCamera = function(id) {

	var self = this;
	var proc = spawn(canon, ['--id', id, '--delete-after-download', "--overwrite"], {stdio: ["ipc"]});
	var download_callback = null;

	proc.stdout.on('data', (data) => {
		var words = data.toString().split(" ");
		if(words[0]=="[status]") {
			process.stdout.write("[CanonCamera] "+data);
			if(words[1]=="downloaded") {
				if(download_callback) {
					download_callback(words[1]);
					download_callback = null;
				}
			}
		}

	});

	proc.stderr.on('data', (data) => {
		if(data.toString().indexOf("[error]")==0) {
			process.stdout.write("[CanonCamera] "+data);
			throw data;
		}
	});

	proc.on('close', (code) => {
		process.stdout.write("[CanonCamera] child process exited with code "+code);
	});

	proc.send("stop");

	this.record = function(filename){
		return new Promise((resolve, reject) => {
			console.log("[CanonCamera] record");
			proc.send("record", function(err){
				if(err) reject(err);
				else resolve();
			});
		});
	}


	this.stop = function(filename){
		return new Promise((resolve, reject) => {
			console.log("[CanonCamera] stop "+filename);
			proc.send("stop "+filename, function(err){
				if(err) return reject(err);
				download_callback = resolve;
			});
		});
	}

	this.close = function() {
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