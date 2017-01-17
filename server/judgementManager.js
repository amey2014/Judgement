exports.getGameByRoomName = function(roomName){
	return RoomCollection.getGameByRoomName(roomName);
}

exports.getRoomByRoomName = function(roomName){
	return RoomCollection.getGameByRoomName(roomName);
}


exports.createNewRoom = function(data){
	if(RoomCollection.isRoomAvailable(data.roomName)){
		return RoomCollection.addRoom(data.ownerId, data.roomName, +data.totalPlayers);
	}else{
		throw { message: 'Room already exists: ' + data.roomName };
	}
}

exports.enterRoom = function(data, playerId, isOwner){
	console.log("SocketManager.enterRoom(): ", data.roomName);
	var game = this.getGameByRoomName(data.roomName);

	var result = updatePlayerIfExists.call(this, playerId, data);
	
	var response = {};
	if(result.playerUpdated) {
		console.log("SocketManager.enterRoom(): Player already exists, Updating...:", data.playerName);
		response = { playerUpdated: true, playerId: playerId, newPlayer: result.newPlayer, players: game.getPlayers(), oldPlayerId: result.oldPlayerId };
	}else{
		console.log("SocketManager.enterRoom(): Player not found, Creating...:", data.playerName);
		game.ownerId = isOwner ? playerId : game.ownerId;
		var player = game.addPlayer(playerId, data.playerName, isOwner); 
		response = { playerUpdated: false, playerId: playerId, newPlayer: player, players: game.getPlayers() };
	}

	return response;
}

function updatePlayerIfExists(playerId, data){
	console.log("SocketManager.updatePlayerIfExists(): Check if player already exists in the list: ", data.playerName);
	var game = this.getGameByRoomName(data.roomName);
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
		if(oldId !== playerId ){
			// assign existing cards to this player
			if(game.playerCardsMap[oldId]){
				game.playerCardsMap[playerId] = game.playerCardsMap[oldId];
				delete game.playerCardsMap[oldId];
			}
			
			// change the ownerId if this player is owner
			if(existingPlayerEntries[0].isOwner){
				//game.adminId = playerId;
				game.ownerId = playerId;
			}

			existingPlayerEntries[0].id = playerId;
		}

		response.newPlayer = existingPlayerEntries[0];
	}

	response.hasNullEntry = hasNullEntry;
	response.playerUpdated = playerUpdated;
	response.oldPlayerId = oldId;
	return response;
}

exports.removePlayer = function(data, callback){
	console.log("Get game:", data.roomName);
	var game = this.getGameByRoomName(data.roomName);
	try{
		console.log("Remove Player:", data.playerName);
		var oldPlayer = game.removePlayer(data.id, data.playerName);
		if(callback){
			callback(null, { oldPlayer: oldPlayer, players: game.getPlayers() });
		}
	}catch(error){
		console.log("Error:", error);
		callback(error, null);
	}
}

/* Room constructor function */
function Room(ownerId, name, totalPlayers){
	this.name = name;
	this.game = new Game(totalPlayers, ownerId);
}

Room.prototype = {
	getGame: getGame,
	addPlayer: addPlayer,
	removePlayer: removePlayer,
	getPlayers: getPlayers,
	getPlayersCount: getPlayersCount,
	setBid: setBid
}

var RoomCollection = {
	// Mapped object of rooms
	_rooms: {},
	//add room to the collection
	addRoom: function(ownerId, roomName, totalPlayers){
		var room = new Room(ownerId, roomName, totalPlayers);
		this._rooms[roomName] = room;
		return room;
	},
	// get room by room name
	getRoomByRoomName: function(roomName){
		return this._rooms[roomName];
	},
	// get room by room name
	getGameByRoomName: function(roomName){
		var room = this._rooms[roomName];
		if(!room){
			throw { message: 'invalid room name: ' + roomName };
		}
			
		return this._rooms[roomName].game;
	},
	// Returns false, if room object is present for a give room name else returns true. 
	isRoomAvailable: function(roomName){
		return typeof this._rooms[roomName] === 'undefined';
	}
};

exports.room = {
	name: null,
	game: null,
	createGame: createGame,
	getGame: getGame,
	addPlayer: addPlayer,
	removePlayer: removePlayer,
	getPlayers: getPlayers,
	getPlayersCount: getPlayersCount,
	setBid: setBid
	
} 

function createGame(roomName, totalPlayers){
	exports.room.name = roomName;
	exports.room.game = new Game(totalPlayers);
}

function addPlayer(playerId, playerName, callback){
	exports.room.game.addPlayer(playerId, playerName);
	callback();
}

function removePlayer(playerId, callback){
	console.log("Room.removePlayer", playerId);
	if(exports.room.game) exports.room.game.removePlayer(playerId);
	if(callback) callback();
}

function setBid(data, callback){
	console.log("setBid for: ", data.id, data.bid);
	if(exports.room.game) exports.room.game.setBid(data);
	if(callback) callback();
}

function getGame(){
	return exports.room.game;
}

function getPlayers(){
	return exports.room.game ? exports.room.game.players : 0;
}

function getPlayersCount(){
	return exports.room.game ? exports.room.game.players.length : 0;
}



var TOTAL_CARDS = 52;
var SUIT = ['Spade', 'Diamond', 'Club', 'Heart'];
var RANK_NAME = [ '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
var RANK_INDEX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function Game(totalPlayers, ownerId){
	// this.adminId = ownerId;
	this.ownerId = ownerId;
	this.totalPlayersRequired = totalPlayers;
	this.players = [];
	this.playerCardsMap = {};
	this.initialize();
}

Game.prototype.getPlayers = function(){
	return this.players;
}

Game.prototype.setBid = function(data){
	var index = this.getPlayerIndex(data.id);

	if(index > -1){
		console.log('Index: ' + index);
		this.players[index].tricksBidded = data.bid;
		this.currentRound.startPlayerIndex = (this.currentRound.startPlayerIndex + 1) % this.totalPlayersRequired;
		this.currentRound.bids++;
	}
	else{
		console.log('Game.prototype.setBid: Index is ' + index);
	}
}

Game.prototype.addPlayers = function(){
	var player = null;
	for(var i = 1; i <= this.totalPlayersRequired; i++){
		this.addPlayer('Player'+ i);
	}
}

Game.prototype.addPlayer = function(id, name, isOwner){
	var index = this.getEmptySeat();
	if(index >= 0){
		var player = new Player(id, name, isOwner);
		this.players[index] = player;
		return player;
	}
	else{
		throw { message: 'Game.prototype.addPlayer: Cannot add more players.'};
	}
}

Game.prototype.getEmptySeat = function(){
	var index = this.players.indexOf(null);
	if(index < 0 && this.players.length < this.totalPlayersRequired){
		index = this.players.length;
	}
	return index;
}

Game.prototype.canStart = function(){
	return this.getEmptySeat() < 0;
}

Game.prototype.getPlayerById = function(id){
	var player = this.players.filter(function(p){
		return (p && p.id === id);
	});
	return player.length > 0 ? player[0] : null;
}

Game.prototype.getPlayerIndex = function(id){
	var index = -1;
	this.players.some(function(p, i){
		if(p && p.id === id){
			index = i;
			return true;
		}
		else{
			return false;
		}
			
	});
	return index;
}
Game.prototype.removePlayer = function(id, name){
	console.log("Game.prototype.removePlayer", id, name);
	var index = this.getPlayerIndex(id);
	if(index > -1){
		var player = this.players.splice(index, 1, null)[0];
		return player;
	}
	else{
		console.log('Game.prototype.removePlayer: Cannot remove player, Index is ' + index);
		throw { message: 'Game.prototype.removePlayer: Cannot remove player, Index is ' + index };
	}
	
}

Game.prototype.initialize = function(){
	this.players.forEach(function(player){
		player.points = 0;
		// player.cards = [];
		player.tricksBidded = 0;
		player.tricksWon = 0;
	});

	this.rounds = [];
	this.currentRoundIndex = 0; // starts with 0
	this.currentRound = null;
	this.deck = new Deck();
	this.pointsTable = [];
};

Game.prototype.initializeRounds = function(){
	if(this.players === null)
		throw 'No players added yet';
	if(this.players.length < this.totalPlayersRequired)
		throw 'Minimum 4 players required.'
	
	var playersCount = this.players.length;
	var div = Math.floor(TOTAL_CARDS / playersCount);
	var totalRounds = div - (div % playersCount);
	//totalRounds = 2;
	console.log('total players:', playersCount, ', Total Rounds:', totalRounds);
	setupRounds.call(this, totalRounds);
	
};

function setupRounds(totalRounds){
	console.log('Total players:', this.totalPlayersRequired);
	for(var i = 1; i <= totalRounds; i++){
		this.rounds.push(new Round(i, this.totalPlayersRequired));
	}
}

Game.prototype.setupNewRound = function(){
	if(this.currentRound !== null){
		this.currentRoundIndex++;
	}
	console.log(this.currentRoundIndex);
	this.currentRound = this.rounds[this.currentRoundIndex];
	this.playerCardsMap = {}; 
	console.log(this.currentRound);
}

Game.prototype.shuffle= function(n)
{
	var i, j, k;

 	for ( k = 0; k < n; k++ )
 	{
 		i = Math.floor(TOTAL_CARDS * Math.random()) ;  // Pick 2 random cards
 		j = Math.floor(TOTAL_CARDS * Math.random()) ;  // in the deck

     /* ---------------------------------
	swap these randomly picked cards
	--------------------------------- */
 		var tmp = this.deck.cards[i];
 		this.deck.cards[i] = this.deck.cards[j];
 		this.deck.cards[j] = tmp;;
 	}

 	//this.currentCard = 0;   // Reset current card to deal
}

Game.prototype.distributeCards = function(){
	var startPlayerIndex = this.currentRound.startPlayerIndex;
	var totalCards = this.currentRound.totalTricks * this.players.length;
	for(var i = 0; i < totalCards; i++, startPlayerIndex++){
		//console.log(startPlayerIndex, "-----------------", this.players.length);
		//console.log(startPlayerIndex % this.players.length);
		
		// this.players[startPlayerIndex % this.players.length].cards.push(this.deck.cards[i]);
		
		if(this.playerCardsMap[this.players[startPlayerIndex % this.players.length].id]){
			this.playerCardsMap[this.players[startPlayerIndex % this.players.length].id].push(this.deck.cards[i]);
		}
		else{
			this.playerCardsMap[this.players[startPlayerIndex % this.players.length].id] = [ this.deck.cards[i] ];
		}
	}

	// sort cards
	/*for(var i = 0; i < this.players.length; i++){
		this.players[i].cards.sort(function(a, b){
			if(a.id < b.id){
				return -1;
			}
			else if (a.id > b.id){
				return 1
			}
			else{
				return 0;
			}
		});
	}*/
	
	// sort map
	for(var i = 0; i < this.players.length; i++){
		this.playerCardsMap[this.players[i].id].sort(function(a, b){
			if(a.id < b.id){
				return -1;
			}
			else if (a.id > b.id){
				return 1
			}
			else{
				return 0;
			}
		});
	}
	
	/*this.players.forEach(function(p){
		p.getCards();
	});*/
	
}

Game.prototype.clearPlayersBid = function(){
	this.players.forEach(function(player){
		player.tricksBidded = 0;
		player.tricksWon = 0;
	})
}

Game.prototype.assignPoints = function(){
	var round = this.currentRound.totalTricks;
	var trump = this.currentRound.trumpSuit;

	var currentRoundPoints = [];
	var points = 0;
	this.players.forEach(function(player){
		if( player.tricksWon === player.tricksBidded ) {
			points = (player.tricksBidded > 0 ? (player.tricksBidded * 10) : 10);
			player.points += points;
		}
		else{
			points = (player.tricksBidded > 0 ? (player.tricksBidded * -10) : -10);
			player.points += points;
		}
		
		currentRoundPoints.push({playerId: player.id, playerName: player.name, points: points});
	});
	
	this.pointsTable[round] = { trump: trump, points: currentRoundPoints};
}

Game.prototype.startNewRound = function(){
	this.assignPoints();
	this.clearPlayersBid();
	this.setupNewRound(); 
} 

Game.prototype.playCard = function(data){
	var continueCurrentRound = true;
	var continueCurrentTrick = true;
	var winningPlayerId = null;
	var index = this.getPlayerIndex(data.id);
	var player = this.players[index];
	
	var cardIndex = -1;
	var playerCards = this.playerCardsMap[data.id];
	
	for(var i = 0; i < playerCards.length; i++ ){
		cardIndex = i;
		if( data.card.suitIndex === playerCards[i].suitIndex && data.card.rankIndex === playerCards[i].rankIndex ){
			break;
		}
	}
	
	console.log(player.name + ' player ' + playerCards[cardIndex].suitName);
	playerCards.splice(cardIndex, 1);

	var count = this.currentRound.playCard(data);
	var playersCount = this.players.length;
	if(count === playersCount){ // next trick
		console.log('Next trick');
		
		winningPlayerId = this.currentRound.whoWonThisTrick(data.currentTrick);
		var nextPlayerIndex = this.getPlayerIndex(winningPlayerId);
		var winner = this.players[nextPlayerIndex];
		winner.tricksWon++;
			
		var totalTricksPlayed = this.currentRound.playerCards.length;
		
		console.log("Round: " + this.currentRound.totalTricks + ", currentTrick: " + data.currentTrick + "Player won: " + winningPlayerId);
		console.log("totalTricksPlayed: " + totalTricksPlayed);
		
		if(totalTricksPlayed === this.currentRound.totalTricks){ // next round
			console.log('Next Round');
			continueCurrentRound = false;
			continueCurrentTrick = false;
			
		}else{  // continue current round
			console.log('Continue Round');
			continueCurrentRound = true;
			continueCurrentTrick = false;
			this.currentRound.currentTrick++;
			this.currentRound.startPlayerIndex = nextPlayerIndex; // (this.currentRound.totalTricks - 1) % 4;
		}
	}else{ // continue current trick
		console.log('Continue current trick');
		this.currentRound.startPlayerIndex = (this.currentRound.startPlayerIndex + 1) % this.totalPlayersRequired;
	}
	//return continueCurrentRound;
	return { 
		continueCurrentRound: continueCurrentRound, 
		continueCurrentTrick: continueCurrentTrick,
		winner: winner
	};
}
	
function Round(totalTricks, totalPlayers){
	this.id = totalTricks;
	this.totalTricks = totalTricks;
	this.trumpSuit = SUIT[(totalTricks - 1) % 4];
	console.log(totalTricks, totalPlayers);
	console.log((totalTricks - 1) % totalPlayers);
	this.startPlayerIndex = (totalTricks - 1) % + totalPlayers;
	this.inProgress = false;
	this.bids = 0;
	this.currentTrick = 0;
	this.playerCards = [];
	// this.players = [];
}

Round.prototype.playCard = function(data){
	if(!this.playerCards[this.currentTrick]){
		this.playerCards[this.currentTrick] = [];
	}
	this.playerCards[this.currentTrick].push(data);
	return this.playerCards[this.currentTrick].length;
}

Round.prototype.whoWonThisTrick = function(data){
	var playerCards = this.playerCards[this.currentTrick];
	
	var baseCardSuit = playerCards[0].card.suitName;
	var playerId = playerCards[0].id;
	console.log("BaseCardSuit: " + baseCardSuit);
	
	/*for(var i = 0; i < playerCards.length; i++){
		console.log("playerId: " + playerCards[i].id);
		console.log(playerCards[i].card.rankShortName + ' of '+ playerCards[i].card.suitName, "suitIndex: " + playerCards[i].card.suitIndex, "rankIndex: " + playerCards[i].card.rankIndex);
	}*/
	
	while(playerCards.length > 1){
		var card1 = playerCards[0].card;
		var card2 = playerCards[1].card;
		var removeCard1 = false;
		var removeCard2 = false;
		if(card1.suitName !== baseCardSuit && card1.suitName !== this.trumpSuit){ 
			// card1 is small
			removeCard1 = true;
		}
		if(card2.suitName !== baseCardSuit && card2.suitName !== this.trumpSuit){ 
			// card1 is small
			removeCard2 = true;
		}
		
		console.log("removing card: ");
		if(removeCard1){
			console.log(playerCards[0]);
			playerCards.splice(0, 1);
		}
		else if(removeCard2){
			console.log(playerCards[1]);
			playerCards.splice(1, 1);
		}
		else{
			// check which is bigger
			if(card1.suitName === card2.suitName){
				if(card1.rankIndex > card2.rankIndex){
					console.log(playerCards[1]);
					playerCards.splice(1, 1);
				} 
				else{
					console.log(playerCards[0]);
					playerCards.splice(0, 1);
				}
			}else{
				if(card1.suitName !== this.trumpSuit){
					console.log(playerCards[0]);
					playerCards.splice(0, 1);
				}else{
					console.log(playerCards[1]);
					playerCards.splice(1, 1);
				}
			}
			
		}
	}
	
	return playerCards[0].id;
}

function Player(id, name, isOwner){
	this.id = id;
	this.name = name;
	this.isOwner = isOwner;
	this.pic = '';
	this.points = 0;
	this.tricksBidded = 0;
	this.tricksWon = 0;
}
	
/*Player.prototype.getCards = function(){
	return this.cards.map(function(c){
		return c.toString();
	});
}*/

function Card(id, suit, rank){
	this.id = id;
	this.suitIndex = suit;
	this.rankIndex = RANK_INDEX[rank];
	this.suitName = SUIT[suit];
	this.rankShortName = rank > 0 && rank < 9 ? RANK_NAME[rank] : RANK_NAME[rank].charAt(0);
	this.rankLongName = RANK_NAME[rank];
}

Card.prototype.toString = function(){
	return this.rankName + ' of ' + this.suitName + ". {" + this.id + "}";
}

function Deck(){
	this.cards = [];
	var count = 0;
	for(var i = 0; i < 4; i++){
		for(var j = 0; j < 13; j++, count++){
			this.cards.push(new Card(count, i, j));
		}
	}
}

function PlayerCards(){
	this.round = null;
	this.cardsMap = {};
}

