var gameManager = require('./judgementManager.js');
exports.initialize = initializeSockets;
//exports.initializeRoom = initializeRoom;
//exports.current_clients = current_clients;
exports.removePlayer = removePlayer;

var namespace = '/games-for-entertainment';
var nsp = io.of(namespace);

var namespaces = {}; 

function initializeSockets(){
	var events = {
		CREATE_GAME: 'create-game',
		JOIN_ROOM: 'join-room',
		GET_ROOMS: 'get-rooms',
		ENTER_GAME: 'enter-game',
		GET_PLAYERS: 'get-all-players',
		GET_ALL_DETAILS: 'get-all-details',
		START_THE_GAME: 'start-the-game',
		SET_BID: 'set-bid',
		PLAY_CARD: 'play-card',
		EXIT_GAME: 'exit-game',
		DISCONNECT: 'disconnect'
	}
	// wait for client connections
	nsp.on('connection', function(socket){
		// wait for below events
		socket.on(events.CREATE_GAME, createGame.bind(socket));
		socket.on(events.ENTER_GAME, enterGame.bind(socket));
		socket.on(events.GET_ROOMS, getRooms.bind(socket));
		socket.on(events.GET_PLAYERS, getAllPlayers.bind(socket));
		socket.on(events.GET_ALL_DETAILS, getAllDetails.bind(socket));
		socket.on(events.EXIT_GAME, exitGame.bind(socket));
	  	socket.on(events.JOIN_ROOM, joinRoom.bind(socket));
	  	socket.on(events.START_THE_GAME, startTheGame.bind(socket));
	  	socket.on(events.SET_BID, setBid.bind(socket));
	  	socket.on(events.PLAY_CARD, playCard.bind(socket));
	  	
		socket.on(events.DISCONNECT, function(){ 
			console.log("Player Disconnected: ", socket.playerName, socket.id); 
			
			if(socket.roomName){
				var game = gameManager.getGameByRoomName(socket.roomName);
		  		var player = game.getPlayerById(socket.id);
		  		nsp.emit('player-disconnected', { id: socket.id, oldPlayerName: socket.playerName, oldPlayer: player, players: game.getPlayers() });
			}
  		});
	});
}

// Event 'create-game'
// creates a room in socket namespace.
// adds the client socket into that room
// creates a new room in game manager
// add player to the newly created room in game manager
// after player is added invoke callback to send all rooms from the namespace
function createGame(data, callback){
	console.log("SocketManager.CreateGame(): Creating a game");
	
	try{
		// add total players to room instance
		var socket = this;

		data.adminId = socket.id;
		// create new room in game manager
		var newRoom = gameManager.createNewRoom(data);

		// call joinRoom to enter the room
		joinRoom.call(socket, data, function(error, response){
			if (callback) {
				if(error){
					console.log(error);
					callback(error, null);
				}else{
					nsp.adapter.rooms[data.roomName].totalPlayers = +data.totalPlayers;
					response.rooms = parseRooms();
					callback(null, response);
				}
			}
			console.log("SocketManager.createGame(): Emitting 'room-created' event to the namespace");
			nsp.emit('room-created', error, response);
		});
		
		
	}catch(error){
		console.log("SocketManager.createGame(): Error:", error);
		callback(error, null);
	}
	
}

//Event 'join-room'
function joinRoom(data, callback){
	console.log("SocketManager.joinRoom(): Joining a roon");
	var socket = this;
	try{
		updateSocketDetails(socket, data);
		callback(null, {});
	}catch(error){
		console.log(error);
		callback(error, null);
	}
	
}

function updateSocketDetails(socket, data){
	console.log("SocketManager.updateSocketDetails(): Adding playerName and roomName to the socket");
	// add socket to the room
	socket.join(data.roomName);
	socket.isAdmin = data.isAdmin;
	// add playerName and roomName to the socket
	socket.playerName = data.playerName;
	socket.roomName = data.roomName;
}

//Event 'enter-game'
// callback(error, response);
function enterGame(data, callback){
	console.log("SocketManager.enterGame(): Joinign the game:", data.playerName);
	
	// add player name to socket instance
	var socket = this;
	var game = gameManager.getGameByRoomName(data.roomName);
	game.adminId = socket.isAdmin ? socket.id : game.adminId;
	
	var result = updatePlayerIfExists.call(socket, data);
	
	var response = {};
	if(result.playerUpdated) {
		console.log("SocketManager.enterGame(): Player already exists, Updating...:", data.playerName);
		response = { playerId: socket.id, newPlayer: result.newPlayer, players: game.getPlayers(), oldPlayerId: result.oldPlayerId };
	}else{
		console.log("SocketManager.enterGame(): Player not found, Creating...:", data.playerName);
		var player = game.addPlayer(socket.id, data.playerName); 
		response = { playerId: socket.id, newPlayer: player, players: game.getPlayers() };
	}

	if(result.playerUpdated){
		notifyIfBiddingIsInProgress(socket, game, response.newPlayer);
		notifyTurnToThePlayer(socket, game, response.newPlayer, response.oldPlayerId);
	}
		
	notifyAdminToStartTheGameIfWeCan(game);
	
	console.log("SocketManager.enterGame(): Emitting 'player-entered' event to the namespace");
	nsp.emit('player-entered', null, response);
	
	console.log("SocketManager.enterGame(): Invoking callback and passing cards and round details");
	response.cards = (game.playerCardsMap[response.newPlayer.id]) ? game.playerCardsMap[response.newPlayer.id] : null;
	response.round = game.currentRound;
	callback(null, response);
}

function updatePlayerIfExists(data){
	console.log("SocketManager.updatePlayerIfExists(): Check if player already exists in the list: ", data.playerName);
	var socket = this;
	var game = gameManager.getGameByRoomName(data.roomName);
	var hasNullEntry = false;
	var playerUpdated = false;
	var response = {};
	var oldId = null;
	
	var existingPlayerEntries = game.getPlayers().filter(function(p){
		if(p === null) {
			hasEmptySpace = true;
			return false;
		}
		return p.name === data.playerName;
	});
	
	if(existingPlayerEntries.length > 0){
		oldId = existingPlayerEntries[0].id;
		playerUpdated = true;
		
		// if player has cards then map those cards to new id and delete the old map
		if(oldId !== socket.id ){
			if(game.playerCardsMap[oldId]){
				game.playerCardsMap[socket.id] = game.playerCardsMap[oldId];
				delete game.playerCardsMap[oldId];
			}

			existingPlayerEntries[0].id = socket.id;
		}

		response.newPlayer = existingPlayerEntries[0];
	}

	response.hasNullEntry = hasNullEntry;
	response.playerUpdated = playerUpdated;
	response.oldPlayerId = oldId;
	return response;
}

function notifyAdminToStartTheGameIfWeCan(game){
	console.log("SocketManager.notifyAdminToStartTheGameIfWeCan():");
	if(game.canStart()){
		var adminSocket = nsp.sockets[game.adminId];

		if(adminSocket){
			console.log("SocketManager.notifyAdminToStartTheGameIfWeCan(): Emitting 'game-can-start' event to the admin socket");
			adminSocket.emit('game-can-start');
		}else{
			console.log("SocketManager.notifyAdminToStartTheGameIfWeCan(): Cannot emit 'game-can-start' event. Admin socket not found. Param 'game.adminId':", game.adminId);
		}
	}
}

function notifyIfBiddingIsInProgress(socket, game, player){
	console.log("SocketManager.notifyIfBiddingIsInProgress(): ");
	if(game.currentRound !== null){
		if(game.currentRound.bids < game.totalPlayersRequired){
			var players = game.getPlayers();
			console.log("SocketManager.notifyIfBiddingIsInProgress(): Bidding is in progress for Round: ", game.currentRound.totalTricks);
			var playerIndex = game.getPlayerIndex(player.id);
			if(game.currentRound.startPlayerIndex !== playerIndex){
				playerIndex = game.currentRound.startPlayerIndex;
			}
		
			var bids = players.map(function(p){
				return { id: p.id, tricksBidded: p.tricksBidded };
			});
			console.log("SocketManager.notifyIfBiddingIsInProgress(): Emitting 'start-bidding' event to: ", player.name);
			socket.emit('start-bidding', { 
				round: game.currentRound, 
				playerBids: bids, 
				player: players[playerIndex] 
			});
		}
	}
}

function notifyTurnToThePlayer(socket, game, player, oldPlayerId){
	console.log("SocketManager.notifyTurnToThePlayer():");
	if(game.currentRound !== null && game.currentRound.inProgress){
		console.log("Round " + game.currentRound.totalTricks + " in progress");
		var players = game.getPlayers();
		var currentRound = game.currentRound;
		var currentTrick = currentRound.currentTrick;
		var currentTrickCardsCount = 0;
		var baseCard = null;
		
		if(currentRound.playerCards[currentTrick]){
			currentTrickCardsCount = currentRound.playerCards[currentTrick].length;
		} 

		if(currentTrickCardsCount === 0){
			baseCard = null;
		}
		else if(currentTrickCardsCount < players.length){
			baseCard = currentRound.playerCards[currentRound.currentTrick][0];
			currentRound.playerCards[currentRound.currentTrick].forEach(function(card){
				if(card.id === oldPlayerId){
					card.id = player.id;
				}
			})
		}else{
			console.log("--------------------------------------------------------------");
			console.log("SocketManager.notifyTurnToThePlayer(): If you see this message then something went wrong with the logic.");
			console.log("SocketManager.notifyTurnToThePlayer(): Current Round: ", currentRound);
			console.log("SocketManager.notifyTurnToThePlayer(): Current Trick: ", currentTrick);
			console.log("SocketManager.notifyTurnToThePlayer(): Current Trick: ", currentTrickCardsCount);
			console.log("--------------------------------------------------------------");
		}
		console.log("Next player is " + players[currentRound.startPlayerIndex].name);
		/*if(currentTrickCardsCount === 0){
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
		}else{*/

		socket.emit('next-player', { 
			round: currentRound,  
			player: players[currentRound.startPlayerIndex] ,
			players: players,
			previousPlayerCard: null, // gameManager.room.game.currentRound.playerCards[this.currentTrick]
			previousPlayedCards: currentRound.playerCards[currentTrick],
			baseCard: baseCard
		});
	}
}

function startTheGame(){
	var game = gameManager.getGameByRoomName(this.roomName);
	game.initialize();
	console.log("SocketModule.js: startTheGame() is invoked.");
	console.log("SocketModule.js: Initializing all rounds.");
	game.initializeRounds();
	console.log("SocketModule.js: Set up new round.");
	game.setupNewRound();
	console.log("Shuffle and distribute cards.");
	game.shuffle(53);
	game.distributeCards();
	
	var players = game.getPlayers();
	
	var round = game.currentRound;
	
	sendIndividualNotification('game-started', game, players);
	
	console.log("SocketModule.js: Start Bidding for Round:", round.totalTricks);
	console.log("SocketModule.js: Player to bid:", players[round.startPlayerIndex].name);
	nsp.emit('start-bidding', { 
		round: round, 
		playerBids: null, 
		player: players[round.startPlayerIndex] }
	);
	
}


// Event 'get-rooms'
function getRooms(callback){
	console.log("SocketManager.getRooms(): ");
	var rooms = parseRooms();
	if (callback) {
		console.log("SocketManager.getRooms(): Total rooms: ", rooms.length);
		callback(null, { rooms: rooms });
	}
}

function parseRooms(){
	console.log("SocketManager.parseRooms(): ");
	var roomKeys = Object.keys(nsp.adapter.rooms);
  	var allSockets =  Object.keys(nsp.adapter.sids);
  	var rooms = [];
  	if(roomKeys){
	  	var count = 0;
	  	roomKeys.forEach(function(key){
	  		if(allSockets.indexOf(key) === -1){
	  			count =  Object.keys(nsp.adapter.rooms[key].sockets).length;
	  			rooms.push({ name: key, playerCount: count, totalPlayersRequired: nsp.adapter.rooms[key].totalPlayers });
	  		}
	  	})
  	}

  	return rooms; 	
}

// Event  'get-all-players'
function getAllPlayers(data, callback) {
	console.log("SocketManager.getAllPlayers(): ");
	var game = gameManager.getGameByRoomName(data.roomName);

	if(callback){
		callback({ players: game.getPlayers() });
	}
}

// Event 'get-all-details'
function getAllDetails(data, callback) {
	console.log("SocketManager.getAllDetails(): ");

	var game = gameManager.getGameByRoomName(data.roomName);
	var cards = game.playerCardsMap[this.id];

	if(callback){
		callback({ playerId: this.id, players: game.getPlayers(), round: game.currentRound, cards: cards });
	}
}

// Event 'set-bid'
function setBid(data, callback){
	console.log("SocketManager.setBid(): Inside set bid");
	var socket = this;
	var game = gameManager.getGameByRoomName(socket.roomName);
	var players = game.getPlayers();
	var bidsCount = -1;
	var nextPlayerIndex = -1;
	
	console.log("SocketManager.setBid(): Set bid: ", socket.playerName, data.bid);
	game.setBid(data);
	callback();
	
	console.log("SocketManager.setBid(): Creating an array of bids for each player");
	var bids = players.map(function(p){
		return { id: p.id, tricksBidded: p.tricksBidded };
	});
	
	bidsCount = game.currentRound.bids;
	nextPlayerIndex = game.currentRound.startPlayerIndex;
	console.log("SocketManager.setBid(): Total bids:", bidsCount);
	
	if(bidsCount === game.totalPlayersRequired){
		console.log("SocketManager.setBid(): All players have completed bidding");
		game.currentRound.startPlayerIndex = (game.currentRound.totalTricks - 1) % 4; // set this to 0 as bidding process increments it.
		game.currentRound.inProgress = true;
		
	}else{
		console.log("SocketManager.setBid(): Continue bidding. Next player to bid:", players[nextPlayerIndex].name);
	}
	
	console.log("SocketManager.setBid(): Emitting 'start-bidding' event to the namespace");
	nsp.emit('start-bidding', { 
			round: game.currentRound, 
			playerBids: bids, 
			player: players[nextPlayerIndex],
			startPlaying: game.currentRound.inProgress
		}
	);
}

// Event 'play-card'
function playCard(data, callback){
	var socket = this;
	console.log("SocketManager.playCard(): Card played:", socket.playerName, getCardDetails(data.card));
	
	var game = gameManager.getGameByRoomName(socket.roomName);
	var result = game.playCard(data);
	callback(null, { cards: game.playerCardsMap[socket.id] });
	
	var players = game.getPlayers();
	
	if(result.continueCurrentRound){
		continueCurrentRound(game, result, data);
	}else{
		roundCompleted(game, result, data);
	}
}

function continueCurrentRound(game, result, data){
	console.log("SocketManager.continueCurrentRound(): Continue Current Round:", result.continueCurrentRound);
	
	var round = game.currentRound;
	var players = game.getPlayers();
	var nextPlayer = players[round.startPlayerIndex];
	var eventName = 'next-player';
	if(result.continueCurrentTrick){
		console.log("SocketManager.continueCurrentRound(): Continue Current Trick:", round.currentTrick);
		console.log("SocketManager.continueCurrentRound(): Next player: ", nextPlayer.name);
		
		var baseCard = round.playerCards[round.currentTrick][0];
		nsp.emit(eventName, { 
			player: nextPlayer,
			previousPlayerCard: data,
			baseCard: baseCard
		});
	}else{
		trickCompleted(game, result, data);
		setTimeout(function(){
			nsp.emit(eventName, { 
				player: nextPlayer,
				previousPlayerCard: null,
				baseCard: null
			});
		}, 3000);
	}
}

function roundCompleted(game, result, data){
	console.log("SocketManager.roundCompleted(): Round completed:", game.currentRound);
	var round = game.currentRound;
	var players = game.getPlayers();
	var nextPlayer = players[round.startPlayerIndex];
	
	console.log("SocketManager.roundCompleted(): Assign Points for this round" );
	game.assignPoints();
	
	// trickCompleted(game, result, data);
	nsp.emit('round-completed', { 
			players: players,
			previousPlayerCard: data,
			previousTrickWinner: result.winner.id
		}
	);
	
	setTimeout(function(){

		console.log("SocketManager.roundCompleted(): Clear previous bids" );
		game.clearPlayersBid();
		console.log("SocketManager.roundCompleted(): Set up new round" );
		game.setupNewRound();
		
		// get the updated round
		round = game.currentRound;
		
		if(game.currentRoundIndex < game.rounds.length){
			setTimeout(function(){
				console.log("SocketManager.roundCompleted(): Shuffle & distribute cards for new round" );
				game.shuffle(53);
				game.distributeCards();

				sendIndividualNotification('game-started', game, players);
				
				console.log("SocketManager.roundCompleted(): Start bidding for new round: ", round.totalTricks );
				console.log("SocketManager.roundCompleted(): Player to bid:", players[round.startPlayerIndex].name);
				nsp.emit('start-bidding', { 
					round: round, 
					playerBids: null, 
					player: players[round.startPlayerIndex] }
				);
				
			}, 3000);
		}else{
			console.log("SocketManager.roundCompleted(): Game completed");
			console.log("SocketModule.js: Emitting 'game-completed' event to the namespace" );
			
			nsp.emit('game-completed', { players: game.getPlayers() });
		}
		
	}, 1000);	
}

function trickCompleted(game, result, data){
	var round = game.currentRound;
	var players = game.getPlayers();
	
	console.log("SocketManager.trickCompleted(): Trick completed - Winner: ", result.winner.name );
	
	nsp.emit('trick-completed', { 
		round: round,
		players: players,
		previousPlayerCard: data,
		previousTrickWinner: result.winner.id
	});
}

function getCardDetails(card){
	return card.rankShortName + ' of ' + card.suitName + ". {" + card.id + "}";
}


function sendIndividualNotification(eventName, game, players){
	var key = null;
	var cards = null;

	for(var i = 0; i < players.length; i++){
		key = players[i].id;
		socket = io.nsps[namespace].sockets[key]; // console.log(io.nsps[namespace].sockets[key]);
		cards = game.playerCardsMap[key];

		if(socket){
			socket.emit(eventName, { 
					round: game.currentRound, 
					data: players[i],
					cards: cards
				}
			);
		}
		else{
			console.log('Cannot send', eventName, 'to', players[i].name, io.nsps[namespace].sockets);
		}
	}
}

//Event exit-game
function exitGame(data, callback){
	var socket = this;
	console.log("SocketManager.exitGame(): Exiting the game: ", socket.id, socket.playerName);

	data.id = socket.id;

	var game = gameManager.getGameByRoomName(data.roomName);
	var player = game.getPlayerById(socket.id);
	var response = { oldPlayer: player, players: game.getPlayers() };
	
	socket.leave(data.roomName, function(){
		console.log("SocketManager.exitGame(): Emitting 'player-left' event to the namespace");
		nsp.emit('player-left', response);
		callback(null, response);
	});
	
	/*gameManager.removePlayer(data, function(error, response){
		if(error){
			callback(error, null);
		}else{
			socket.leave(data.roomName, function(){
				nsp.emit('player-left', response);
				callback(null, response);
			});
		}
		
	});*/
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

function sendNotification(event, data){
	nsp.emit(null, event, data);
}


function broadcastRooms(socket){
	// var rooms = io.nsps[namespace].adapter.rooms;
  	var roomKeys = Object.keys(nsp.adapter.rooms);
  	var allSockets =  Object.keys(nsp.adapter.sids);

  	if(roomKeys){
  		console.log("Total rooms: " + roomKeys.length);
	  	var rooms = [];
	  	var count = 0;
	  	roomKeys.forEach(function(key){
	  		if(allSockets.indexOf(key) === -1){
	  			count =  Object.keys(nsp.adapter.rooms[key].sockets).length;
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

function pingRoom(data, fn) {
	var socket = this;
	console.log("SocketModule.js: Ping from: " + socket.playerName);
	var players = gameManager.room.getPlayers();
	if(fn) fn({ players: players.map(function(p){ return { name: p.name, total: p.points } }), roundPoints: gameManager.room.game.pointsTable });
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

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

/*
function playCardO(data, callback) {
	var socket = this;
	console.log("SocketModule.js: Card played by:", socket.playerName, getCardDetails(data.card));
	var game = gameManager.getGameByRoomName(socket.roomName);
	var result = game.playCard(data);
	var players = game.getPlayers();

	if(result.continueCurrentRound){
		console.log("SocketModule.js: Continue Current Round: ", result.continueCurrentRound);
		
		var round = game.currentRound;
		var nextPlayer = players[round.startPlayerIndex];
		
		if(result.continueCurrentTrick){
			console.log("SocketModule.js: Continue Current Trick: ", round.currentTrick);
			console.log("SocketModule.js: Next player: ", nextPlayer.name);
			
			var baseCard = round.playerCards[round.currentTrick][0];
			nsp.emit('next-player', { 
				round: round,  
				player: nextPlayer,
				players: null,
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
					player: nextPlayer,
					players: null,
					previousPlayerCard: null,
					baseCard: null
				});
			}, 3000);
		}
	}else{
		console.log("Trick completed" );
		console.log("SocketModule.js: Winner: ", result.winner.name);
		// console.log(gameManager.room.game.currentRound);
		
		var players = game.getPlayers();
		
		nsp.emit('trick-completed', { 
			round: round,
			previousPlayerCard: data,
			players: players,
			previousTrickWinner: result.winner.id
		});
		
		console.log("SocketModule.js: Assign Points for this round" );
		game.assignPoints();
		console.log("SocketModule.js: Clear previous bids" );
		game.clearPlayersBid();
		console.log("SocketModule.js: Set up new round" );
		game.setupNewRound();
		
		round = game.currentRound;
		
		setTimeout(function(){
			nsp.emit('round-completed', { 
					players: players,
					previousPlayerCard: null,
					previousTrickWinner: result.winner.id
				}
			);
			
			if(game.currentRoundIndex < game.rounds.length){
				setTimeout(function(){
					console.log("SocketModule.js: Shuffle & distribute cards for new round" );
					game.shuffle(53);
					game.distributeCards();
	

					sendIndividualNotification('game-started', game, players);
					
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
				
				nsp.emit('game-completed', { players: game.getPlayers() });
					
				// }, 2000);
			}
			
		}, 1000);	
	}
	
}

function enterGame(data, fn){
	console.log(data.playerName + "joining the game: " + data.room);
	
	// add player name to socket instance
	var socket = this;
	socket.join();
	socket.playerName = data.playerName;
	
	var room = gameManager.createNewRoom(data);
	room.game.addPlayer(socket.id, data.playerName, function(){
		nsp.emit('room-updated', );
	});
  	
	// socket.broadcast.to(data.room).emit('count', "Connected:" + " " + count);
	if (fn) fn({msg :"Room Created:" + data.room, data: { id: socket.id, players: gameManager.room.getPlayers() } });
}


function initializeSocketsold(roomName){
	var nsp = namespaces[roomName].nsp;
	
	nsp.on('connection', function(socket){
		console.log('Someone connected');
		
		if(!current_clients[socket.id]){
			current_clients[socket.id] = {
				id: socket.id
			};
		}
		
		
		//_socket = socket;
		
		socket.on("create-room", createRoom.bind(socket) );
	    
	  	socket.on('join-room', joinRoom.bind(socket));
	  	
	  	socket.on('leave-room', leaveRoom.bind(socket));
	  	
	  	socket.on('ping-room', pingRoom.bind(socket));
	  	
	  	socket.on('get-all-players', getAllPlayers.bind(socket));
	  	
	  	//socket.on('get-all-rooms', getAllRooms.bind(socket));
	  	
	  	socket.on('start-the-game', startTheGame.bind(socket));
	  	
	  	socket.on('set-bid', setBid.bind(socket));
	  	
	  	socket.on('play-card', playCard.bind(socket));
	  	
	  	socket.on('disconnect', function(){ 
	  		console.log("User Disconnected: ", socket.playerName, socket.id); 
	  		nsp.emit('player-left', { players: gameManager.room.getPlayers(), id: socket.id, playerName: socket.playerName });
	  		
	  		if(current_clients[socket.id]) delete current_clients[socket.id];
  		});
	  	
	  	broadcastRooms(socket);
	});
	
}



function getAllRoomsOld(data) {
	broadcastRooms(this);
}

function leaveRoom(data, fn) {
	var socket = this;
	console.log("SocketModule.js: Leaving room: " + socket.id);
	socket.leave(data.room, fn);
	gameManager.room.removePlayer(socket.id, function(){
		nsp.emit('player-left', { players: gameManager.room.getPlayers(), id: socket.id, playerName: socket.playerName });
	});
}

function getSocketsCount(){
	var clientSocketList = io.nsps[namespace].adapter.rooms[data.room].sockets;
	var clientKeys = Object.keys(clientSocketList);
	var numClients = clientKeys.length;
	console.log("Total client sockets: " + numClients);
	return numClients;
}


function getRoom(roomName){
	return io.nsps[namespace].adapter.rooms[roomName];
}


function joinRoomOld(data, fn) {
	var socket = this;
	var nspRoom = getRoom(data.room);
	
	console.log(data.playerName + " trying to join the room: " + data.room);
	if(nspRoom){
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

function createRoom(data, fn){
	console.log(data.playerName + "joining the room: " + data.room);
	
	// add player name to socket instance
	var socket = this;
	socket.playerName = data.playerName;
	// add socket to the room, room will be created automatically for the first time
	socket.join(data.room);
	
	current_clients[socket.id].username = data.playerName;
	
	console.log(data.playerName + "joined the room: " + data.room);
	
	var data = {
		roomName: data.room,
		totalPlayers: +data.totalPlayers,
		socketId: socket.id,
		playerName: data.playerName
	}
	gameManager.createRoom(data, function(){
		broadcastRooms(socket);
	});
	
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
}*/
