var FootPedal = require("./FootPedal");
var CanonCamera = require("./CanonCamera");
var SpeechtoText = require("./SpeechtoText");






var recording = false;

var stt = new SpeechToText();
var cam0 = new CanonCamera(1);
var cam1 = new CanonCamera(0);
var pedal = new FootPedal("Teensyduino");



pedal.on("press", function(date){

	if(recording) {
		Promise.all([cam0.stop(), cam1.stop()]).then(()=>{
			recording = false;
		}).catch(console.error);
	} else {
		Promise.all([cam0.record(), cam1.record()]).then(()=>{
			recording = true;
		}).catch(console.error);
	}
});

stt.on("sentence", function(sentence){

});



process.on('SIGINT', function() {
	Promise.all([stt.close(), pedal.close(), cam0.close(), cam1.close()]).then(()=>{
		process.exit();
	}).catch(console.error);
});
