const spawn = require('child_process').spawn;
const path = require('path');

var canon = path.join("/Users", "jeff", "Developer", "canon-video-capture", "build", "Release", "canon-video-capture");

var CanonCamera = function(id) {

	var self = this;
	var proc = spawn(canon, ['--id', id, '--delete-after-download'], {stdio: ["ipc"]});
	
	proc.stdout.on('data', (data) => {
		process.stdout.write("[CanonCamera stdout] "+data);
	});
	proc.stderr.on('data', (data) => {
		process.stdout.write("[CanonCamera stderr] "+data);
	});

	proc.on('close', (code) => {
		process.stdout.write("[CanonCamera] child process exited with code "+code);
	});


	proc.send("stop");

	this.record = function(){
		return new Promise((resolve, reject) => {
			proc.send("record", function(err){
				if(err) reject(err);
				else resolve();
			});
		});
	}

	this.stop = function(){
		return new Promise((resolve, reject) => {
			proc.send("stop", function(err){
				if(err) reject(err);
				else resolve();
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
			//resolve();
		});
	}
}

module.exports = CanonCamera;