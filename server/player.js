exports.Player = Player;

function Player(id, name, isOwner){
	this.id = id;
	this.name = name;
	this.isOwner = isOwner;
	this.pic = '';
	this.points = 0;
	this.tricksBidded = 0;
	this.tricksWon = 0;
}