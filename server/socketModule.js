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
	  	
	  	socket.on('start-the-game', startTheGame.bind(socket));
	  	
	  	socket.on('set-bid', setBid.bind(socket));
	  	
	  	socket.on('play-card', playCard.bind(socket));
	  	
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

function setBid(data, callback){
	gameManager.room.setBid(data, callback);
	var players = gameManager.room.getPlayers();
	var bids = players.map(function(p){
		return { id: p.id, tricksBidded: p.tricksBidded };
	});
	console.log("bids count: " + gameManager.room.game.currentRound.bids);
	if(gameManager.room.game.currentRound.bids === 4){
		gameManager.room.game.currentRound.startPlayerIndex = (gameManager.room.game.currentRound.totalTricks - 1) % 4; // set this to 0 as bidding process increments it.
		// gameManager.room.game.currentRound.currentTrick;
		console.log(gameManager.room.game.currentRound.startPlayerIndex)
		gameManager.room.game.currentRound.inProgress = true;
		nsp.emit('start-bidding', { 
				round: gameManager.room.game.currentRound, 
				playerBids: bids, 
				player: players[gameManager.room.game.currentRound.startPlayerIndex],
				startPlaying: true
			}
		);
	}else{
		nsp.emit('start-bidding', { 
			round: gameManager.room.game.currentRound, 
			playerBids: bids, 
			player: players[gameManager.room.game.currentRound.startPlayerIndex] 
		});
	}
}

function playCard(data, callback) {
	var result = gameManager.room.game.playCard(data);
	var players = gameManager.room.getPlayers();
	if(result.continueCurrentRound){
		console.log("Next player is ");
		console.log(players[gameManager.room.game.currentRound.startPlayerIndex]);
		var round = gameManager.room.game.currentRound;
		
		if(result.continueCurrentTrick){
			var baseCard = round.playerCards[round.currentTrick][0];
			console.log("Continue trick")
			nsp.emit('next-player', { 
				round: gameManager.room.game.currentRound,  
				player: players[gameManager.room.game.currentRound.startPlayerIndex] ,
				players: players,
				previousPlayerCard: data,
				baseCard: baseCard
			});
		}else{
			console.log("trick completed");
			console.log(players);
			
			nsp.emit('trick-completed', { 
				round: gameManager.room.game.currentRound,
				previousPlayerCard: data,
				players: players,
				previousTrickWinner: result.winningPlayerId
			});
			
			setTimeout(function(){
				nsp.emit('next-player', { 
					round: gameManager.room.game.currentRound,  
					player: players[gameManager.room.game.currentRound.startPlayerIndex] ,
					players: players,
					previousPlayerCard: null,
					baseCard: null
				});
			}, 3000);
		}
	}else{
		console.log("start bidding for next round")
		console.log(gameManager.room.game.currentRound);
		
		var players = gameManager.room.getPlayers();
		
		nsp.emit('trick-completed', { 
			round: gameManager.room.game.currentRound,
			previousPlayerCard: data,
			players: players,
			previousPlayerCard: data,
			baseCard: null,
			previousTrickWinner: result.winningPlayerId
		});
		
		gameManager.room.game.assignPoints();
		gameManager.room.game.clearPlayersBid();
		gameManager.room.game.setupNewRound();
		
		setTimeout(function(){
			nsp.emit('round-completed', { 
					players: players,
					previousPlayerCard: null,
					previousTrickWinner: result.winningPlayerId
				}
			);
			
			setTimeout(function(){
				// gameManager.room.game.startNewRound();
				gameManager.room.game.shuffle(53);
				gameManager.room.game.distributeCards();

				var key = null;
				
				for(var i = 0; i < players.length; i++){
					key = players[i].id;
					socket = io.nsps[namespace].sockets[key]; // console.log(io.nsps[namespace].sockets[key]);
					// console.log(adminSocket);
					if(socket){
						socket.emit('game-started', { 
								round: gameManager.room.game.currentRound, 
								data: players[i] 
							}
						);
					}
				}
				
				nsp.emit('start-bidding', { 
					round: gameManager.room.game.currentRound, 
					playerBids: null, 
					player: players[gameManager.room.game.currentRound.startPlayerIndex] }
				);
				
			}, 5000);
			
		}, 3000);
			
		
		
		
	}
	
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

function startTheGame(){
	gameManager.room.game.initializeRounds();
	// console.log(newGame);
	gameManager.room.game.setupNewRound();
	gameManager.room.game.shuffle(53);
	gameManager.room.game.distributeCards();
	var players = gameManager.room.getPlayers();
	var key = null;
	
	for(var i = 0; i < players.length; i++){
		key = players[i].id;
		socket = io.nsps[namespace].sockets[key]; // console.log(io.nsps[namespace].sockets[key]);
		// console.log(adminSocket);
		if(socket){
			socket.emit('game-started', { 
					round: gameManager.room.game.currentRound, 
					data: players[i] 
				}
			);
		}
	}
	
	nsp.emit('start-bidding', { 
		round: gameManager.room.game.currentRound, 
		playerBids: null, 
		player: players[gameManager.room.game.currentRound.startPlayerIndex] }
	);
	
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

