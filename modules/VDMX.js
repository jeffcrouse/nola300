require('dotenv').config({ silent: true }); 
var debug = require('debug')('vdmx');
var osc = require('node-osc');
const async = require('async');


var VDMX = function() {
	var client = new osc.Client('127.0.0.1', 1234);
	var opacity = 0;
	var targetOpacity = 0;
	var closeRequested = false;


	this.fadeOut = function(done) {
		done = done || function(){};
		debug("fadeOut")
		targetOpacity=0;
		done();
	}

	this.fadeIn = function(done) {
		done = done || function(){};
		debug("fadeIn")
		targetOpacity=1;
		done();
	}

	this.send = function(address, done) {
		done = done || function(){};
		debug(address);
		client.send(address, 1, done);
	}

	this.close = function(done) {
		done = done || function(){};
		closeRequested = true;
	}

	async.forever(done => {
		opacity += (targetOpacity-opacity) * 0.05;
		client.send('/opacity', opacity,  () => { });
		if(closeRequested) return done("closing");
		else setTimeout(done, 10);
	});
}


module.exports = new VDMX();