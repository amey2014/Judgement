var gameManager = require('./judgementManager.js');
exports.initialize = initializeSockets;

var namespace = '/judgement-group';
var nsp = io.of(namespace);

function initializeSockets(io){
	
	nsp.on('connection', function(socket){
		console.log('someone connected');
		/*if(req.user && req.user.username && req.user.username !== ''){
			if(!map[req.user.username]){
				map[req.user.username] = {
					socketId: socket.id,
					data: 0
				}
			}
			map[req.user.username].socketId = socket.id;
		}
		else{
			// disconnect
		}*/
		
		//_socket = socket;
		
		socket.on("create-room", createRoom.bind(socket) );
	    
	  	socket.on('join-room', joinRoom.bind(socket));
	  	
	  	socket.on('ping-room', pingRoom.bind(socket));
	  	
	  	broadcastRooms(socket);
	});
	
}

function pingRoom(data, fn) {
	console.log("Ping from: " + data.playerName);
	console.log(io.nsps[namespace]);
	console.log(io.nsps[namespace].adapter);
	console.log(io.nsps[namespace].adapter.rooms['diablo']);

	if(map[data.playerName].socketId === socket.id){
		fn({ data: map[data.playerName].data });
	}
}

function joinRoom(data, fn) {
	var socket = this;
	console.log(data.username + "joining the room: " + data.room);
	if(io.nsps[namespace].adapter.rooms[data.room]){
		socket.join(data.room);
		console.log(data.playerName + "joined the room: " + data.room);
		socket.playerName = data.playerName;
		// get count
		var clientsList = io.nsps[namespace].adapter.rooms[data.room].sockets;
		// console.log(clientsList);
		var numClients = Object.keys(clientsList).length;
		console.log("Total players: " + numClients);
		gameManager.room.addPlayer(data.playerName, function(){
			socket.broadcast.to(data.room).emit('player-joined', { players: gameManager.room.getPlayers() });
		});
		
		if (fn) fn({msg : data.playerName + " have joined: " + data.room, data: { id: socket.id } });
	}
	else{
		console.log("Room no available: " + data.room);
		if (fn) fn({msg :"Room not available: " + data.room });
	}
}

function createRoom(data, fn){
	console.log(data.playerName + "joining the room: " + data.room);
	var socket = this;
	socket.playerName = data.playerName;
	socket.join(data.room);
	
	console.log(data.playerName + "joined the room: " + data.room);
	
	gameManager.room.createGame(data.room);
	gameManager.room.addPlayer(data.playerName, function(){
		broadcastRooms(socket);
	});
  	
	// socket.broadcast.to(data.room).emit('count', "Connected:" + " " + count);
	if (fn) fn({msg :"Room Created:" + data.room, data: { id: socket.id } });
}

function broadcastRooms(socket){
	// var rooms = io.nsps[namespace].adapter.rooms;
  	var roomKeys = Object.keys(io.nsps[namespace].adapter.rooms);
  	var allSockets =  Object.keys(io.nsps[namespace].adapter.sids);
  	
  	if(roomKeys){
  		console.log("Total rooms: " + roomKeys.length);
	  	var rooms = [];
	  	var count = 0;
	  	roomKeys.forEach(function(key){
	  		if(allSockets.indexOf(key) === -1){
	  			count =  Object.keys(io.nsps[namespace].adapter.rooms[key].sockets).length;
	  			rooms.push({ name: key, playerCount: count });
	  		}
	  	})
	  	if(rooms && rooms.length > 0){
	  		console.log("Broadcasting rooms: " + rooms.length);
	  		nsp.emit('room-available', { rooms: rooms, players: gameManager.room.getPlayers() });
	  	}
  	}
  	else{
  		console.log("No rooms available.");
  	}
}

