const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

app.use(express.json());
app.use(express.static("public"));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

const devices = {};
const webClients = {};

io.on("connection", (socket) => {
  console.log("New Connection:", socket.id);

  socket.on("register-device", (data) => {
    const deviceCode = typeof data === "string" ? data : data.deviceCode;
    devices[deviceCode] = socket.id;

    console.log("Device Registered:", deviceCode);
    console.log(devices);
  });

  socket.on("check-device", (deviceCode, callback) => {
    if (devices[deviceCode]) {
      webClients[socket.id] = deviceCode;
      callback({ success: true });
    } else {
      callback({ success: false });
    }
  });

  socket.on("request-files", () => {
    const deviceCode = webClients[socket.id];
    const deviceSocketId = devices[deviceCode];

    if (deviceSocketId) {
      io.to(deviceSocketId).emit("get-files", {
        webSocketId: socket.id
      });
    }
  });

  socket.on("send-files-list", ({ webSocketId, files }) => {
    io.to(webSocketId).emit("files-list", files);
  });

  socket.on("request-file-data", ({ fileId }) => {
    const deviceCode = webClients[socket.id];
    const deviceSocketId = devices[deviceCode];

    if (deviceSocketId) {
      io.to(deviceSocketId).emit("get-file-data", {
        webSocketId: socket.id,
        fileId
      });
    }
  });

  socket.on("send-file-data", ({ webSocketId, file }) => {
    io.to(webSocketId).emit("file-data", file);
  });

  socket.on("disconnect", () => {
    delete webClients[socket.id];

    for (let code in devices) {
      if (devices[code] === socket.id) {
        delete devices[code];
      }
    }

    console.log("Disconnected:", socket.id);
  });
});

app.get("/health", (req, res) => {
  res.send("Backend running");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
