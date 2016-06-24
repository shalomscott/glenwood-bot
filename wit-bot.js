"use strict";

const Wit = require('node-wit').Wit,
	getWeekday = require('./get-weekday'),
	moment = require('moment'),
	send = require('./send-response');

// Environment variable set to app token
const token = process.env.WIT_TOK;

const actions = {
	say: (sessionId, context, message, callback) => {
		send.text(sessionId.split('&')[0], message); // split to get rid of query param
		callback();
	},
	merge: (sessionId, context, entities, message, callback) => {
		console.log('In merge got object:  ', JSON.stringify(entities));
		for (let entity in entities) {
			context[entity] = entities[entity][0].value;
		}
		if (context.datetime) {
			// fix start of week in case of Sunday
			if (entities.datetime[0].grain === 'week' && moment().day() === 0) {
				context.datetime = moment(context.datetime).add(1, 'w').format();
			}
			context.datetimebody = entities.datetime[0]._body;
		}
		// REVIEW: This may not be good enough
		if (context.time === 'start' || (context.request === 'time' && !context.time)) {
			context.shabbat = true;
		}
		callback(context);
	},
	get_time: (sessionId, context, callback) => {
		getWeekday.time(context.time, context.datetime).then((time) => {
			context.retTime = (time.constructor === Array)?
			time.reduce((prev, curr, i, a) => {
				if (i === a.length - 1)
					return prev + ' and ' + curr;
				return prev + ', ' + curr;
			}) : time;
			callback(context);
		})
		.catch((err) => {
			console.error('Error in get_time: ', err.message);
		});
	},
	get_parsha: (sessionId, context, callback) => {
		getWeekday.parsha(context.datetime).then((parsha) => {
			context.parsha = parsha;
			callback(context);
		})
		.catch((err) => {
			console.error('Error in get_parsha: ', err.message);
		});
	},
	error: (sessionId, context, error) => { console.error(error.message); }
};

const wit = new Wit(token, actions);

module.exports = (senderId, message) => {
	// needed sort of an injection to add the verbose query param
	wit.runActions(senderId + '&verbose=true', message, {}, (err, context) => {
		if (err) {
			console.error('Got Wit error:', err.message, 'from user ID:', senderId);
			return;
		}
		console.log('Finished answering user with ID ', senderId);
	});
}
