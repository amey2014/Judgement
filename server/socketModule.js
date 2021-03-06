var gameManager = require('./judgementManager.js');
exports.initialize = initializeSockets;
exports.current_clients = current_clients;
exports.removePlayer = removePlayer;

var namespace = '/judgement-group';
var nsp = io.of(namespace);

var current_clients = {};

function initializeSockets(io){
	
	nsp.on('connection', function(socket){
		console.log('Someone connected');
		
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
	  		console.log("User Disconnected: ", socket.playerName, socket.id); 
	  		nsp.emit('player-left', { players: gameManager.room.getPlayers(), id: socket.id, playerName: socket.playerName });
	  		/*gameManager.room.removePlayer(socket.id, function(){
	  			nsp.emit('player-left', { players: gameManager.room.getPlayers(), id: socket.id });
	  		});*/
	  		if(current_clients[socket.id]) delete current_clients[socket.id];
  		});
	  	
	  	broadcastRooms(socket);
	});
	
}

function setBid(data, callback){
	var socket = this;
	console.log("SocketModule.js: Set bid for " + socket.playerName, "bids: ", data.bid);
	
	gameManager.room.setBid(data, callback);
	
	var players = gameManager.room.getPlayers();
	var bids = players.map(function(p){
		return { id: p.id, tricksBidded: p.tricksBidded };
	});
	
	var bidsCount = gameManager.room.game.currentRound.bids;
	var nextPlayerIndex = gameManager.room.game.currentRound.startPlayerIndex;
	console.log("SocketModule.js: Total Bids:", bidsCount);
	if(bidsCount === gameManager.room.game.totalPlayersRequired){
		console.log("SocketModule.js: All players have completed bidding.");
		gameManager.room.game.currentRound.startPlayerIndex = (gameManager.room.game.currentRound.totalTricks - 1) % 4; // set this to 0 as bidding process increments it.
		gameManager.room.game.currentRound.inProgress = true;
		
		nsp.emit('start-bidding', { 
				round: gameManager.room.game.currentRound, 
				playerBids: bids, 
				player: players[nextPlayerIndex],
				startPlaying: true
			}
		);
	}else{
		console.log("SocketModule.js: Continue bidding.");
		
		var nextPlayer = players[nextPlayerIndex];
		console.log("SocketModule.js: Next player to bid: ", nextPlayer.name);
		nsp.emit('start-bidding', { 
			round: gameManager.room.game.currentRound, 
			playerBids: bids, 
			player: nextPlayer,
			startPlaying: false
		});
	}
}

function getCardDetails(card){
	return card.rankShortName + ' of ' + card.suitName + ". {" + card.id + "}";
}

function playCard(data, callback) {
	var socket = this;
	console.log("SocketModule.js: Card played by:", socket.playerName, getCardDetails(data.card));
	var result = gameManager.room.game.playCard(data);
	var players = gameManager.room.getPlayers();
	
	
	if(result.continueCurrentRound){
		console.log("SocketModule.js: Continue Current Round: ", result.continueCurrentRound);
		
		var player = players[gameManager.room.game.currentRound.startPlayerIndex];
		var round = gameManager.room.game.currentRound;
		
		if(result.continueCurrentTrick){
			console.log("SocketModule.js: Continue Current Trick: ", round.currentTrick);
			console.log("SocketModule.js: Next player: ", player.name);
			
			var baseCard = round.playerCards[round.currentTrick][0];
			nsp.emit('next-player', { 
				round: round,  
				player: players[round.startPlayerIndex] ,
				players: players,
				previousPlayerCard: data,
				baseCard: baseCard
			});
		}else{
			console.log("SocketModule.js: Trick completed" );
			console.log("SocketModule.js: Winner: ", result.winner.name);
			
			nsp.emit('trick-completed', { 
				round: round,
				previousPlayerCard: data,
				players: players,
				previousTrickWinner: result.winner.id
			});
			
			setTimeout(function(){
				nsp.emit('next-player', { 
					round: round,  
					player: players[round.startPlayerIndex] ,
					players: players,
					previousPlayerCard: null,
					baseCard: null
				});
			}, 3000);
		}
	}else{
		console.log("Trick completed" );
		console.log("SocketModule.js: Winner: ", result.winner.name);
		// console.log(gameManager.room.game.currentRound);
		
		var players = gameManager.room.getPlayers();
		
		nsp.emit('trick-completed', { 
			round: gameManager.room.game.currentRound,
			previousPlayerCard: data,
			players: players,
			previousPlayerCard: data,
			baseCard: null,
			previousTrickWinner: result.winner.id
		});
		
		console.log("SocketModule.js: Assign Points for this round" );
		gameManager.room.game.assignPoints();
		console.log("SocketModule.js: Clear previous bids" );
		gameManager.room.game.clearPlayersBid();
		console.log("SocketModule.js: Set up new round" );
		gameManager.room.game.setupNewRound();
		
		round = gameManager.room.game.currentRound;
		
		setTimeout(function(){
			nsp.emit('round-completed', { 
					players: players,
					previousPlayerCard: null,
					previousTrickWinner: result.winner.id
				}
			);
			
			if(gameManager.room.game.currentRoundIndex < gameManager.room.game.rounds.length){
				setTimeout(function(){
					console.log("SocketModule.js: Shuffle & distribute cards for new round" );
					gameManager.room.game.shuffle(53);
					gameManager.room.game.distributeCards();
	
					var key = null;
					
					for(var i = 0; i < players.length; i++){
						key = players[i].id;
						socket = io.nsps[namespace].sockets[key]; // console.log(io.nsps[namespace].sockets[key]);
						// console.log(adminSocket);
						if(socket){
							socket.emit('game-started', { 
									round: round, 
									data: players[i] 
								}
							);
						}
					}
					console.log("SocketModule.js: Start bidding for new round: ", round.totalTricks );
					console.log("SocketModule.js: Player to bid:", players[round.startPlayerIndex].name);
					nsp.emit('start-bidding', { 
						round: round, 
						playerBids: null, 
						player: players[round.startPlayerIndex] }
					);
					
				}, 3000);
			}else{
				console.log("SocketModule.js: Current Round index greater than total rounds");
				console.log("SocketModule.js: Game completed");
				
				//setTimeout(function(){
				console.log("SocketModule.js: Sending game completed event" );
				
				nsp.emit('game-completed', { players: gameManager.room.getPlayers() });
					
				// }, 2000);
			}
			
		}, 1000);	
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
		console.log("SocketModule.js: Disconnecting player: ", socket.playerName);
		// var playerSocket = io.nsps[namespace].sockets[socketId];
		socket.disconnect();
		
		gameManager.room.removePlayer(socketId, function(){
			nsp.emit('player-left', { players: gameManager.room.getPlayers(), id: socketId });
		});
		
		console.log("SocketModule.js: Player disconnected: ", + socket.playerName);
	}else{
		console.log("SocketModule.js: Cannot disconnect. Socket not found");
	}
	
	
}

function leaveRoom(data, fn) {
	var socket = this;
	console.log("SocketModule.js: Leaving room: " + socket.id);
	socket.leave(data.room, fn);
	gameManager.room.removePlayer(socket.id, function(){
		nsp.emit('player-left', { players: gameManager.room.getPlayers(), id: socket.id, playerName: socket.playerName });
	});
}

function pingRoom(data, fn) {
	var socket = this;
	console.log("SocketModule.js: Ping from: " + socket.playerName);
	var players = gameManager.room.getPlayers();
	if(fn) fn({ players: players.map(function(p){ return { name: p.name, total: p.points } }), roundPoints: gameManager.room.game.pointsTable });
}

function startTheGame(){
	gameManager.room.game.initialize();
	console.log("SocketModule.js: startTheGame() is invoked.");
	console.log("SocketModule.js: Initializing all rounds.");
	gameManager.room.game.initializeRounds();
	console.log("SocketModule.js: Set up new round.");
	gameManager.room.game.setupNewRound();
	console.log("Shuffle and distribute cards.");
	gameManager.room.game.shuffle(53);
	gameManager.room.game.distributeCards();
	
	var players = gameManager.room.getPlayers();
	var round = gameManager.room.game.currentRound;
	var key = null;
	
	for(var i = 0; i < players.length; i++){
		key = players[i].id;
		socket = io.nsps[namespace].sockets[key]; // console.log(io.nsps[namespace].sockets[key]);
		// console.log(adminSocket);
		if(socket){
			socket.emit('game-started', { 
					round: round, 
					data: players[i] 
				}
			);
		}
	}
	
	console.log("SocketModule.js: Start Bidding for Round:", round.totalTricks);
	console.log("SocketModule.js: Player to bid:", players[round.startPlayerIndex].name);
	nsp.emit('start-bidding', { 
		round: round, 
		playerBids: null, 
		player: players[round.startPlayerIndex] }
	);
	
}

function getSocketsCount(){
	var clientSocketList = io.nsps[namespace].adapter.rooms[data.room].sockets;
	var clientKeys = Object.keys(clientSocketList);
	var numClients = clientKeys.length;
	console.log("Total client sockets: " + numClients);
	return numClients;
}
function joinRoom(data, fn) {
	var socket = this;
	console.log(data.playerName + " trying to join the room: " + data.room);
	if(io.nsps[namespace].adapter.rooms[data.room]){
		//getSocketsCount();
		var playerUpdated = false;
		var currentPlayers = gameManager.room.getPlayers();
		var currentPlayersCount = currentPlayers.length;
		console.log("Exisiting players count: " + currentPlayersCount);
		var existingPlayerEntries = currentPlayers.filter(function(p){
			return p.name === data.playerName;
		});
		
		if(existingPlayerEntries.length > 0){
			existingPlayerEntries[0].id = socket.id;
			socket.join(data.room);
			socket.playerName = data.playerName;
			playerUpdated = true;
			console.log("Updated current players");
			if (fn) fn({
				msg : data.playerName + " have joined: " + data.room, 
				data: { 
					id: socket.id, 
					players: gameManager.room.getPlayers(),
					round: gameManager.room.game.currentRound
				} 
			});
		}else if(currentPlayersCount < gameManager.room.game.totalPlayersRequired){
			
			socket.join(data.room);
			console.log(data.playerName + "joined the room: " + data.room);
			socket.playerName = data.playerName;
			current_clients[socket.id].username = data.playerName;
			
			gameManager.room.addPlayer(socket.id, data.playerName, function(){
				var allPlayers = gameManager.room.getPlayers();
				socket.broadcast.to(data.room).emit('player-joined', { playerName: data.playerName, players: allPlayers });
				
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
			if (fn) fn({
				msg : data.playerName + " have joined: " + data.room, 
				data: { 
					id: socket.id, 
					players: gameManager.room.getPlayers() 
				} 
			});
		}else{
			console.log("Cannot add more players");
		}

		if(existingPlayerEntries.length > 0 && gameManager.room.game.currentRound !== null){
			if(gameManager.room.game.currentRound.bids < gameManager.room.game.totalPlayersRequired){
				console.log("Bidding is in progress for round " + gameManager.room.game.currentRound.totalTicks);
				var i = currentPlayers.indexOf(existingPlayerEntries[0]);
				if(gameManager.room.game.currentRound.startPlayerIndex === i){
					console.log("Player to bid " + data.playerName);
					var bids = currentPlayers.map(function(p){
						return { id: p.id, tricksBidded: p.tricksBidded };
					});
					socket.emit('start-bidding', { 
						round: gameManager.room.game.currentRound, 
						playerBids: bids, 
						player: existingPlayerEntries[0] }
					);
				}
			}
			
			if(gameManager.room.game.currentRound.inProgress){
				console.log("Round " + gameManager.room.game.currentRound.totalTricks + " in progress");
				var i = currentPlayers.indexOf(existingPlayerEntries[0]);
				var currentTrick = gameManager.room.game.currentRound.currentTrick;
				console.log(gameManager.room.game.currentRound);
				var currentTrickCardsCount = 0;
				if(gameManager.room.game.currentRound.playerCards[currentTrick]){
					currentTrickCardsCount = gameManager.room.game.currentRound.playerCards[currentTrick].length;
				} 
				
				if(currentTrickCardsCount < currentPlayers.length){
					//if(gameManager.room.game.currentRound.startPlayerIndex === i){
					console.log("Next player is " + currentPlayers[gameManager.room.game.currentRound.startPlayerIndex].name);
					if(currentTrickCardsCount === 0){
						var bids = currentPlayers.map(function(p){
							return { id: p.id, tricksBidded: p.tricksBidded };
						});
						socket.emit('start-bidding', { 
								round: gameManager.room.game.currentRound, 
								playerBids: bids, 
								player: currentPlayers[gameManager.room.game.currentRound.startPlayerIndex],
								startPlaying: true
							}
						);
					}else{
						var baseCard = gameManager.room.game.currentRound.playerCards[gameManager.room.game.currentRound.currentTrick][0];
						socket.emit('next-player', { 
							round: gameManager.room.game.currentRound,  
							player: currentPlayers[gameManager.room.game.currentRound.startPlayerIndex] ,
							players: currentPlayers,
							previousPlayerCard: null, // gameManager.room.game.currentRound.playerCards[this.currentTrick]
							previousPlayedCards: gameManager.room.game.currentRound.playerCards[gameManager.room.game.currentRound.currentTrick],
							baseCard: baseCard
						});
					}
					
						
				}
			}
				
		}
		
	}
	else{
		console.log("Room no available: " + data.room);
		if (fn) fn({msg :"Room not available: " + data.room });
	}
}

function getPlayerIndex(id){
	var index = -1;
    for(var i =0; i < $scope.board.players.length; i++){
    	if( $scope.board.players[i].id === id){
    		index = i;
    		break;
    	}
    }
    return index;
}

function createRoom(data, fn){
	console.log(data.playerName + "joining the room: " + data.room);
	var socket = this;
	socket.playerName = data.playerName;
	socket.join(data.room);
	current_clients[socket.id].username = data.playerName;
	
	console.log(data.playerName + "joined the room: " + data.room);
	
	gameManager.room.createGame(data.room, +data.totalPlayers);
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

  	if(roomKeys){
  		console.log("Total rooms: " + roomKeys.length);
	  	var rooms = [];
	  	var count = 0;
	  	roomKeys.forEach(function(key){
	  		if(allSockets.indexOf(key) === -1){
	  			count =  Object.keys(io.nsps[namespace].adapter.rooms[key].sockets).length;
	  			rooms.push({ name: key, playerCount: count, totalPlayeArsRequired: gameManager.room.game.totalPlayersRequired });
	  		}
	  	})
	  	if(rooms && rooms.length > 0){
	  		console.log("Broadcasting rooms: " + rooms.length);
	  		nsp.emit('room-available', { rooms: rooms, players: gameManager.room.getPlayers(), totalPlayersRequired: gameManager.room.game.totalPlayersRequired });
	  	}
  	}
  	else{
  		console.log("No rooms available.");
  	}
}

