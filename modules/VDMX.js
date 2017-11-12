require('dotenv').config({ silent: true }); 
var debug = require('debug')('vdmx');
var osc = require('node-osc');
const async = require('async');


var VDMX = function() {
	var client = new osc.Client('127.0.0.1', 1234);
	var opacity = 1;
	var targetOpacity = 0;
	var closeRequested = false;

	var textures = {
		anger: 4,
		disgust: 2,
		fear: 4,
		joy: 7,
		sadness: 6,
	};

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

	this.close = function() {
		closeRequested = true;
	}

	async.forever(done => {
		opacity += (targetOpacity-opacity) * 0.05;
		client.send('/opacity', opacity,  () => { });
		if(closeRequested) return done("closing");
		else setTimeout(done, 10);
	});

	async.forever(done => {
		var keys = Object.keys(textures);
		var emo = keys[Math.floor(Math.random()*keys.length)];
		var n = Math.ceil(Math.random()*textures[emo]);
		var address = `/${emo}${n}`;
		//debug(address);
		client.send(address, 1,  () => { });
		var delay = 5000 + (Math.random()*5000);
		if(closeRequested) return done("closing");
		else setTimeout(done, delay);
	});
}


module.exports = new VDMX();