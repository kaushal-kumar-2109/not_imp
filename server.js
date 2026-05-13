const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const devices = {};
const webClients = {};

io.on("connection", (socket) => {
    console.log("New Connection:", socket.id);

    socket.on("register-device", (data) => {
        const deviceCode =
            typeof data === "string" ? data : data.deviceCode;

        devices[deviceCode] = socket.id;

        console.log("Device Registered:", deviceCode);
        console.log("All Devices:", devices);
    });

    socket.on("check-device", (deviceCode, callback) => {
        if (devices[deviceCode]) {
            webClients[socket.id] = deviceCode;

            callback({
                success: true,
            });
        } else {
            callback({
                success: false,
            });
        }
    });

    socket.on("request-files", () => {
        const deviceCode = webClients[socket.id];
        const deviceSocketId = devices[deviceCode];

        if (deviceSocketId) {
            io.to(deviceSocketId).emit("get-files", {
                webSocketId: socket.id,
            });
        }
    });

    socket.on("request-file-data", ({ fileId }) => {
        const deviceCode = webClients[socket.id];
        const deviceSocketId = devices[deviceCode];

        if (deviceSocketId) {
            io.to(deviceSocketId).emit("get-file-data", {
                webSocketId: socket.id,
                fileId,
            });
        }
    });

    socket.on("send-file-data", ({ webSocketId, file }) => {
        io.to(webSocketId).emit("file-data", file);
    });

    socket.on("send-files-list", ({ webSocketId, files }) => {
        io.to(webSocketId).emit("files-list", files);
    });

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);

        delete webClients[socket.id];

        for (let code in devices) {
            if (devices[code] === socket.id) {
                delete devices[code];
            }
        }
    });
});

app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("Backend Running");
});

server.listen(5000, () => {
    console.log("Server Running On Port 5000");
});




// https://expo.dev/accounts/kaushal21092003/projects/System/builds/9354a98f-d394-403d-8bb9-06adbdb48660