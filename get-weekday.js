"use strict";

const fs = require('fs'),
	moment = require('moment');

module.exports = { // both properties are ES6 Promises
	time: getTime,
	parsha: getParsha
}

function getTime(time, date) {
	return new Promise((resolve, reject) => {
		// setting up variables
		date = (date && moment(date)) || moment();
		time = time || 'start'; // start is the default

		if (time === 'shacharit') {
			// fetching shacharit times
			let shacharitTimes = require('./calendars/weekday/shacharit.json');
			console.log('Got day:  ', date.day());
			let found = shacharitTimes.some((s) => {
				if (date.day() <= s.day) {
					console.log(JSON.stringify(s));
					resolve(s.times); // TODO: add support for ordinal
					return true;
				}
			});
			if (!found)
				reject(Error('Could not get shacharit time.'));
			return;
		}

		getWeekSegment(date).then((week) => {
			if (time === 'arvit') {
				resolve(moment(week.mincha, 'HH:mm')
				.add(30, 'm')
				.format('HH:mm'));
			} else {
				resolve(week[time]);
			}
		})
		.catch((err) => reject(err));
	});
}

function getParsha(date) {
	return new Promise((resolve, reject) => {
		date = (date && moment(date)) || moment();
		getWeekSegment(date).then((week) => {
			resolve(week.parsha);
		})
		.catch((err) => reject(err));
	});
}

// param 'date' expected to be instance of moment
function getWeekSegment(date) {
	return new Promise((resolve, reject) => {
		// reading files in weekday directory
		fs.readdir('./calendars/weekday/', (err, files) => {
			if (err) {
				reject(Error('Could not get files in weekday directory.'));
				return;
			}

			files = files.map((val) => val.slice(0, -5));
			let fname;
			let foundFile = files.some((fn) => {
				let vals = fn.split('~').map((val) => moment(val, 'DD-MM-YYYY'));
				if (date.isSameOrBefore(vals[1]) && date.isAfter(vals[0])) {
					fname = fn + '.json';
					return true;
				}
			});

			if (!foundFile) {
				reject(Error('Could not get weekday file for the requested date.'));
				return;
			}

			// getting the json file
			let weeks = require('./calendars/weekday/' + fname);
			// finding the right week within the .json file
			let weekIndex;
			let foundWeek = weeks.some((week, index) => {
				if (date.isSameOrBefore(moment(week.date, 'DD-MM-YYYY'))) {
					weekIndex = index;
					return true;
				}
			});

			// if week object was not found.
			if (!foundWeek) {
				reject(Error('Could not get requested week.'));
				return;
			}

			resolve(weeks[weekIndex]);
		});
	});
}
