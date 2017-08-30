
var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('./client_secret.json');
var doc = new GoogleSpreadsheet('1-8qrqjGRQ6O8kGfZ-gFILUmwIlSU5f--mX-v3wViHrc');

var places = {};
var items = {}
var themes = {};

var make_key = function(name) {
	return name.toLowerCase().replace(/ /g,"_");
}

doc.useServiceAccountAuth(creds, function (err) {
	doc.getRows(1, function (err, rows) {

		rows.forEach((row) => {
			var key = make_key(row.name);
			places[key] = row.name;
		});

		//console.log("places", places);
	});
	doc.getRows(2, function (err, rows) {
		rows.forEach((row) => {
			var key = make_key(row.name);
			items[key] = row.name;
		});
		//console.log("items", items);
	});
	doc.getRows(3, function (err, rows) {
		rows.forEach((row) => {
			var key = make_key(row.name);
			themes[key] = row.name;
		});
		//console.log("themes", themes);
	});
});

module.exports = {places: places, items: items, themes: themes};