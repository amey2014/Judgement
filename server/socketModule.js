var gameManager = require('./judgementManager.js');
exports.initialize = initializeSockets;
exports.current_clients = current_clients;

var namespace = '/judgement-group';
var nsp = io.of(namespace);

var current_clients = {
	
}

function initializeSockets(io){
	
	nsp.on('connection', function(socket){
		console.log('someone connected');
		
		if(!current_clients[socket.id]){
			current_clients[socket.id] = {
				id: socket.id
			};
		}
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
	  	
	  	socket.on('get-all-players', getAllPlayers.bind(socket));
	  	
	  	socket.on('get-all-rooms', getAllRooms.bind(socket));
	  	
	  	socket.on('disconnect', function(){ 
	  		console.log("Client Disconnected"); 
	  		gameManager.room.removePlayer(socket.id, function(){
	  			nsp.emit('player-left', { players: gameManager.room.getPlayers(), id: socket.id });
	  		});
	  		if(current_clients[socket.id]) delete current_clients[socket.id];
  		});
	  	
	  	broadcastRooms(socket);
	});
	
}

function getAllRooms(data) {
	broadcastRooms(this);
}

function getAllPlayers(data, fn) {
	console.log("Get all players: ");

	//if(map[data.playerName].socketId === socket.id){
		fn({ players: gameManager.room.getPlayers() });
	//}
}

function pingRoom(data, fn) {
	console.log("Ping from: " + data.playerName);
	console.log(io.nsps[namespace].adapter.rooms['diablo']);
	console.log(current_clients);
	/*if(map[data.playerName].socketId === socket.id){
		fn({ data: map[data.playerName].data });
	}*/
}

function joinRoom(data, fn) {
	var socket = this;
	console.log(data.username + "joining the room: " + data.room);
	if(io.nsps[namespace].adapter.rooms[data.room]){
		socket.join(data.room);
		console.log(data.playerName + "joined the room: " + data.room);
		socket.playerName = data.playerName;
		current_clients[socket.id].username = data.playerName;
		// get count
		var clientsList = io.nsps[namespace].adapter.rooms[data.room].sockets;
		// console.log(clientsList);
		var numClients = Object.keys(clientsList).length;
		console.log("Total players: " + numClients);
		
		gameManager.room.addPlayer(socket.id, data.playerName, function(){
			socket.broadcast.to(data.room).emit('player-joined', { players: gameManager.room.getPlayers() });
			
			if(Object.keys(current_clients).length === gameManager.room.game.totalPlayersRequired){
				console.log('-----------');
				console.log(Object.keys(current_clients));
				console.log('-----------');
				var key = Object.keys(current_clients)[0];
				console.log(key);
				var adminSocket = io.nsps[namespace].sockets[key]; // console.log(io.nsps[namespace].sockets[key]);
				// console.log(adminSocket);
				
				adminSocket.emit('game-can-start');
			}
		});

		if (fn) fn({
			msg : data.playerName + " have joined: " + data.room, 
			data: { id: socket.id, players: gameManager.room.getPlayers()  } 
		});
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
	current_clients[socket.id].username = data.playerName;
	
	console.log(data.playerName + "joined the room: " + data.room);
	
	gameManager.room.createGame(data.room, data.totalPlayers);
	gameManager.room.addPlayer(socket.id, data.playerName, function(){
		broadcastRooms(socket);
	});
  	
	// socket.broadcast.to(data.room).emit('count', "Connected:" + " " + count);
	if (fn) fn({msg :"Room Created:" + data.room, data: { id: socket.id, players: gameManager.room.getPlayers() } });
}

function broadcastRooms(socket){
	// var rooms = io.nsps[namespace].adapter.rooms;
  	var roomKeys = Object.keys(io.nsps[namespace].adapter.rooms);
  	var allSockets =  Object.keys(io.nsps[namespace].adapter.sids);
  	
  	console.log('------------room keys------------');
  	console.log(roomKeys);
  	console.log('------------all sockets------------');
  	console.log(allSockets);
  	console.log('------------------------');
  	
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

