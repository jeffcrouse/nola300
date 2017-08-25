const util = require('util');
var mongoose = require('mongoose');
var Story = require('./Story');

mongoose.connect('mongodb://localhost/nola300', {useMongoClient: true});

var story = new Story();
story.name = {first: "Jeff", last: "Crouse"}
story.email = "jeff@jeffish.com";

story.save(function(err, _story){
	if(err) console.error(err);

	else console.log(util.inspect(_story, {depth: 10}));
});