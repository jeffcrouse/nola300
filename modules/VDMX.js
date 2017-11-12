require('dotenv').config({ silent: true }); 
var debug = require('debug')('vdmx');
var osc = require('node-osc');
const async = require('async');


var VDMX = function() {
	var client = new osc.Client('127.0.0.1', 1234);
	var opacity = 0;
	var targetOpacity = 0;

	var textures = {
		anger: 4,
		disgust: 2,
		fear: 4,
		joy: 7,
		sadness: 6,
	};

	this.fadeOut= function() {
		targetOpacity=0;
	}

	this.fadeIn = function() {
		targetOpacity=1;
	}

	async.forever(done => {
		opacity += (targetOpacity-opacity) * 0.05;
		client.send('/opacity', opacity,  () => { });
		setTimeout(done, 10);
	});

	async.forever(done => {
		var keys = Object.keys(textures);
		var emo = keys[Math.floor(Math.random()*keys.length)];
		var n = Math.ceil(Math.random()*textures[emo]);
		var address = `/${emo}${n}`;
		client.send(address, 0,  () => { });
		var delay = 2000 + (Math.random()*3000);
		setTimeout(done, delay);
	});
}


modules.exports = new VDMX();