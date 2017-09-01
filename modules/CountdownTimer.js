const util = require('util');
var EventEmitter = require('events').EventEmitter;

var CountdownTimer = function() {
	
	var self = this;
	var start_time = null;
	var countdown_from;


	this.begin = function(time) {
		countdown_from = time;
		start_time = Date.now();
		setTimeout(() => {
			start_time = null;
			self.emit("done");
		}, countdown_from);
	}

	this.stop = function() {
		start_time = null;
	}

	this.get_time_str = function() {
		if(start_time) {
			var elapsed = Date.now() - start_time;
			return msToTime(countdown_from - elapsed);
		} else {
			return msToTime(0);
		}
	}

	// var paddy = function(n, p, c) {
	//     var pad_char = typeof c !== 'undefined' ? c : '0';
	//     var pad = new Array(1 + p).join(pad_char);
	//     return (pad + n).slice(-pad.length);
	// }

	var msToTime = function(duration) {
	    var milliseconds = parseInt((duration%1000)/100)
	        , seconds = parseInt((duration/1000)%60)
	        , minutes = parseInt((duration/(1000*60))%60)
	        , hours = parseInt((duration/(1000*60*60))%24);

	    hours = (hours < 10) ? "0" + hours : hours;
	    minutes = (minutes < 10) ? "0" + minutes : minutes;
	    seconds = (seconds < 10) ? "0" + seconds : seconds;

	    return minutes + ":" + seconds;
	}
}

util.inherits(CountdownTimer, EventEmitter);

module.exports = CountdownTimer;