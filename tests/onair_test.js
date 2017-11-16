require('dotenv').config({ silent: true }); 
const async = require('async');
var OnAirSign = require('../modules/OnAirSign')

async.forever(done => {
	OnAirSign.toggle();
	setTimeout(done, 1000);
});
