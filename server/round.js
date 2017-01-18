exports.Round = Round;

var SUIT = ['Spade', 'Diamond', 'Club', 'Heart'];
var RANK_NAME = [ '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
var RANK_INDEX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function Round(totalTricks, totalPlayers){
	this.id = totalTricks;
	this.totalTricks = totalTricks;
	this.trumpSuit = SUIT[(totalTricks - 1) % 4];
	//console.log(totalTricks, totalPlayers);
	//console.log((totalTricks - 1) % totalPlayers);
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
		
		//console.log("removing card: ");
		if(removeCard1){
			//console.log(playerCards[0]);
			playerCards.splice(0, 1);
		}
		else if(removeCard2){
			//console.log(playerCards[1]);
			playerCards.splice(1, 1);
		}
		else{
			// check which is bigger
			if(card1.suitName === card2.suitName){
				if(card1.rankIndex > card2.rankIndex){
					//console.log(playerCards[1]);
					playerCards.splice(1, 1);
				} 
				else{
					//console.log(playerCards[0]);
					playerCards.splice(0, 1);
				}
			}else{
				if(card1.suitName !== this.trumpSuit){
					//console.log(playerCards[0]);
					playerCards.splice(0, 1);
				}else{
					//console.log(playerCards[1]);
					playerCards.splice(1, 1);
				}
			}
			
		}
	}
	
	return playerCards[0].id;
}
