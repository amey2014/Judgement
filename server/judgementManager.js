exports.room = {
	name: null,
	game: null,
	createGame: createGame,
	getGame: getGame,
	addPlayer: addPlayer,
	removePlayer: removePlayer,
	getPlayers: getPlayers,
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

var TOTAL_CARDS = 52;
var SUIT = ['Spade', 'Diamond', 'Club', 'Heart'];
var RANK_NAME = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
var RANK_INDEX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0];

function Game(totalPlayers){
	this.totalPlayersRequired = totalPlayers;
	this.players = [];
	this.rounds = [];
	this.currentRoundIndex = 0; // starts with 0
	this.currentRound = null;
	this.deck = new Deck();
	this.pointsTable = [];
}

Game.prototype.setBid = function(data){
	var index = getPlayerIndex(this.players, data.id);

	if(index > -1){
		console.log('Index: ' + index);
		this.players[index].tricksBidded = data.bid;
		this.currentRound.startPlayerIndex = (this.currentRound.startPlayerIndex + 1) % 4;
		this.currentRound.bids++;
	}
	else{
		console.log('Game.prototype.setBid: Index is ' + index);
	}
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
		console.log("Game.prototype.addPlayer: Cannot add more players.");
	}
}

function getPlayerIndex(players, id){
	var index = -1;
	players.some(function(p, i){
		if(p.id === id){
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
	var index = getPlayerIndex(this.players, id);
	/*this.players.some(function(p, i){
		if(p.id === id){
			index = i;
			return true;
		}
		else{
			return false;
		}
			
	});*/
	if(index > -1){
		console.log(this.players);
		console.log('Index: ' + index);
		this.players.splice(index, 1);
	}
	else{
		console.log('Game.prototype.removePlayer: Cannot remove player, Index is ' + index);
	}
	
}

Game.prototype.initializeRounds = function(){
	if(this.players === null)
		throw 'No players added yet';
	if(this.players.length < 4)
		throw 'Minimum 4 players required.'
	
	var playersCount = this.players.length;
	var div = Math.floor(TOTAL_CARDS / playersCount)
	var totalRounds = div - (div % playersCount);
	console.log('total players:', playersCount, ', Total Rounds:', totalRounds);
	setupRounds.call(this, totalRounds);
	
};

function setupRounds(totalRounds){
	for(var i = 1; i <= totalRounds; i++){
		this.rounds.push(new Round(i));
	}
}

Game.prototype.setupNewRound = function(){
	if(this.currentRound !== null){
		this.currentRoundIndex++;
	}
	console.log(this.currentRoundIndex);
	this.currentRound = this.rounds[this.currentRoundIndex];
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
		this.players[startPlayerIndex % this.players.length].cards.push(this.deck.cards[i]);
		
		this.players[startPlayerIndex % this.players.length].cards.sort(function(a, b){
			if(a.id < b.id){
				return 1;
			}
			else if (a.id > b.id){
				return -1
			}
			else{
				return 0;
			}
		})
	}
	
	
	
	this.players.forEach(function(p){
		p.getCards();
	});
	
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
	
	var points = {
		round: round,
		players: this.players.map(function(p){
			return {
				playerId: p.id,
				name: p.name,
				points: p.points
			}
		})
	}
	
	this.pointsTable.push(points);
	
	this.players.forEach(function(player){
		if( player.tricksWon === player.tricksBidded ) 
			player.points += (player.tricksBidded > 0 ? (player.tricksBidded * 10) : 10);
		else
			player.points += (player.tricksBidded > 0 ? (player.tricksBidded * -10) : -10);
	});
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
	var index = getPlayerIndex(this.players, data.id);
	var player = this.players[index];
	
	var cardIndex = player.cards.indexOf(data.card);
	for(var i = 0; i < player.cards.length; i++ ){
		cardIndex = i;
		if( data.card.suitIndex === player.cards[i].suitIndex && data.card.rankIndex === player.cards[i].rankIndex ){
			break;
		}
	}
	
	console.log(player.name + ' player ' + player.cards[cardIndex].suitName);
	player.cards.splice(cardIndex, 1);

	var count = this.currentRound.playCard(data);
	var playersCount = this.players.length;
	if(count === playersCount){ // next trick
		console.log('Next trick');
		
		winningPlayerId = this.currentRound.whoWonThisTrick(data.currentTrick);
		var nextPlayerIndex = getPlayerIndex(this.players, winningPlayerId);
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
		this.currentRound.startPlayerIndex = (this.currentRound.startPlayerIndex + 1) % 4;
	}
	//return continueCurrentRound;
	return { 
		continueCurrentRound: continueCurrentRound, 
		continueCurrentTrick: continueCurrentTrick,
		winner: winner
	};
}
	
function Round(totalTricks){
	this.id = totalTricks;
	this.totalTricks = totalTricks;
	this.trumpSuit = SUIT[(totalTricks - 1) % 4];
	this.startPlayerIndex = (totalTricks - 1) % 4;
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
	this.id = suit + RANK_INDEX[rank]
	this.suitIndex = suit;
	this.rankIndex = rank;
	this.suitName = SUIT[suit];
	this.rankShortName = rank > 0 && rank < 9 ? RANK_NAME[rank] : RANK_NAME[rank].charAt(0);
	this.rankLongName = RANK_NAME[rank];
}

Card.prototype.toString = function(){
	return this.rankName + ' of ' + this.suitName + ". {" + this.id + "}";
}

function Deck(){
	this.cards = [];
	
	for(var i = 0; i < 4; i++){
		for(var j = 0; j < 13; j++){
			this.cards.push(new Card(i, j));
		}
	}
}

