require('dotenv').config({ silent: true }); 
var debug = require('debug')('postprocess');
const path = require('path');
const util = require('util');
var promisify = require("promisify-node");
var fs = promisify("fs");
var glob = require("glob");
const exec = require('child_process').exec;

var AWS = require('aws-sdk');

AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
var s3bucket = new AWS.S3({params: {Bucket: 'nola300'}});


/********************************************************************************************
██████╗  ██████╗ ███████╗████████╗   ██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗
██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝   ██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝
██████╔╝██║   ██║███████╗   ██║█████╗██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗
██╔═══╝ ██║   ██║╚════██║   ██║╚════╝██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║
██║     ╚██████╔╝███████║   ██║      ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║
╚═╝      ╚═════╝ ╚══════╝   ╚═╝      ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝
**********************************************************************************************/



var loop = function() {

	var pattern = util.format("%s/*.json", process.env.STORAGE_ROOT);
	glob(pattern, {cwd: process.env.STORAGE_ROOT}, function (err, files) {
		if(err) debug(err);

		debug(files);
		var p = Promise.resolve();


		files.forEach(function(file){

			p = p.then(() => {
				debug("OPENING", file);
				return fs.readFile(file, "utf8");
			})

			p = p.then(str => {
				var obj = JSON.parse(str);
				debug("COMPRESSING", obj.id);

				var _root = util.format("%s/%s", process.env.STORAGE_ROOT, obj.id);
				var archive = _root+".tar.gz";
				var pattern = _root+"*";

				var cmd = util.format("tar cvzf %s %s", archive, pattern);
				debug(cmd);

				return new Promise((resolve, reject)=>{
					exec(cmd, {cwd: process.env.STORAGE_ROOT}, function(err){
						if(err) reject(err);
						else resolve(obj.id)
					})
				});
			});


			p = p.then(id => {
				debug("READING", id);

				var archive = util.format("%s/%s.tar.gz", process.env.STORAGE_ROOT, id);

				return new Promise((resolve, reject) => {

					fs.readFile(archive).then(data => {
						var params = { Key: path.basename(archive), Body: data };
	            		debug("UPLOADING", id);

	            		s3bucket.upload(params, function (err, data) {
							if(err) reject(err);
							else resolve(id);
						});
	            	});
				});
			});


			p = p.then(id => {
				debug("DELETING", id);

				var pattern = util.format("%s/%s*", process.env.STORAGE_ROOT, id);
				return new Promise((resolve, reject) => {

					glob(pattern, function(err, files){
						if(err) return reject(err);

						var p = Promise.resolve();
						files.forEach(function(file){
							p = p.then( () => { return fs.unlink(file); } );
						});

						return resolve(p);
					});
				});
			});
		
		}); // end files.forEach


		p.then(()=>{
			setTimeout(loop, 5000);
		}).catch(err => {
			debug(err);
		});
	})
}

loop();