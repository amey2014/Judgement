var gameManager = require('./judgementManager.js');
exports.initialize = initializeSockets;
exports.current_clients = current_clients;
exports.removePlayer = removePlayer;

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
	  	
	  	socket.on('leave-room', leaveRoom.bind(socket));
	  	
	  	socket.on('ping-room', pingRoom.bind(socket));
	  	
	  	socket.on('get-all-players', getAllPlayers.bind(socket));
	  	
	  	socket.on('get-all-rooms', getAllRooms.bind(socket));
	  	
	  	socket.on('disconnect', function(){ 
	  		console.log("Client Disconnected: ",socket.playerName, socket.id); 
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

function removePlayer(name){
	var socket = null;
	var socketId = null;
	
	var sockets = io.nsps[namespace].sockets;
	for(var id in sockets){
		if(sockets[id].playerName === name){
			socket = sockets[id];
			break;
		}
		else{
			socket = null;
		}
	}
	
	if(socket) {
		socketId = socket.id;
		console.log("Disconnecting player: " + socket.playerName);
		// var playerSocket = io.nsps[namespace].sockets[socketId];
		socket.disconnect();
		
		gameManager.room.removePlayer(socketId, function(){
			nsp.emit('player-left', { players: gameManager.room.getPlayers(), id: socketId });
		});
		
		console.log("Player disconnected");
	}else{
		console.log("Cannot disconnect. Socket not found");
	}
	
	
}

function leaveRoom(data, fn) {
	var socket =this;
	console.log("Leaving room: " + socket.id);
	socket.leave(data.room, fn);
	gameManager.room.removePlayer(socket.id, function(){
		nsp.emit('player-left', { players: gameManager.room.getPlayers(), id: socket.id });
	});
}

function pingRoom(data, fn) {
	console.log('------------------------------');
	console.log("Ping from: " + data.playerName);
	console.log('------------------------------');
	console.log('-----Diablo Room-----');
	console.log(io.nsps[namespace].adapter.rooms['diablo']);
	console.log('--------Current Clients-------------');
	console.log(current_clients);
	console.log('---------Sockets------------');
	console.log(io.nsps[namespace].sockets);
	console.log('----------------------------');
	/*if(map[data.playerName].socketId === socket.id){
		fn({ data: map[data.playerName].data });
	}*/
}

function joinRoom(data, fn) {
	var socket = this;
	console.log(data.playerName + " joining the room: " + data.room);
	if(io.nsps[namespace].adapter.rooms[data.room]){
		var clientSocketList = io.nsps[namespace].adapter.rooms[data.room].sockets;
		var clientKeys = Object.keys(clientSocketList);
		var numClients = clientKeys.length;
		console.log("Total players: " + numClients);
		
		if(numClients < gameManager.room.game.totalPlayersRequired){
			socket.join(data.room);
			console.log(data.playerName + "joined the room: " + data.room);
			socket.playerName = data.playerName;
			current_clients[socket.id].username = data.playerName;

			gameManager.room.addPlayer(socket.id, data.playerName, function(){
				var allPlayers = gameManager.room.getPlayers();
				socket.broadcast.to(data.room).emit('player-joined', { players: allPlayers });
				
				if(allPlayers.length === gameManager.room.game.totalPlayersRequired){
					var key = allPlayers[0].id;
					console.log("Admin Key " + key);
					var adminSocket = io.nsps[namespace].sockets[key]; // console.log(io.nsps[namespace].sockets[key]);
					// console.log(adminSocket);
					if(adminSocket){
						adminSocket.emit('game-can-start');
					}
					else{
						console.log("Admin socket not found");
					}
				}
			});
		}else{
			console.log("Cannot add more players");
		}

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

