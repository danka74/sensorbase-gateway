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
const db = firebase.firestore();
var userId = null;

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
  if(userId != null) {
    var sensorData = JSON.parse(data);

    if(sensorData.data != "START") {
      const battery = sensorData.data[0];
      const temp = sensorData.data[1];
      const hum = sensorData.data[2];
      const pres = sensorData.data[3];
      const soil = sensorData.data[4];

      console.log("Saving to user: " + userId);
      store(sensorData.sender, "voltV", battery);
      store(sensorData.sender, "tempC", temp);
      store(sensorData.sender, "humPerc", hum);
      store(sensorData.sender, "presHPa", pres);
      store(sensorData.sender, "moistPerc", soil);
    }
  } else {
    console.log("Data received but not signed into Firebase");
  }
});

const store = function(sensor, quantityId, value) {
  if(userId != null) {
    // check if sensor exists in db
    const sensorId = sensor.toString();
    const sensorRef = db.collection("sensor").doc(userId).collection("sensor").doc(sensorId);
    sensorRef.get().then((s) => {
      // if sensor does not exist, add it
      if(!s.exists) {
        sensorRef.set({id: sensorId, name: "sensor" + sensorId })
        .then((res) => console.log("sensor stored!"))
        .catch((err) => console.log("sensor store: " + err));
      }
    }).catch((err) => console.log("sensor ref: " + err));

    // check if quantity exists
    const quantityRef = db.collection("sensor").doc(userId).collection("sensor").doc(sensorId).collection("quantity").doc(quantityId);
    quantityRef.get().then((q) => {
      if(!q.exists) {
        quantityRef.set({id: quantityId, name: "quantity" + quantityId, unit: "unit" + quantityId})
        .then((res) => console.log("quantity stored!"))
        .catch((err) => console.log("quantity store: " + err));
      }
    }).catch((err) => console.log("quantity ref: " + err));

    // store value and time
    const ref = db.collection("data").doc(userId).collection(sensorId).doc("data").collection(quantityId);
    const doc = {v: value, t: new Date()};
    console.log(doc);
    ref.add(doc).then((result) => {
      console.log("result: " + result);
    }).catch((err) => console.log("data store: " + err));
  } 
}

app.post('/auth', (req, res) => {
  var credential = firebase.auth.GoogleAuthProvider.credential(req.body);
  firebase.auth().signInAndRetrieveDataWithCredential(credential).then((user) => {
    console.log("Logged in to Firebase: " + JSON.stringify(user));
    userId = user.user.uid;
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
    userId = null;
    console.log("Signed out");
  })
});

var httpsServer = https.createServer(credentials, app);
httpsServer.listen(8443);
