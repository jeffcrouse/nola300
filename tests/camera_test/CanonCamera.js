const spawn = require('child_process').spawn;
const path = require('path');

var canon = path.join("/Users", "jeff", "Developer", "canon-video-capture", "build", "Release", "canon-video-capture");

var CanonCamera = function(id) {

	var self = this;
	var proc = spawn(canon, ['--id', id, '--delete-after-download'], {stdio: ["ipc"]});
	
	proc.stdout.on('data', (data) => {
		console.log(`[CanonCamera] stdout: ${data}`);
	});
	proc.stderr.on('data', (data) => {
		console.log(`[CanonCamera] stderr: ${data}`);
	});

	proc.on('close', (code) => {
		console.log("[CanonCamera] child process exited with code ${code}");
	});


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
			proc.kill('SIGINT');
			resolve();
		});
	}
}

module.exports = CanonCamera;