exports.Card = Card;

var SUIT = ['Spade', 'Diamond', 'Club', 'Heart'];
var RANK_NAME = [ '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
var RANK_INDEX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
