
var GoogleSpreadsheet = require('google-spreadsheet');
var debug = require('debug')('googlesheet');
var creds = require('./NOLA300-8b57e22539e6.json');
var doc = new GoogleSpreadsheet('1-8qrqjGRQ6O8kGfZ-gFILUmwIlSU5f--mX-v3wViHrc');

var places = [];
var items = []
var themes = [];

var make_key = function(name) {
	return name.toLowerCase().replace(/ /g,"_");
}

doc.useServiceAccountAuth(creds, function (err) {
	doc.getRows(1, function (err, rows) {

		rows.forEach((row) => {
			//var key = make_key(row.name);
			places.push(row.name);
		});

		debug("places", places);
	});

	doc.getRows(2, function (err, rows) {
		rows.forEach((row) => {
			//var key = make_key(row.name);
			items.push(row.name);
		});
		debug("items", items);
	});

	doc.getRows(3, function (err, rows) {
		rows.forEach((row) => {
			//var key = make_key(row.name);
			themes.push(row.name);
		});
		debug("themes", themes);
	});
});

module.exports = {places: places, items: items, themes: themes};