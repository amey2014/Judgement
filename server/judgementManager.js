var Game = require('./game.js').Game;

exports.getGameByRoomName = function(roomName){
	return RoomCollection.getGameByRoomName(roomName);
}

exports.getRoomByRoomName = function(roomName){
	return RoomCollection.getGameByRoomName(roomName);
}

exports.createNewRoom = function(data){
	if(RoomCollection.isRoomAvailable(data.roomName)){
		return RoomCollection.addRoom(data.ownerId, data.roomName, +data.totalPlayers, data.stakes);
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
		var player = game.addPlayer(playerId, data.playerName, isOwner); 
		game.ownerId = isOwner ? playerId : game.ownerId;
		response = { playerUpdated: false, playerId: playerId, newPlayer: player, players: game.getPlayers() };
	}

	return response;
}

exports.startGame = function(roomName){
	console.log("JudgementManager.startTheGame(): Begin");
	var game = this.getGameByRoomName(roomName);
	game.initialize();
	console.log("JudgementManager.startTheGame(): is invoked.");
	console.log("JudgementManager.startTheGame(): Initializing all rounds.");
	game.initializeRounds();
	console.log("JudgementManager.startTheGame(): Set up new round.");
	game.setupNewRound();
	console.log("JudgementManager.startTheGame(): Shuffle and distribute cards.");
	game.shuffle(53);
	game.distributeCards();
	
	return game;
}

exports.resetGame = function(roomName){
	this.startGame(roomName);
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

/* Room constructor function */
function Room(ownerId, name, totalPlayers, stakes){
	this.name = name;
	this.game = new Game(totalPlayers, ownerId, stakes);
}
/*
Room.prototype = {
	getGame: getGame,
	addPlayer: addPlayer,
	removePlayer: removePlayer,
	getPlayers: getPlayers,
	getPlayersCount: getPlayersCount,
	setBid: setBid
}
*/
var RoomCollection = {
	// Mapped object of rooms
	_rooms: {},
	//add room to the collection
	addRoom: function(ownerId, roomName, totalPlayers, stakes){
		var room = new Room(ownerId, roomName, totalPlayers, stakes);
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
/*
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
*/




