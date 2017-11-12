const async = require('async');
const path = require('path');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;


var VLCPlayer = function(folder) {
	var vlc = "/Applications/VLC.app/Contents/MacOS/VLC";
	var args = ['-I', "rc", '-Z', folder];
	
	var volume = 0;
	var targetVolume = 0;

	var proc = spawn(vlc, args);
	proc.stdout.on('data', data => {
		data = data.toString().trim();
		//console.log("on_stdout_data", data);
	});

	proc.stderr.on('data', data => {
		data = data.toString().trim();
		console.log("on_stderr_data", data);
	});

	proc.on('close', code => {
		console.log("on_close", code);
		proc = null;
	});

	proc.stdin.setEncoding('utf-8');
	proc.stdin.write("help\n")

	this.fadeIn = function() {
		targetVolume = 100;
	}

	this.fadeOut = function() {
		targetVolume = 0;
	}

	this.exit = function() {
		if(!proc) return;
		proc.stdin.write("quit");
	}

	async.forever((done) => {
		var lastVolume = volume;
		volume += (targetVolume-volume) * 0.05;

		if(proc) {
			var command = "volume "+Math.floor(volume)+"\n";
			proc.stdin.write(command);
		}
		setTimeout(done, 100);
	});
}




var playlist = new VLCPlayer("/Users/jeff/Music/iTunes/iTunes Media/Music/Cool 3D World/Cool 3D World");
async.forever((done) => {
	playlist.fadeIn();
	setTimeout(() => {
		playlist.fadeOut();
		setTimeout(done, 5000);
	}, 5000)

});