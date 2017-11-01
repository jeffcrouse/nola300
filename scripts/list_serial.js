const SerialPort = require('serialport');
const util = require('util');

SerialPort.list(function (err, ports) {
	ports.forEach(function(_info) { console.log(util.inspect(_info)); });
});