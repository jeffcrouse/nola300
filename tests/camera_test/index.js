const SerialPort = require('serialport');
const util = require('util');
const path = require('path');

var canon = path.join("~", "Developer", "canon-video-capture", "build", "Release", "canon-video-capture");
console.log(canon);




SerialPort.list(function (err, ports) {
	ports.forEach(function(port) {
		console.log(port.comName, port.pnpId, port.manufacturer);
	});
});