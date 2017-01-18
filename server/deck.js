var Card = require('./card.js').Card;

exports.Deck = Deck;

function Deck(){
	this.cards = [];
	var count = 0;
	for(var i = 0; i < 4; i++){
		for(var j = 0; j < 13; j++, count++){
			this.cards.push(new Card(count, i, j));
		}
	}
}

