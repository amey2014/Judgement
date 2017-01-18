var Player = require('./player.js').Player;
var Deck = require('./deck.js').Deck;
var Round = require('./round.js').Round;

exports.Game = Game;

var TOTAL_CARDS = 52;

function Game(totalPlayers, ownerId){
	// this.adminId = ownerId;
	this.ownerId = ownerId;
	this.totalPlayersRequired = totalPlayers;
	this.players = [];
	this.playerCardsMap = {};
	this.initialize();
}

Game.prototype.initialize = function(){
	this.playerCardsMap = {};
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
