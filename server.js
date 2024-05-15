const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const { Server } = require("socket.io");
const express = require("express");
const http = require("http");
const path = require("path");
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/views/index.html"));
});

let camProcess = null;
let latestData = {};
let personDetected = false;

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  socket.on("toggleCamera", (state) => {
    if (state) {
      if (!camProcess) {
        startCamera();
      }
    } else {
      if (camProcess) {
        stopCamera();
      }
    }
  });

  function startCamera() {
    camProcess = spawn('/usr/bin/python3', ['cam.py']);
    camProcess.stdout.on('data', (data) => {
      io.emit('camera_frame', { image: data.toString('base64') });
    });
    camProcess.stderr.on('data', (data) => {
      console.error(`cam.py stderr: ${data}`);
    });
    camProcess.on('close', (code) => {
      console.log(`cam.py process exited with code ${code}`);
      camProcess = null;
    });
  }

  function stopCamera() {
    if (camProcess) {
      camProcess.kill();
      camProcess = null;
    }
  }

});

const port = new SerialPort({ path: "/dev/cu.usbserial-110", baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

parser.on("data", (data) => {
  const sensorValues = data.split(',');
  if (sensorValues.length === 4) {
    console.log("Data from Arduino ->", sensorValues);
    latestData = {
      lightIntensity: sensorValues[0],
      temperature: sensorValues[1],
      humidity: sensorValues[2],
      mqValue: sensorValues[3]
    };

    // Log data to CSV
    logDataToCSV(latestData);
  } else {
    console.log("Unexpected data format:", data);
  }
});

app.post("/arduinoApi", (req, res) => {
  const data = req.body.data;
  port.write(data, (err) => {
    if (err) {
      console.log("Error: ", err);
      res.status(500).json({ error: "Error writing data" });
    } else {
      console.log("Data sent! ->", data);
      res.end();
    }
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

// Emit the latest sensor data to all connected clients every 5 seconds
setInterval(() => {
  io.emit("data", latestData);
}, 2000);

// Function to log data to CSV file
function logDataToCSV(data) {
  const csvFilePath = path.join(__dirname, 'sensor_data.csv');
  const csvHeaders = 'Timestamp,Light Intensity,Temperature,Humidity,MQ Sensor\n';
  const timestamp = new Date().toISOString();
  const csvLine = `${timestamp},${data.lightIntensity},${data.temperature},${data.humidity},${data.mqValue}\n`;

  // Check if the file exists
  if (!fs.existsSync(csvFilePath)) {
    fs.writeFileSync(csvFilePath, csvHeaders, 'utf8');
  }

  // Append data to the file
  fs.appendFileSync(csvFilePath, csvLine, 'utf8');
}

// TCP server to receive camera frames from cam.py
const tcpServer = net.createServer((socket) => {
  socket.on('data', (data) => {
    // Get the length of the incoming image data
    const length = data.readUInt32BE(0);
    const imageData = data.slice(4, 4 + length);

    // Emit the image data to the clients
    io.emit('camera_frame', { image: imageData.toString('base64') });
  });

  socket.on('end', () => {
    console.log('Camera feed connection closed');
  });
});

tcpServer.listen(3001, () => {
  console.log('TCP server for camera feed running on port 3001');
});
