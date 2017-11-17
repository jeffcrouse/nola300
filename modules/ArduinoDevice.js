require('dotenv').config({ silent: true }); 
const SerialPort = require('serialport');
const util = require('util');
const async = require('async');
var EventEmitter = require('events').EventEmitter;

// SerialPort.list(function (err, ports) {
// 	ports.forEach(function(_info) { console.log(util.inspect(_info)); });
// });

var ArduinoDevice = function(key, value, name) {
	EventEmitter.call(this);

	var self = this;
	var debug = require('debug')(name);
	var options = { baudRate: 9600 };
	var timeout = 5000;
	var re =  new RegExp(value);
	var isOpen = false;
	var closeRequested = false;
	var port = null;
	var heartbeat = Date.now();
	var default_callback = function(err) { if(err) debug(error); }


	// ----------------------------------------------------------------------------------
	this.getIsOpened = function() {
		return isOpen;
	}

	// ----------------------------------------------------------------------------------
	this.exit = function(callback) {
		debug("exit");
		callback = callback || default_callback;
		closeRequested=true;
		if(port && port.isOpen) port.close(callback);
		else callback(null);
	}

	// ----------------------------------------------------------------------------------
	this.write = function(data, callback) {
		callback = callback || default_callback;
		if(port) port.write(data, "utf8", callback);
		else callback("not connected")
	}

	// ----------------------------------------------------------------------------------
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

	// ----------------------------------------------------------------------------------
	var loop = function(done) {
		if(isOpen)  {
			var elapsed = Date.now() - heartbeat;
			if(elapsed > timeout) {
				debug("lost heartbeat signal")
				port.close();
			}
		}

		if(!isOpen) {
			debug("port closed. attemping to open")
			findComName((comName) => {
				if(comName!=null) {
					port = new SerialPort(comName, options);
					port.on('open', () => {
						debug("open", comName)
						heartbeat = Date.now();
						isOpen=true;
					});
					port.on('close', () => {
						isOpen=false;
						port = null;
					});
					port.on('error', (err) => {
						isOpen=false;
						port = null;
						debug("serial error", err);
					});
					port.on('data', (buf) => {
						var data = buf.toString('utf8');
						if(data==".") heartbeat = Date.now();
						else self.emit(data, Date.now());
					});
				}
			});
		}
	}

	async.doUntil(loop, ()=>{ return closeRequested; } );
}

util.inherits(ArduinoDevice, EventEmitter);
module.exports = ArduinoDevice;

