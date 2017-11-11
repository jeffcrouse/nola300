require('dotenv').config({ silent: true }); 
var debug = require('debug')('story');
var mongoose = require('mongoose');
const path = require('path');
var Schema = mongoose.Schema;
const async = require('async');
const fs = require('fs');
const exec = require("child_process").exec;
var which = require('which');
var shortid = require('shortid');
var request = require('request');
var _ = require('lodash');
var glob = require('glob');

/****************************************************************************************
██████╗ ███████╗███████╗ ██████╗ ██╗   ██╗██████╗  ██████╗███████╗███████╗
██╔══██╗██╔════╝██╔════╝██╔═══██╗██║   ██║██╔══██╗██╔════╝██╔════╝██╔════╝
██████╔╝█████╗  ███████╗██║   ██║██║   ██║██████╔╝██║     █████╗  ███████╗
██╔══██╗██╔══╝  ╚════██║██║   ██║██║   ██║██╔══██╗██║     ██╔══╝  ╚════██║
██║  ██║███████╗███████║╚██████╔╝╚██████╔╝██║  ██║╚██████╗███████╗███████║
╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝

Various paths that are needed for a Story, mostly for the video edit.
****************************************************************************************/                                                                    

var INTRO = path.join(__dirname, "resources", "Intro_Card.mov");
var OUTRO = path.join(__dirname, "resources", "End_Card.mov");
var LUT = path.join(__dirname, "resources", "Testing_Color_1_3.C0046.cube");

var ffmpeg = "ffmpeg";
which('ffmpeg', function (err, resolvedPath) {
	if(err) throw err;
	ffmpeg = resolvedPath;
});

var soundtracks = [];
var pattern = path.join(__dirname, "resources", "Soundtracks", "*.wav");
debug(pattern);
glob(pattern, function (err, files) {
	if(err) debug(err);
	debug(files);
	soundtracks = files;
})



/****************************************************************************************
███████╗ ██████╗██╗  ██╗███████╗███╗   ███╗ █████╗ 
██╔════╝██╔════╝██║  ██║██╔════╝████╗ ████║██╔══██╗
███████╗██║     ███████║█████╗  ██╔████╔██║███████║
╚════██║██║     ██╔══██║██╔══╝  ██║╚██╔╝██║██╔══██║
███████║╚██████╗██║  ██║███████╗██║ ╚═╝ ██║██║  ██║
╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝
****************************************************************************************/  

var SentenceSchema = Schema({
	text: 		{ type: String, required: true },
	elapsed: 	{ type: Number, required: true },
	nlu: 		{ type: Schema.Types.Mixed, default: null }
});

var StorySchema = Schema({
	active:  		{ type: Boolean, default: true },
	createdAt:  	{ type: Date, default: Date.now },
	firstName: 		{ type: String, required: true, min: 2, max: 20 },
	lastName: 		{ type: String, required: true, min: 2, max: 30 },
	email: 			{ type: String, required: false },
	zipCode: 		{ type: Number, required: true },
	emailList: 		{ type: Boolean, default: false },
	shortid: 		{ type: String, default: shortid.generate },
	location: 		{ type: String, default: "mobile" },
	startTime: 		{ type: Date },
	endTime: 		{ type: Date },
	sentences: 		[ SentenceSchema ],
	error: 			{ type: String, default: null },
	readyForEdit: 	{ type: Boolean, default: false },
	edited: 		{ type: Boolean, default: false },
	uploaded: 		{ type: Boolean, default: false },
	infoed: 		{ type: Boolean, default: false }
});






/****************************************************************************************
██╗   ██╗██╗██████╗ ████████╗██╗   ██╗ █████╗ ██╗     ███████╗
██║   ██║██║██╔══██╗╚══██╔══╝██║   ██║██╔══██╗██║     ██╔════╝
██║   ██║██║██████╔╝   ██║   ██║   ██║███████║██║     ███████╗
╚██╗ ██╔╝██║██╔══██╗   ██║   ██║   ██║██╔══██║██║     ╚════██║
 ╚████╔╝ ██║██║  ██║   ██║   ╚██████╔╝██║  ██║███████╗███████║
  ╚═══╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
****************************************************************************************/

StorySchema.virtual('directory').get(function(){
	return path.join(process.env.STORAGE_ROOT, this.shortid);
});

StorySchema.virtual('vid_00.path').get(function(){
	return path.join(process.env.STORAGE_ROOT, this.shortid, "vid_00.mp4");
});

StorySchema.virtual('vid_01.path').get(function(){
	return path.join(process.env.STORAGE_ROOT, this.shortid, "vid_01.mp4");
});

StorySchema.virtual('edit.path').get(function(){
	return path.join(process.env.STORAGE_ROOT, this.shortid, "edit.mp4");
});

StorySchema.virtual('info.path').get(function(){
	return path.join(process.env.STORAGE_ROOT, this.shortid, "info.txt");
});

StorySchema.virtual('duration').get(function(){
	return this.endTime - this.startTime;
});

StorySchema.path('email').validate = function(email) {
	return /^[a-zA-Z0-9.!#$%&’*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(email)
};



var lean = function(doc, ret, options) {
	ret.id = ret._id;
	delete ret._id;
	delete ret.__v;
	return ret;
}

if (!StorySchema.options.toObject) StorySchema.options.toObject = {};
StorySchema.options.toObject.transform = lean;

if (!StorySchema.options.toJSON) StorySchema.options.toJSON = {};
StorySchema.options.toJSON.transform = lean;



/****************************************************************************************
███╗   ███╗███████╗████████╗██╗  ██╗ ██████╗ ██████╗ ███████╗
████╗ ████║██╔════╝╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗██╔════╝
██╔████╔██║█████╗     ██║   ███████║██║   ██║██║  ██║███████╗
██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║   ██║██║  ██║╚════██║
██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██████╔╝███████║
╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
****************************************************************************************/


/**
*	Run the FFMPEG command that turns the 2 videos, intro overlays, and audio into a single 
* 	edit. This is pretty gnarly, but that's how FFMPEG is.
*/
StorySchema.methods.do_edit = function(done) {
	debug("do_edit", this.shortid);

	function getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min; 
	}

	var n = getRandomInt(0, soundtracks.length);
	var song = soundtracks[n];

	var concat = [];
	var filters = [];
	var d = Math.min(this.duration/1000.0, 45);
	var cam = 0;
	var label = 0;
	var start = 0;
	
	do {
		var clip_length = 5 + (Math.random()*4);
		var end = Math.min(start+clip_length, d);
		filters.push(`[${cam}:v]lut3d=${LUT}, trim=start=${start}:end=${end}, setpts=PTS-STARTPTS[v${label}]`);
		filters.push(`[${cam}:a]atrim=start=${start}:end=${end}, asetpts=PTS-STARTPTS[a${label}]`);
		concat.push(`[v${label}][a${label}]`);
		label++;
		cam = label % 2;
		start = end;
	} while(start < d);
	
	filters.push(`${concat.join("")}concat=n=${concat.length}:v=1:a=1[vedit1][aedit1]`);
	filters.push(`[2:v]scale=1920:1080,fps=24,format=yuva420p,setpts=PTS+2/TB[intro]`);
	filters.push(`[3:v]scale=1920:1080,fps=24,format=yuva420p,setpts=PTS+${d-4}/TB[outro]`);
	filters.push(`[vedit1][intro]overlay=0:0[vedit2]`);
	filters.push(`[vedit2][outro]overlay=0:0[vedit3]`);
	filters.push(`[vedit3]fade=in:0:30[vedit4]`);
	filters.push(`[aedit1]afade=t=in:st=0:d=2, afade=t=out:st=${d-4}:d=4[aedit2]`);
	filters.push(`[4:a]atrim=start=0:end=${d}, afade=t=out:st=${d-4}:d=4, volume=0.75[soundtrack]`);
	filters.push(`[soundtrack][aedit2]amix[aedit3]`);

	var cmd = `${ffmpeg} -y -i "${this.vid_00.path}" -i "${this.vid_01.path}" -i "${INTRO}" -i "${OUTRO}" -i "${song}" `;
    cmd += `-threads 1 -filter_complex "${filters.join(";")}" -map "[vedit4]" -map "[aedit3]" `;
    cmd += `-c:v libx264 -preset medium -crf 18 -c:a aac -pix_fmt yuv420p "${this.edit.path}"`;
    debug("command", cmd);

	exec(cmd, {cwd: this.directory}, (error, stdout, stderr) => {
		if(error) return done(error);
		// console.log("stdout", stdout);
		// console.log("stderr", stderr);

		fs.access(this.edit.path, fs.R_OK | fs.W_OK, err => {
			if(err) return done(err);
			this.edited = true;
			this.save(done)
		});
	});
}


/**
*	Upload the file and all data to the process.env.UPLOAD_ENDPOINT
*/
StorySchema.methods.upload = function(done) {
	
	var fields = ['firstName', 'lastName', 'zipCode', 'emailList', 'createdAt', 'email', 
		'shortid', 'location', 'startTime', 'endTime',  'sentences'];
	var obj = _.pick(this.toObject(), fields);
	debug("uploading", obj);

	var formData = {
		video: fs.createReadStream(this.edit.path),
		data: JSON.stringify(obj)
	};
	request.post({url: process.env.UPLOAD_ENDPOINT, formData: formData}, (err, httpResponse, body) => {
		if(err) 			return done(err);

		debug("http response", body);
		if(body != "OK") 	return done("unexpected response from server: "+body)
		
		this.uploaded = true;
		this.save(done);
	});
}


/**
*	Save this database entry as a text file in its directory.
*/
StorySchema.methods.export = function(done) {
	var fields = ['shortid', 'firstName', 'lastName', 'zipCode', 'emailList', 'createdAt', 
		'email', 'location', 'startTime', 'endTime'];
	var lines = [];
	fields.forEach(field => {
		lines.push(field + ": " + this[field]);
	});
	
	fs.writeFile(this.info.path, lines.join("\n"), done); 
}






/****************************************************************************************
███████╗████████╗ █████╗ ████████╗██╗ ██████╗███████╗
██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██║██╔════╝██╔════╝
███████╗   ██║   ███████║   ██║   ██║██║     ███████╗
╚════██║   ██║   ██╔══██║   ██║   ██║██║     ╚════██║
███████║   ██║   ██║  ██║   ██║   ██║╚██████╗███████║
╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝╚══════╝
****************************************************************************************/


/**
*	Look for any videos that aren't edited or uploaded, and take care of that.
*	This is called repeatedly (forever) from the main app
*/
StorySchema.statics.scan = function(done) {
	//debug("scanning for unedited stories");
	this.find({error: null, readyForEdit: true, uploaded: false}).exec((err, docs) => {
		if( err ) return done( err );

		//debug("found", docs.length, "unedited docs");
        async.eachSeries(docs, function(story, callback) {
			var tasks = [];
			if(!story.edited) 		tasks.push( story.do_edit.bind(story) );
			if(!story.infoed) 		tasks.push( story.export.bind(story) );
			if(!story.uploaded) 	tasks.push( story.upload.bind(story) );
        	async.series(tasks, callback);
        }, done);
	});
}







module.exports = mongoose.model('Story', StorySchema, 'stories' );



