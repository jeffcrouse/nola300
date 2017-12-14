var path = require("path");
var which = require('which');
var exec = require('child_process').exec;

var INTRO = path.join(__dirname, "resources", "Intro_Card_ALT_Audio.mov");
var OUTRO = path.join(__dirname, "resources", "End_Card02.mov");
var LUT = path.join(__dirname, "resources", "Testing_Color_1_3.C0046.cube");

var ffmpeg = "ffmpeg";
which('ffmpeg', function (err, resolvedPath) {
	if(err) throw err;
	ffmpeg = resolvedPath;
});



function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; 
}

var ERRORS_ROOT = "/Users/jeff/Desktop/NOLA_ERRORS";
var id = "Skon68GlM";
var vid_00 = { path: path.join(ERRORS_ROOT, id, "vid_00.mp4") };
var vid_01 = { path: path.join(ERRORS_ROOT, id, "vid_01.mp4") };
var edit = { path: path.join(ERRORS_ROOT, id, `${id}-v2.mp4`) };
var duration = 32000;
var song = path.join(__dirname, "resources", "Soundtracks", "Drum_Track_4.wav");



var concat = [];
var filters = [];
var d = Math.min(duration/1000.0, 45);
var label = 0;
var start = 0;
var cam = 0;

do {
	var clip_length = 5 + (Math.random()*4);
	var end = Math.min(start+clip_length, d);
	// lut3d=${LUT}, 
	filters.push(`[${cam}:v]trim=start=${start}:end=${end}, setpts=PTS-STARTPTS[v${label}]`);
	filters.push(`[0:a]atrim=start=${start}:end=${end}, asetpts=PTS-STARTPTS[a${label}]`);
	concat.push(`[v${label}][a${label}]`);
	label++;
	cam = label % 2;
	start = end;
} while(start < d);

filters.push(`${concat.join("")}concat=n=${concat.length}:v=1:a=1[vedit1][aedit1]`);
filters.push(`[2:v]scale=1920:1080,fps=24,format=yuva420p,setpts=PTS-STARTPTS[intro]`);
filters.push(`[3:v]scale=1920:1080,fps=24,format=yuva420p,setpts=PTS+${d-4}/TB[outro]`);
filters.push(`[vedit1][intro]overlay=eof_action=pass[vedit2]`);
filters.push(`[vedit2][outro]overlay=0:0[vedit3]`);
//filters.push(`[vedit3]fade=in:0:30[vedit4]`);
filters.push(`[aedit1]afade=t=in:st=0:d=2, afade=t=out:st=${d-4}:d=4[aedit2]`);
// 
filters.push(`[4:a]atrim=start=0:end=${d}, volume=0.8, afade=t=out:st=${d-4}:d=4[soundtrack]`);
filters.push(`[soundtrack][aedit2]amix[aedit3]`);

var cmd = `${ffmpeg} -y -i "${vid_00.path}" -i "${vid_01.path}" -i "${INTRO}" -i "${OUTRO}" -i "${song}" `;
cmd += `-filter_complex "${filters.join(";")}" -map "[vedit3]" -map "[aedit3]" `;
cmd += `-threads 2 -c:v libx264 -crf 23 -preset fast -c:a aac -pix_fmt yuv420p "${edit.path}"`;


console.log(cmd);

exec(cmd, (error, stdout, stderr) => {
	if(error) {
		console.log(error);
	}
	console.log("done");
});

