'use strict';

try {
	// load environment variables on dev server
	// (dotenv not in package dependencies)
	require('dotenv').config();
}
catch (err) {}

const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const witBot = require('./wit-bot');
const fbSend = require('./fb-send');


const FB_APP_SECRET = process.env.FB_APP_SECRET;
if (!FB_APP_SECRET) throw Error('missing FB_APP_SECRET');

let FB_VERIFY_TOKEN = 'u been verified';
// crypto.randomBytes(8, (err, buff) => {
// 	if (err) throw err;
// 	FB_VERIFY_TOKEN = buff.toString('hex');
// 	console.log('Webhook will accept the Verify Token', FB_VERIFY_TOKEN);
// });

// ----- STARTING SERVER -----

const app = express();

app.use(bodyParser.json({ verify: verifyRequestSignature })); // REVIEW

// Webhook setup
app.get('/bot', (req, res) => {
	if (req.query['hub.mode'] === 'subscribe' &&
		req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
		res.send(req.query['hub.challenge']);
	} else {
		res.sendStatus(400);
	}
});

// Message handler
app.post('/bot', (req, res) => {
	const data = req.body;
	if (data.object === 'page') {
		data.entry.forEach(handleEntry);
	}
	res.sendStatus(200);
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
	var signature = req.headers["x-hub-signature"];

	if (!signature) {
		// For testing, let's log an error. In production, you should throw an error.
		console.error("Couldn't validate the signature.");
	} else {
		var elements = signature.split('=');
		var method = elements[0];
		var signatureHash = elements[1];

		var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
												.update(buf)
												.digest('hex');

		if (signatureHash != expectedHash) {
			throw Error("Got bad request signature.");
		}
	}
}

// Function handles messaging callbacks from Facebook
function handleEntry(entry) {
	entry.messaging.forEach(event => {
		if (event.message) {
			// Got a new message.
			// We retrieve the message content
			const {text, attachments} = event.message;
			// fbid of sender
			const sender = event.sender.id;

			fbSend.typing(sender);

			if (attachments) {
				fbSend.text(sender, 'Sorry I can only process text messages for now.')
				.catch(console.error);
			} else if (text) {
				// Forwarding the message to the Wit.ai Bot Engine
				// This will run all actions until our bot has nothing left to do
				witBot.process(sender, text)
				.then(context => { // after bot is done
						if (context.text) {
							fbSend.text(sender, context.text);
						}
				})
				.catch((err) => {
					console.error('Got an error from Wit: ', err.stack || err);
				});
			}
		}
	});
}

app.listen(process.env.PORT || 8080, () => console.log('App listening :)'));
