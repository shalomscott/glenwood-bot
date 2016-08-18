'use strict';

const fs = require('fs');
const moment = require('moment');
const jsep = require('jsep');

module.exports = function(date) {
	getWeekdayFile(date)
	.then((file) => getSegmentByDate()
}

// Gets the weekday file specified by date
function getWeekdayFile(date)
{
	// setting up date
	date = (date instanceof moment && date) || moment(date);

	return new Promise((resolve, reject) => {
		// reading files in weekday directory
		fs.readdir('./calendars/weekday/', (err, files) => {
			if (err)
				throw Error('Could not get files in weekday directory.');

			files = files.map((val) => val.slice(0, -5)); // get filename without extension
			let fname;
			for (let i = 0; i < files.length; i++) {
				const vals = files[i].split('~').map(val => moment(val, 'DD-MM-YYYY'));
				if (date.isSameOrBefore(vals[1]) && date.isAfter(vals[0])) {
					fname = files[i];
				}
			}
			if (!fname)
				throw Error('Could not get weekday file for the requested date.');

			// getting the json file
			resolve(require(`./calendars/weekday/${fname}.json`));
		});
	});
}

function getSegmentByDate({constants, weeks}, date) {
	date = (date instanceof moment && date) || moment(date);
	for (let i = 0; i < weeks.length; i++) {
		if (date.isSameOrBefore(moment(weeks[i].date, 'DD-MM-YYYY'))) {
			return {constants, week: weeks[i]};
		}
	}
	throw Error('Could not find week for the date given.');
}

// function getSegmentByParsha({globals, weeks}, parsha) {
// 	for(let i = 0; i < weeks.length; i++) {
// 		if (weeks[i].parsha === parsha)
// 		return {globals, week: weeks[i]};
// 	}
// 	throw Error('Could not find week for the parsha given.');
// }



function WeekTimes(variables, constants, date) {
	if (!variables || !constants)
		throw Error('Missing argument "variables" or "constants", or both.');
	this.variables = variables;
	this.constants = constants;
	this.customDate = date; // allowed to be undefined
}

WeekTimes.prototype = {
	// Gets a specified property, where the property is a certain time (mincha, maariv...)
	get: function(prop) {
		if (typeof(prop) !== 'string')
			throw Error('Invalid property name.');

		if (variables[prop]) { // the time is defined on the "variables" object
			return parseProp(this, week[prop]);
		} else if (constants[prop]) {
			return parseProp(this, globals[prop]);
		}
		throw Error('The property does not exist.');
	}
}

// Parses a weekTimes object property
function parseProp(weekTimes, prop) {
	if (prop.constructor === Array) { // property is an array
		let res = prop[0], i;
		if (!res)
			throw Error('Empty array given as property value.');
		for (i = 1; i < prop.length - 1; i++) {
			res += ', ' + prop[i];
		}
		return (res + ' and ' + prop[i]);
	}
	else if (typeof(prop) === 'object') {
		if (!(prop.type && prop.val))
			throw Error('Propery is missing either of its properties "type" or "val".');

		switch (prop.type) {
			case 'extern':
				let days;
				try {
					days = require(prop.val);
				} catch(err) {
					throw Error(`Could not retreive external JSON file: "${prop.val}"`);
				}
				for (let i = 0; i < days.length; i++) {
					if (weekTimes.date.day() <= days[i].day) { // TODO: check if property day exists
						// parseProp in order to handle all property types (array, expression...)
						return parseProp(weekTimes, days[i].val);
					}
				}
				throw Error('Couldn\'t find the right day in property\'s external json file.');

			case 'expr':
				const parseTree = jsep(prop.val);
				let iter = parseExpression(parseTree);
				let { value, done } = iter.next();
				while (!done) {
					let next = iter.next(weekTimes.get(value));
					value = next.value;
					done = next.done;
				}
				return value;

			default:
				throw Error('Property "type" is not one of: extern or expr.');
		}
	}
	else {
		return prop;
	}
}

function* parseExpression(node) { // TODO: Parsing expressions needs improving
	switch(node.type) {
		case 'Literal':
			return node.value;

		case 'Identifier':
			return yield node.name;

		case 'BinaryExpression':
			const {left, right, operator: op} = node;
			const lval = yield* parseExpression(left); // for now assumed a string time
			const rval = yield* parseExpression(right); // for now assumed an offset
			return timeOps[op](lval, rval);

		default:
			throw Error('Invalid node type: ' + node.type + ' in property expression.');
	}
}

// Defines operations used in an "expression" type property
const timeOps = {
	'+': (time, offset) => {
		try { // REVIEW: Not sure if moment throws an error here
			return (moment(time, 'HH:mm').add(offset, 'm').format('HH:mm'));
		} catch(err) {
			throw Error('Cannot perform operation with non-arbitrary time');
		}
	},
	// TODO: make more operations
}
