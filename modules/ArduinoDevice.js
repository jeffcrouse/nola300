const SerialPort = require('serialport');
const util = require('util');
var EventEmitter = require('events').EventEmitter;



SerialPort.list(function (err, ports) {
	ports.forEach(function(_info) { console.log(util.inspect(_info)); });
});


var ArduinoDevice = function(key, value, name) {

	var debug = require('debug')(name);
	var options = { baudRate: 9600 };
	var re =  new RegExp(value);
	var isOpen = false;
	var closeRequested = false;
	var port = null;
	var heartbeat = Date.now();

	var default_callback = function(err) { if(err) debug(error); }



	this.getIsOpened = function() {
		return isOpen;
	}

	this.close = function(callback) {
		callback = callback || default_callback;
		if(port) port.close();
	}

	var findComName = function(callback) {
		SerialPort.list().then((ports) => {
			var comName = null;
			ports.forEach(function(info) {
				if(info[key] && info[key].match(re)) 
					comName = info.comName
			});
			callback(comName);
		})
	}

	var loop = function() {
		if(closeRequested) return;
		setTimeout(loop, 1000);

		if(isOpen)  {
			var elapsed = Date.now() - heartbeat;
			if(elapsed > 5000) {
				debug("lost heartbeat signal")
			}
		}

		if(!isOpen) {

			debug("port closed. attemping to open")
			findComName((comName) => {
				port = new SerialPort(comName, options);
				port.on('open', () => {
					isOpen=true;
				});
				port.on('close', () => {
					isOpen=false;
					port = null;
				});
				port.on('error', (err) => {
					debug("serial error", err);
				});
				port.on('data', (buf) => {
					var data = buf.toString('utf8');
					if(data==".") heartbeat = Date.now();
				});
			});
		}
	};

	loop();
}

util.inherits(ArduinoDevice, EventEmitter);


var footpedal = new ArduinoDevice("manufacturer", "Teensyduino", "footpedal");

