var path = require('path');
var CanonCamera = require('../modules/CanonCamera')


var exe = path.join("/Users", "jeff", "Developer", "canon-cli", "build", "Release", "canon-cli");
var cam0, cam1;


var tasks = [
	(done) => {  cam0 = new CanonCamera("122053000579", exe); } 
	(done) => {  cam1 = new CanonCamera("122053000579", exe); } 
];


