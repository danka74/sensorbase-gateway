const express = require("express");
const fs = require('fs');
const bodyParser = require("body-parser")

const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());

const https = require('https');
const privateKey  = fs.readFileSync('privkey.pem', 'utf8');
const certificate = fs.readFileSync('fullchain.pem', 'utf8');
const credentials = {key: privateKey, cert: certificate};

const firebase = require("firebase");
const config = require("./config");
firebase.initializeApp(config);
var useerId = null;

const SerialPort = require("serialport");
const Readline = require('@serialport/parser-readline')
const serialportDevice = "/dev/ttyAMA0";
const baudRate = 19200;
var port = new SerialPort(serialportDevice, {
  baudRate: baudRate
});
const parser = port.pipe(new Readline({ delimiter: '\n' }));


// Read data that is available but keep the stream from entering "flowing mode"
parser.on("data", (data) => {
  console.log("Data: ", data);
});

app.post('/auth', (req, res) => {
  var  accessObject = req.body;
  console.log(accessObject.accessToken);
  console.log(accessObject.idToken);
  var credential = firebase.auth.GoogleAuthProvider.credential(accessObject.idToken, accessObject.accessToken);
  console.log(JSON.stringify(credential));
  firebase.auth().signInAndRetrieveDataWithCredential(credential).then((user) => {
    console.log("Logged in to Firebase: " + JSON.stringify(user));
    userId = user.uid;
  }).catch(
    function(error) {
        console.log("Error signing in to Firebase with user " +
            error.email + ": " + error.message + " (" +
            error.code + ")");
        userId = null;
    });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end();
});

app.get('/signout', (req, res) => {
  firebase.auth().signOut().then(() => {
    useerId = null;
    console.log("Signed out");
  })
});

var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8443);
