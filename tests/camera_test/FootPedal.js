const SerialPort = require('serialport');
const util = require('util');
var EventEmitter = require('events').EventEmitter;
var async = require("async");

SerialPort.list(function (err, ports) {
	ports.forEach(function(_info) { console.log(util.inspect(_info)); });
});


var FootPedal = function(mfg) {
	EventEmitter.call(this);


	var self = this;
	var port = null;
	var options = { baudRate: 9600 };

	var stay_connected = function(next) {
		if(port==null) {
			console.warn("port closed. attemping to open")
			return open_port(next);
		}	
		else {
			setTimeout(next, 500);
		}
	}

	var find_port = function(callback) {

		var re =  new RegExp(mfg);
		var comName = null;
		SerialPort.list(function (err, ports) {
			if(err) return callback(err);

			ports.forEach(function(_info) {
				console.log(_info.manufacturer);
				if(_info.manufacturer && _info.manufacturer.match(re)) 
					comName = _info.comName
			});
			callback(null, comName);
		});
	}

	var open_port = function(callback) {
		find_port(function(err, comName){
			if(err || !comName) return setTimeout(callback, 1000);

			console.log("opening", comName);

			port = new SerialPort(comName, options);

			port.on('open', on_open);
			port.on('error', on_error);
			port.on('data', on_data);
			port.on('close', on_close);

			callback();
		});
	}

	var on_open = function() {
		console.log("on_open");
	}

	var on_error = function(err) {
		console.error('Error: ', err.message);
	}

	var on_data = function(buf) {
		var data = buf.toString('utf8');
		if(data=="d") {
			self.emit("press", Date.now() );
		}
	}

	var on_close = function(data) {
		console.log("on_close");
		port = null;
	}

	this.close = function(done) {
		if(port) {
			console.log("closing footpedal");
			port.close(function(err){
				if(err) console.error(err);
				else console.log("closed");
				done();
			});
		}
	}

	async.forever(stay_connected);
}

util.inherits(FootPedal, EventEmitter);


module.exports = FootPedal;

