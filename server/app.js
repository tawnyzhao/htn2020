require('dotenv').config();
const express = require("express");
const debug = require("debug")("server:server");
const http = require("http");

const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
const cors = require("cors");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const sessionRouter = require("./routes/session");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use("/users", usersRouter);
app.use("/session", sessionRouter);

let scores = {};
let names = {}; // not used
let playersReady = {
  //  id: true | false
}
let serverEndTime = 0;

const DEFAULT_ROOM = "room1";

io.on("connection", (socket) => {
  socket.join(DEFAULT_ROOM); // only 1 room for now
  
  // init player
  scores[socket.id] = 0;
  playersReady[socket.id] = false;
  
  // tell players ready state and ids
  io.to(DEFAULT_ROOM).emit("pull ready", playersReady);
  io.to(DEFAULT_ROOM).emit("pull score", scores);
  // io.to(DEFAULT_ROOM).emit("pull name", names);

  socket.on("push score", (msg) => {
    console.log(`new score ${socket.id}: ${msg}`);
    scores[socket.id] = msg;
    io.to(DEFAULT_ROOM).emit("pull score", scores);
  });

  socket.on("push name", (name) => {
    console.log(`new name ${socket.id}: ${name}`);
    names[socket.id] = name;
    io.to(DEFAULT_ROOM).emit("pull name", names);
  });

  socket.on("push start", (endTime) => {
    console.log(`new endTime ${socket.id}: ${endTime}`);
    serverEndTime = endTime;
    io.to(DEFAULT_ROOM).emit("pull start", serverEndTime);
  });

  socket.on("push ready", (ready) => {
    console.log(`new ready ${socket.id}: ${ready}`);
    playersReady[socket.id] = ready;
    io.to(DEFAULT_ROOM).emit("pull ready", playersReady);
    // start game if all players ready
    if (Object.keys(playersReady).every((key) => playersReady[key])) {
      let endtime = new Date().getTime() + 15000; // 3 sec countdown, 30 sec game
      io.to(DEFAULT_ROOM).emit("pull start", endtime);
    };
  });

  socket.on("disconnecting", () => {
    delete scores[socket.id];
    delete names[socket.id];
    delete playersReady[socket.id];
    io.to(DEFAULT_ROOM).emit("pull score", scores);
    io.to(DEFAULT_ROOM).emit("pull name", names);

    console.log(`a user disconnected ${socket.id}`);
  });

  console.log(`a user connected ${socket.id}`);
});

const port = 9000;

server.listen(port);
server.on("listening", onListening);

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}
