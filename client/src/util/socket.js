import { io } from "socket.io-client";

const socket = io("http://localhost:9000", {autoConnect: false});

/* Get socket id */
function onConnect(callback) {
  socket.on('connect', () => callback(socket.id))
}

function pushScore(score) {
  socket.emit('push score', score)
};

function pullScore(callback) {
  socket.on('pull score', scores => callback(scores))
}

function pushName(name) {
  socket.emit('push name', name)
}

function pullName(callback) {
  socket.on('pull name', names => callback(names))
}

export {
  socket,
  onConnect,
  pushScore,
  pullScore,
  pushName,
  pullName,
};
