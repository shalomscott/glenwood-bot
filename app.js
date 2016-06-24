"use strict";

const express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	sendToWit = require('./wit-bot');


// verify app is getting callbacks (for FB dev console)
app.get('/', (req, res) => {
	if (req.query['hub.verify_token'] === 'verify_me') {
		console.log('verification request received');
		res.send(req.query['hub.challenge']);
	}
	else
		res.send('Error, wrong validation token');
});


// parse all incoming POST requests as json
app.post('/', bodyParser.json(), (req, res) => {
	// this outer foreach can definitely be tidied up
	req.body.entry[0].messaging.forEach((msg) => {
		if (msg.message) {
			console.log('Received:  ' + msg.message.text);
			sendToWit(msg.sender.id, msg.message.text);
		}
	});
	res.sendStatus(200);
});


app.listen(process.env.PORT || 8080, () => {
	console.log('App started listening');
});
