const SerialPort = require('serialport');
const util = require('util');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('footpedal');

// SerialPort.list(function (err, ports) {
// 	ports.forEach(function(_info) { console.log(util.inspect(_info)); });
// });


var FootPedal = function(mfg) {
	EventEmitter.call(this);

	var self = this;
	var port = null;
	var options = { baudRate: 9600 };
	var closed = false;					// this means INTENTIONALLY CLOSED by the user, not the default state of the port.
	var re =  new RegExp(mfg);

	var on_open = function() {
		debug("opened");
	}

	var on_error = function(err) {
		debug('error opening port: ', err.message);
	}

	var on_data = function(buf) {
		debug("on_data")
		var data = buf.toString('utf8');
		if(data=="d") {
			self.emit("press", Date.now() );
		}
	}

	var on_close = function(data) {
		debug("on_close");
		port = null;
	}

	this.close = function() {
		closed = true;
		return new Promise((resolve, reject) => {
			if(!port) return resolve()

			debug("closing");
			port.close(function(err){
				if(err) reject(err);
				else resolve();
				// port gets set to null in on_close
			});
		});
	}


	var stay_connected = function() {
		if(closed) return;

		if(port==null)  {
			debug("port closed. attemping to open")

			SerialPort.list().then((ports) => {
				var comName = null;
				ports.forEach(function(_info) {
					if(_info.manufacturer && _info.manufacturer.match(re)) 
						comName = _info.comName
				});
				if(comName==null) 
					return debug("no port found");
				
				debug("opening", comName);

				port = new SerialPort(comName, options);

				port.on('open', on_open);
				port.on('error', on_error);
				port.on('data', on_data);
				port.on('close', on_close);
			})
		}
		if(!closed) setTimeout( stay_connected, 1000 );
	};

	stay_connected();
}

util.inherits(FootPedal, EventEmitter);


module.exports = new FootPedal("Teensyduino");

