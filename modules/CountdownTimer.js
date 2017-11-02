const util = require('util');
var EventEmitter = require('events').EventEmitter;



/**
*	This timer is a very simple timekeeper that can be started with a number of milliseconds, 
*	and then emits a "tick" every 1/10 of a second, and then emits a "done" event when the 
*	time runs out.
*/
var CountdownTimer = function() {
	
	var self = this;
	var start_time = null;
	var countdown_from;
	var timeout = null;

	this.begin = function(time) {
		countdown_from = time;
		start_time = Date.now();
		timeout = setTimeout(() => {
			start_time = null;
			self.emit("done");
		}, countdown_from);
	}

	this.stop = function() {
		start_time = null;
		clearTimeout(timeout);
	}

	this.get_time = function() {
		if(start_time) {
			var elapsed = Date.now() - start_time;
			return msToTime(countdown_from - elapsed);
		} else {
			return msToTime(0);
		}
	}

	this.elapsed = function() {
		return Date.now() - start_time;
	}


	var tick = function() {
		if(start_time) self.emit("tick", self.get_time());
		setTimeout(tick, 100);
	}
	tick();

	var msToTime = function(duration) {
	    var milliseconds = parseInt((duration%1000)/100)
	        , seconds = parseInt((duration/1000)%60)
	        , minutes = parseInt((duration/(1000*60))%60)
	        , hours = parseInt((duration/(1000*60*60))%24);

	    hours = (hours < 10) ? "0" + hours : hours;
	    minutes = (minutes < 10) ? "0" + minutes : minutes;
	    seconds = (seconds < 10) ? "0" + seconds : seconds;

	    return [hours, minutes, seconds];
	}
}

util.inherits(CountdownTimer, EventEmitter);

module.exports = CountdownTimer;