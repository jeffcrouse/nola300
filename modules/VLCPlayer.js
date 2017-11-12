require('dotenv').config({ silent: true }); 
var debug = require('debug')('vlc');
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
		debug("on_stderr_data", data);
	});

	proc.on('close', code => {
		debug("on_close", code);
		proc = null;
	});

	proc.stdin.setEncoding('utf-8');
	proc.stdin.write("help\n")

	this.fadeIn = function() {
		debug("fadeIn");
		targetVolume = 100;
	}

	this.fadeOut = function() {
		debug("fadeOut");
		targetVolume = 0;
	}

	this.quit = function(done) {
		if(proc) proc.stdin.write("quit");
		done();
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

module.exports = VLCPlayer;