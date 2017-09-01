const SerialPort = require('serialport');
const util = require('util');
//process.env['DEBUG']="onair";
var debug = require('debug')('onair');



SerialPort.list(function (err, ports) {
	ports.forEach(function(_info) { console.log(util.inspect(_info)); });
});

var OnAirSign = function(serial) {

	var self = this;
	var port = null;
	var options = { baudRate: 9600 };
	var closed = false;
	var re =  new RegExp(serial);
	var on = false;

	// ---------------------------
	this.toggle = function() {
		if(on) this.off();
		else this.on();
	}

	// ---------------------------
	this.on = function(callback) {
		on = true;
		debug("on")
		if(port) port.write("1", "utf8", callback);
	}

	// ---------------------------
	this.off = function(callback) {
		on = false;
		debug("off")
		if(port) port.write("0", "utf8", callback);
	}

	// ---------------------------
	this.close = function() {
		closed = true;
		return new Promise((resolve, reject) => {
			if(port) {
				debug("closing");
				port.close(function(err){
					if(err) reject(err);
					else resolve();
					// port gets set to null in on_close
				});
			} else resolve();
		});
	}

	var on_open = function() {
		debug("opened");
	}

	var on_error = function(err) {
		debug('error opening port: ', err.message);
	}

	var on_data = function(buf) {
		var data = buf.toString('utf8');
		debug(data);
	}

	var on_close = function(data) {
		debug("on_close");
		port = null;
	}


	var stay_connected = function() {
		if(port==null)  {
			debug("port closed. attemping to open")

			SerialPort.list().then((ports) => {
				var comName = null;
				ports.forEach(function(_info) {
					if(_info.serialNumber && _info.serialNumber.match(re)) 
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
		if(!closed) setTimeout( stay_connected, 5000 );
	};

	stay_connected();
}


modules.export = new OnAirSign("85438333935351F071D2");
