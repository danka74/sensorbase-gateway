var express = require("express");

const app = express();
app.use(express.static('public'));

var firebase = require("firebase");

var config = require("./config");

firebase.initializeApp(config);

var SerialPort = require("serialport");

const serialportDevice = "/dev/ttyAMA0";
const baudRate = 115200;

var port = new SerialPort(serialportDevice, {
  baudRate: baudRate
});

// Read data that is available but keep the stream from entering "flowing mode"
port.on("readable", () => {
  console.log("Data:", port.read());
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
