const SerialPort = require('serialport');
const util = require('util');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('footpedal');

SerialPort.list(function (err, ports) {
	ports.forEach(function(_info) { console.log(util.inspect(_info)); });
});


var FootPedal = function(mfg) {
	EventEmitter.call(this);

	var self = this;
	var port = null;
	var isOpened = false;
	var options = { baudRate: 9600 };
	var closeRequested = false;					// this means INTENTIONALLY CLOSED by the user, not the default state of the port.
	var re =  new RegExp(mfg);
	var key = "manufacturer"; 
	var heartbeat = Date.now();
	var no_callback = function(err) {
		if(err) debug(err);
	}

	/**
	* Do we currently have an open connection to the pedal?
	*/
	this.getIsOpened = function() {
		return isOpened;
	}


	var on_open = function() {
		debug("opened");
		isOpened = true;
	}

	var on_error = function(err) {
		debug('error opening port: ', err.message);
	}

	var on_data = function(buf) {
		//debug("on_data")
		var data = buf.toString('utf8');
		if(data=="d") {
			debug("press");
			self.emit("press", Date.now() );
		}

		if(data==".") heartbeat = Date.now();
	}

	var on_close = function(data) {
		debug("on_close");
		isOpened = false;
		port = null;
	}

	this.close = function(callback) {
		callback = callback || no_callback;
		closeRequested = true;
		debug("closing");
		if(port) port.close();
		callback();
	}


	var stay_connected = function() {
		if(closeRequested) return;

		if(port==null)  {
			debug("port closed. attemping to open")

			SerialPort.list().then((ports) => {
				var comName = null;
				ports.forEach(function(_info) {
					if(_info[key] && _info[key].match(re)) 
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
		} else {
			var elapsed = Date.now() - heartbeat;
			if(elapsed > 5000) {
				debug("lost heartbeat signal. resetting")
				port = null;
			}
		}

		if(!closeRequested) setTimeout( stay_connected, 1000 );
	};

	stay_connected();
}

util.inherits(FootPedal, EventEmitter);


module.exports = new FootPedal("Teensyduino"); //("Teensyduino");

