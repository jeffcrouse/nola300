var SpeechToText = require('./modules/SpeechToText');
var FootPedal = require('./modules/FootPedal')
const util = require('util');

var active = false;

FootPedal.on("press", function(date){
	if(active) {
		SpeechToText.stop();
	} else {
		SpeechToText.start();
	}
});



SpeechToText.on("sentence", function(sentence){
	console.log(util.inspect(sentence, {depth: 5}));
});