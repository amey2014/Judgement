define(['../module'], function(module){
	
	return module
	.controller('JudgementHomeCtrl', ['$scope', '$location', 'my.i18n', 'UserManager', 
      function($scope, $location, i18n, UserManager) {
		console.log('JudgementHomeCtrl initialized...');
		$scope.i18n = i18n;
		$scope.home = {};

		$scope.home.goToRoom = goToRoom;
		$scope.home.ping = ping;
		$scope.home.isAdmin = false;
		$scope.home.username = null;
		$scope.home.rooms = [];
		var socket = null;
		
		initialize();
		
		function initialize(){
			if(!UserManager.user){
				UserManager.getUserDetails(userDetailsCallback);
			}
			else{
				userDetailsCallback(UserManager.user);
			}
		}
		
		function userDetailsCallback(data){
			$scope.home.isAdmin = data.isAdmin;
			$scope.home.username = data.username;
			
			if(socket === null){
				socket = io('/judgement-group');
				
				socket.on('player-joined', playerJoinedCallback);
				
				socket.on('room-available', roomAvailableCallback);
				
				socket.on('disconnect', disconnected);
			}
		}
		
		function checkIn(){
			if(!$scope.home.email || !$scope.home.email.trim() === '')
				return;
			if(!$scope.home.password || !$scope.home.password.trim() === '')
				return;
			$location.url('/board')
		}
		
		function ping(){
			if(socket !== null){
				socket.emit('ping-room', { playerName: $scope.home.username });
			}
		}
		
		function goToRoom(){
			
			if($scope.home.isAdmin){
				socket.emit('create-room', { playerName: $scope.home.username, room: $scope.home.roomName }, roomCreatedCallback);
			}
			else{
				socket.emit('join-room', { playerName: $scope.home.username, room:  $scope.home.roomName }, joinRoomCallback);
			}
		}
		
		function disconnected(){
			socket = null;
		}
		function joinRoomCallback(response){
			console.log(response);
		}
		
		function playerJoinedCallback(data){
		    console.log("Player Joined:", data);
		}
		
		function roomCreatedCallback(response){
			console.log(response);
		}
		
		function roomAvailableCallback(response){
			console.log(response);
			$scope.home.rooms = response.rooms;
			$scope.$apply();
		}
		
		$scope.books = [];
		
		var TOTAL_CARDS = 52;
		var SUIT = ['Spade', 'Diamond', 'Club', 'Heart'];
		var RANK = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
		
		function Game(){
			this.players = [];
			this.rounds = [];
			this.currentRoundIndex = 12; // starts with 0
			this.currentRound = null;
			this.deck = new Deck();
		}
		
		Game.prototype.addPlayers = function(){
			var player = null;
			for(var i = 1; i <= 4; i++){
				this.players.push(new Player('Player'+ i, 0));
			}
		}
		
		Game.prototype.initializeRounds = function(){
			if(this.players === null)
				throw 'No players added yet';
			if(this.players.length < 4)
				throw 'Minimum 4 players required.'
			
			var playersCount = this.players.length;
			var totalRounds = TOTAL_CARDS / playersCount;
			// console.log('total players:', playersCount, ', Total Rounds:', totalRounds);
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
			//this.players.forEach(p => p.getCards() );
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
		
		function Player(name){
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

		var newGame = new Game();
		newGame.addPlayers();
		newGame.initializeRounds();
		// console.log(newGame);
		newGame.setupCurrentRound();
		newGame.shuffle(53);
		newGame.distributeCards();
		$scope.game = newGame;
	}]);
	
});
