const SerialPort = require('serialport');
const util = require('util');
var EventEmitter = require('events').EventEmitter;

// SerialPort.list(function (err, ports) {
// 	ports.forEach(function(_info) { console.log(util.inspect(_info)); });
// });


var FootPedal = function(mfg) {
	EventEmitter.call(this);


	var self = this;
	var port = null;
	var options = { baudRate: 9600 };
	var closed = false;




	var find_port = function() {
		return new Promise(function(resolve, reject){
			var re =  new RegExp(mfg);
			
			SerialPort.list().then((ports) => {
				var comName = null;
				ports.forEach(function(_info) {
					if(_info.manufacturer && _info.manufacturer.match(re)) 
						comName = _info.comName
				});
				if(comName==null) reject("no port found");
				else resolve(comName);

			}).catch(reject);
		});
	}

	var open_port = function() {
		return new Promise(function(resolve, reject){
			find_port().then((comName) => {
				console.log("[FootPedal] opening", comName);

				port = new SerialPort(comName, options);

				port.on('open', on_open);
				port.on('error', on_error);
				port.on('data', on_data);
				port.on('close', on_close);

			}).catch(reject);
		});
	}

	var on_open = function() {
		console.log("[FootPedal] on_open");
	}

	var on_error = function(err) {
		console.error('[FootPedal] Error: ', err.message);
	}

	var on_data = function(buf) {
		var data = buf.toString('utf8');
		if(data=="d") {
			self.emit("press", Date.now() );
		}
	}

	var on_close = function(data) {
		console.log("[FootPedal] on_close");
		port = null;
	}

	this.close = function() {
		closed = true;
		return new Promise((resolve, reject) => {
			if(port) {
				console.log("[FootPedal] closing footpedal");
				port.close(function(err){
					if(err) reject(err);
					else resolve();
				});
			} else resolve();
		});
	}


	var stay_connected = function() {
		if(port==null)  {
			console.warn("[FootPedal] port closed. attemping to open")
			open_port();
		}

		if(!closed) 
			setTimeout( stay_connected, 1000 );
	};

	stay_connected();
}

util.inherits(FootPedal, EventEmitter);


module.exports = FootPedal;

