require('dotenv').config({ silent: true }); 
var FootPedal = require('../modules/FootPedal')

FootPedal.on("press", function(date){
	console.log(date);
});


