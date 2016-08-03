exports.room = {
	name: null,
	game: null,
	createGame: createGame,
	getGame: getGame,
	addPlayer: addPlayer,
	removePlayer: removePlayer,
	getPlayers: getPlayers
	
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
	if(exports.room.game) exports.room.game.removePlayer(playerId);
	if(callback) callback();
}

function getGame(){
	return exports.room.game;
}

function getPlayers(){
	return exports.room.game ? exports.room.game.players : 0;
}

var TOTAL_CARDS = 52;
var SUIT = ['Spade', 'Diamond', 'Club', 'Heart'];
var RANK = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];

function Game(totalPlayers){
	this.totalPlayersRequired = totalPlayers;
	this.players = [];
	this.rounds = [];
	this.currentRoundIndex = 12; // starts with 0
	this.currentRound = null;
	this.deck = new Deck();
}

Game.prototype.addPlayers = function(){
	var player = null;
	for(var i = 1; i <= 4; i++){
		this.addPlayer('Player'+ i);
	}
}

Game.prototype.addPlayer = function(id, name){
	if(this.players.length < this.totalPlayersRequired){
		this.players.push(new Player(id, name, 0));
	}
	else{
		console.log("Cannot add more players.");
	}
}

Game.prototype.removePlayer = function(id, name){
	var player = this.players.filter(function(p){
		return p.id === id;
	});
	var index = this.players.indexOf(player);
	this.players.splice(index, 1);
}

Game.prototype.initializeRounds = function(){
	if(this.players === null)
		throw 'No players added yet';
	if(this.players.length < 4)
		throw 'Minimum 4 players required.'
	
	var playersCount = this.players.length;
	var totalRounds = TOTAL_CARDS / playersCount;
	console.log('total players:', playersCount, ', Total Rounds:', totalRounds);
	setupRounds.call(this, totalRounds);
	
};

function setupRounds(totalRounds){
	for(var i = 1; i <= totalRounds; i++){
		this.rounds.push(new Round(i));
	}
}

Game.prototype.setupCurrentRound = function(){
	if(this.currentRound !== null){
		this.currentRoundIndex++;
	}
	this.currentRound = this.rounds[this.currentRoundIndex];
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
		this.players[startPlayerIndex % this.players.length].cards.push(this.deck.cards[i]);
	}
	/*for(var i = 0; i < this.players.length; i++){
		this.players[i].cards.sort(function(p, q){ 
			if(p.suitIndex > q.suitIndex) 
				return 1;
			
		} );
		}
	}*/
	this.players.forEach(function(p){
		p.getCards();
	});
	
}
	
function Round(totalTricks){
	this.id = totalTricks;
	this.totalTricks = totalTricks;
	this.trumpSuit = SUIT[(totalTricks - 1) % 4];
	this.startPlayerIndex = (totalTricks - 1) % 4;
	// deck.shuffle();
	// this.players = [];
}

Round.prototype.start = function(){
	
}

function Player(id, name){
	this.id = id;
	this.name = name;
	this.pic = '';
	this.points = 0;
	this.cards = [];
	this.tricksBidded = 0;
	this.tricksWon = 0;
}
	
Player.prototype.getCards = function(){
	
	return this.cards.map(function(c){
		return c.toString();
	});
}

function Card(suit, rank){
	this.suitIndex = suit;
	this.rankIndex = rank;
	this.suitName = SUIT[suit];
	this.rankShortName = rank > 0 && rank < 10 ? RANK[rank] : RANK[rank].charAt(0);
	this.rankLongName = RANK[rank];
}

Card.prototype.toString = function(){
	return this.rankName + ' of ' + this.suitName;
}

function Deck(){
	this.cards = [];
	
	for(var i = 0; i < 4; i++){
		for(var j = 0; j < 13; j++){
			this.cards.push(new Card(i, j));
		}
	}
}

