const spawn = require('child_process').spawn;
const path = require('path');

var canon = path.join("/Users", "jeff", "Developer", "canon-video-capture", "build", "Release", "canon-video-capture");

var CanonCamera = function(id) {

	var self = this;
	const proc = spawn(canon, ['--id', id, '--delete-after-download'], {stdio: ["ipc"]});
	proc.stdout.on('data', (data) => {
		console.log(`stdout: ${data}`);
	});
	proc.stderr.on('data', (data) => {
		console.log(`stderr: ${data}`);
	});

	proc.on('close', (code) => {
		console.log(`child process exited with code ${code}`);
	});


	this.record = function(){
		proc.send("record");
	}

	this.stop = function(){
		proc.send("stop");
	}

	this.close = function(done) {
		proc.kill('SIGINT');
		setTimeout(done, 2000);
	}
}

module.exports = CanonCamera;