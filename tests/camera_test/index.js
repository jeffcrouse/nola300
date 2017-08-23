var FootPedal = require("./FootPedal");
var CanonCamera = require("./CanonCamera");

const async = require('async');


var recording = false;
var cam0 = new CanonCamera(1);
var cam1 = new CanonCamera(0);

var pedal = new FootPedal("Teensyduino");

pedal.on("press", function(date){
	if(recording) {
		cam0.stop();
		cam1.stop();
		recording = false;
	} else {
		cam0.record();
		cam1.record();
		recording = true;
	}
});


process.on('SIGINT', function() {
	async.parallel([pedal.close, cam0.close, cam1.close], function(err){
		process.exit();
	});
});