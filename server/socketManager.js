var gameManager = require('./judgementManager.js');
exports.initialize = initializeSockets;
exports.removePlayer = removePlayer;

var namespace = '/games-for-entertainment';
var nsp = io.of(namespace);
//var nsp = io;
var namespaces = {}; 

function initializeSockets(){
	console.log('SocketManager: initializeSocket(): Begin');
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
		GET_SCORE: 'get-score',
		EXIT_GAME: 'exit-game',
		DISCONNECT: 'disconnect'
	}
	// wait for client connections
	nsp.on('connection', function(socket){
		console.log('SocketManager: initializeSocket(): New connection:', socket.id);
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
	  	socket.on(events.GET_SCORE, getScore.bind(socket));
	  	
		socket.on(events.DISCONNECT, function(){ 
			console.log("SocketManager: initializeSocket(): Socket disconnected:", socket.playerName, socket.id); 
			
			if(socket.roomName){
				var game = gameManager.getGameByRoomName(socket.roomName);
		  		var player = game.getPlayerById(socket.id);
		  		nsp.to(socket.roomName).emit('player-disconnected', { id: socket.id, oldPlayerName: socket.playerName, oldPlayer: player, players: game.getPlayers() });
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

		//data.adminId = socket.id;
		data.isOwner = true;
		data.ownerId = socket.id;
		
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
		var game = gameManager.getGameByRoomName(data.roomName);
		if(game){
			updateSocketDetails(socket, data);
			callback(null, {});
		}
	}catch(error){
		console.log(error);
		callback(error, null);
	}
	
}

function updateSocketDetails(socket, data){
	console.log("SocketManager.updateSocketDetails(): Adding playerName and roomName to the socket");
	// add socket to the room
	socket.join(data.roomName);
	// add playerName and roomName to the socket
	socket.playerName = data.playerName;
	socket.roomName = data.roomName;
	updateOwnerDetailsIfRequired(socket, data.isOwner);
}

//Event 'enter-game'
// callback(error, response);
function enterGame(data, callback){
	console.log("SocketManager.enterGame(): Joinign the game:", data.playerName);
	try{
		// add player name to socket instance
		var socket = this;
		var game = gameManager.getGameByRoomName(data.roomName);
		
		var result = gameManager.enterRoom(data, socket.id, socket.isOwner);
		
		if(result.playerUpdated){
			updateOwnerDetailsIfRequired(socket, result.newPlayer.isOwner);
			notifyIfBiddingIsInProgress(socket, game, result.newPlayer);
			notifyTurnToThePlayer(socket, game, result.newPlayer, result.oldPlayerId);
		}
			
		notifyOwnerToStartTheGameIfWeCan(game, data.roomName);
		
		console.log("SocketManager.enterGame(): Emitting 'player-entered' event to the namespace");
		nsp.to(data.roomName).emit('player-entered', null, result);
		
		console.log("SocketManager.enterGame(): Invoking callback and passing cards and round details");
		result.cards = (game.playerCardsMap[result.newPlayer.id]) ? game.playerCardsMap[result.newPlayer.id] : null;
		result.round = game.currentRound;
		result.rounds = game.rounds;
		callback(null, result);
	}catch(error){
		console.log(error);
		callback(error, null);
	}
}

function updateOwnerDetailsIfRequired(socket, isOwner){
	console.log("SocketManager.updateOwnerDetailsIfRequired(): Begin");
	//socket.isAdmin = isOwner;
	socket.isOwner = isOwner;
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

function notifyOwnerToStartTheGameIfWeCan(game, roomName){
	console.log("SocketManager.notifyOwnerToStartTheGameIfWeCan(): Begin");
	if(game.canStart()){
		var adminSocket = nsp.to(roomName).sockets[game.ownerId];

		if(adminSocket){
			console.log("SocketManager.notifyOwnerToStartTheGameIfWeCan(): Emitting 'game-can-start' event to the Owner socket");
			adminSocket.emit('game-can-start');
		}else{
			console.log("SocketManager.notifyOwnerToStartTheGameIfWeCan(): Cannot emit 'game-can-start' event. Owner socket not found. Param 'game.OwnerId':", game.ownerId);
		}
	}
}

function notifyIfBiddingIsInProgress(socket, game, player){
	console.log("SocketManager.notifyIfBiddingIsInProgress(): Begin");
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
	console.log("SocketManager.notifyTurnToThePlayer(): Begin");
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
		console.log("SocketManager.notifyTurnToThePlayer(): Next player is " + players[currentRound.startPlayerIndex].name);

		console.log("SocketManager.notifyTurnToThePlayer(): Emitting 'next-player' event to: ", socket.playerName);
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
	console.log("SocketManager.startTheGame(): Begin");
	// var game = gameManager.getGameByRoomName(this.roomName);

	var game = gameManager.startGame(this.roomName);
	
	var players = game.getPlayers();
	
	var round = game.currentRound;
	
	sendIndividualNotification('game-started', game, players, this.roomName);
	
	console.log("SocketManager.startTheGame(): Start Bidding for Round:", round.totalTricks);
	console.log("SocketManager.startTheGame(): Player to bid:", players[round.startPlayerIndex].name);
	
	console.log("SocketManager.notifyTurnToThePlayer(): Emitting 'start-bidding' event to the namespace.");
	nsp.to(this.roomName).emit('start-bidding', { 
		round: round, 
		playerBids: null, 
		player: players[round.startPlayerIndex] }
	);
	
}


// Event 'get-rooms'
function getRooms(callback){
	console.log("SocketManager.getRooms(): Begin");
	var rooms = parseRooms();
	if (callback) {
		console.log("SocketManager.getRooms(): Total rooms: ", rooms.length);
		callback(null, { rooms: rooms });
	}
}

function parseRooms(){
	console.log("SocketManager.parseRooms(): Begin");
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
	console.log("SocketManager.getAllPlayers(): Begin");
	var game = gameManager.getGameByRoomName(data.roomName);

	if(callback){
		callback({ players: game.getPlayers() });
	}
}

// Event 'get-all-details'
function getAllDetails(data, callback) {
	console.log("SocketManager.getAllDetails(): Begin");

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
		game.currentRound.startPlayerIndex = (game.currentRound.totalTricks - 1) % game.totalPlayersRequired; // set this to 0 as bidding process increments it.
		game.currentRound.inProgress = true;
		
	}else{
		console.log("SocketManager.setBid(): Continue bidding. Next player to bid:", players[nextPlayerIndex].name);
	}
	
	console.log("SocketManager.setBid(): Emitting 'start-bidding' event to the namespace");
	nsp.to(socket.roomName).emit('start-bidding', { 
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
		continueCurrentRound(game, result, data, socket.roomName);
	}else{
		roundCompleted(game, result, data, socket.roomName);
	}
}

function continueCurrentRound(game, result, data, roomName){
	console.log("SocketManager.continueCurrentRound(): Continue Current Round:", result.continueCurrentRound);
	
	var round = game.currentRound;
	var players = game.getPlayers();
	var nextPlayer = players[round.startPlayerIndex];
	var eventName = 'next-player';
	if(result.continueCurrentTrick){
		console.log("SocketManager.continueCurrentRound(): Continue Current Trick:", round.currentTrick);
		console.log("SocketManager.continueCurrentRound(): Next player: ", nextPlayer.name);
		
		var baseCard = round.playerCards[round.currentTrick][0];
		
		console.log("SocketManager.continueCurrentRound(): Emitting '", eventName, "' event to the namespace" );
		nsp.to(roomName).emit(eventName, { 
			player: nextPlayer,
			previousPlayerCard: data,
			baseCard: baseCard
		});
	}else{
		trickCompleted(game, result, data, roomName);
		setTimeout(function(){
			console.log("SocketManager.continueCurrentRound(): Emitting '", eventName, "' event to the namespace" );
			nsp.to(roomName).emit(eventName, { 
				player: nextPlayer,
				previousPlayerCard: null,
				baseCard: null
			});
		}, 3000);
	}
}

function roundCompleted(game, result, data, roomName){
	console.log("SocketManager.roundCompleted(): Round completed:", game.currentRound);
	var round = game.currentRound;
	var players = game.getPlayers();
	var nextPlayer = players[round.startPlayerIndex];
	
	console.log("SocketManager.roundCompleted(): Assign Points for this round" );
	game.assignPoints();
	
	console.log("SocketManager.roundCompleted(): Emitting 'round-completed' event to the namespace");
	nsp.to(roomName).emit('round-completed', { 
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

				sendIndividualNotification('game-started', game, players, roomName);
				
				console.log("SocketManager.roundCompleted(): Start bidding for new round: ", round.totalTricks );
				console.log("SocketManager.roundCompleted(): Player to bid:", players[round.startPlayerIndex].name);
				console.log("SocketManager.roundCompleted(): Emitting 'start-bidding' event to the namespace");
				nsp.to(roomName).emit('start-bidding', { 
					round: round, 
					playerBids: null, 
					player: players[round.startPlayerIndex] }
				);
				
			}, 3000);
		}else{
			console.log("SocketManager.roundCompleted(): Game completed");
			console.log("SocketManager.roundCompleted(): Emitting 'game-completed' event to the namespace" );
			nsp.to(roomName).emit('game-completed', { players: game.getPlayers() });
		}
		
	}, 1000);	
}

function trickCompleted(game, result, data, roomName){
	console.log("SocketManager.trickCompleted(): Begin" );
	var round = game.currentRound;
	var players = game.getPlayers();
	
	console.log("SocketManager.trickCompleted(): Trick completed - Winner: ", result.winner.name );
	
	console.log("SocketManager.trickCompleted(): Emitting 'trick-completed' event to the namespace" );
	nsp.to(roomName).emit('trick-completed', { 
		round: round,
		players: players,
		previousPlayerCard: data,
		previousTrickWinner: result.winner.id
	});
}

function getCardDetails(card){
	console.log("SocketManager.getCardDetails(): Begin" );
	return card.rankShortName + ' of ' + card.suitName + ". {" + card.id + "}";
}


function sendIndividualNotification(eventName, game, players, roomName){
	console.log("SocketManager.sendIndividualNotification(): Begin" );
	var key = null;
	var cards = null;

	for(var i = 0; i < players.length; i++){
		key = players[i].id;
		socket = nsp.to(roomName).sockets[key];
		cards = game.playerCardsMap[key];

		if(socket){
			console.log("SocketManager.sendIndividualNotification(): Emitting '", eventName, "' event to the socket", socket.playerName);
			socket.emit(eventName, { 
					round: game.currentRound, 
					rounds: game.rounds,
					data: players[i],
					cards: cards
				}
			);
		}
		else{
			console.log('SocketManager.sendIndividualNotification(): Cannot send', eventName, 'to', players[i].name, io.nsps[namespace].sockets);
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
		nsp.to(data.roomName).emit('player-left', response);
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

function removePlayer(name, roomName){
	console.log("SocketManager.removePlayer(): Begin");
	var socket = null;
	var socketId = null;
	
	var sockets = nsp.to(roomName).sockets;
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
		console.log("SocketManager.removePlayer(): Disconnecting player: ", socket.playerName);
		// var playerSocket = io.nsps[namespace].sockets[socketId];
		socket.disconnect();
		
		gameManager.room.removePlayer(socketId, function(){
			console.log("SocketManager.exitGame(): Emitting 'player-left' event to the namespace");
			nsp.emit('player-left', { players: gameManager.room.getPlayers(), id: socketId });
		});
		
		console.log("SocketManager.removePlayer(): Player disconnected: ", + socket.playerName);
	}else{
		console.log("SocketManager.removePlayer(): Cannot disconnect. Socket not found");
	}
	
	
}

/*
function broadcastRooms(socket){
	// var rooms = io.nsps[namespace].adapter.rooms;
  	var roomKeys = Object.keys(nsp.adapter.rooms);
  	var allSockets =  Object.keys(nsp.adapter.sids);

  	if(roomKeys){
  		console.log("SocketManager.broadcastRooms(): Total rooms: " + roomKeys.length);
	  	var rooms = [];
	  	var count = 0;
	  	roomKeys.forEach(function(key){
	  		if(allSockets.indexOf(key) === -1){
	  			count =  Object.keys(nsp.adapter.rooms[key].sockets).length;
	  			rooms.push({ name: key, playerCount: count, totalPlayeArsRequired: gameManager.room.game.totalPlayersRequired });
	  		}
	  	})
	  	if(rooms && rooms.length > 0){
	  		console.log("SocketManager.broadcastRooms(): Broadcasting rooms: " + rooms.length);
	  		nsp.emit('room-available', { rooms: rooms, players: gameManager.room.getPlayers(), totalPlayersRequired: gameManager.room.game.totalPlayersRequired });
	  	}
  	}
  	else{
  		console.log("SocketManager.broadcastRooms(): No rooms available.");
  	}
}*/

function getScore(data, fn) {
	var socket = this;
	var game = gameManager.getGameByRoomName(socket.roomName);
	console.log("SocketManager.getScore(): Score requested by: " + socket.playerName);
	var players = game.getPlayers();
	if(fn) fn({ players: players.map(function(p){ return { name: p.name, total: p.points } }), totalRounds: game.rounds.length, roundPoints: game.pointsTable });
}

function getPlayerIndex(id){
	var index = -1;
    for(var i = 0; i < $scope.board.players.length; i++){
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

