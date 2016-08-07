define(['../module'], function(module){
	
	return module
	.controller('BoardCtrl', ['$scope', '$location', '$timeout', 'my.i18n', 'UserManager', 'GameManager', function($scope, $location, $timeout, i18n, UserManager, GameManager) {
		console.log('Board controller initialized...');
		$scope.i18n = i18n;
		$scope.board = {};
		
		$scope.board.GameManager = GameManager;
		$scope.board.leaveRoom = leaveRoom;
		$scope.board.players = [];
		$scope.board.round = null;
		$scope.board.currentPlayer = null;
		$scope.board.message = null;
		$scope.board.cardSymbol = {
				Spade: '&spades;',
				Diamond: '&diams;',
				Club: '&clubs;',
				Heart: '&hearts;'
			}
		
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
			$scope.board.isAdmin = data.isAdmin;
			$scope.board.username = data.username;
			GameManager.initialize(notificationHandler);
			GameManager.getAllPlayers(data.username, getAllPlayersCallback);
		}
		
		function notificationHandler(messageKey, data){
			switch(messageKey){
				case GameManager.MESSAGE_KEYS.ROOM_AVAILABLE:
					// roomAvailable(data);
					break;
				case GameManager.MESSAGE_KEYS.ROOM_CREATED:
					// roomCreated(data);
					break;
				case GameManager.MESSAGE_KEYS.PLAYER_JOINED:
					playerJoined(data);
					break;
				case GameManager.MESSAGE_KEYS.PLAYER_LEFT:
					playerLeft(data);
					break;
				case GameManager.MESSAGE_KEYS.GAME_CAN_START:
					startGame(data);
					break;
				case GameManager.MESSAGE_KEYS.GAME_STARTED:
					gameStarted(data);
					break;
				case GameManager.MESSAGE_KEYS.START_BIDDING:
					startBidding(data);
					break;
				default:
					break;
			}
		}
		
		function startGame(data){
		    console.log("ADMIN START GAME", data);
		    $scope.$apply(function(){
		    	GameManager.canStartGame = true;
		    })
		    
		}
		
		function updateBids(bids){
			console.log(bids);
			var players = $scope.board.players;
			$scope.$apply(function(){
				for(var i = 0; i < bids.length; i++){
					for(var j = 0; j < players.length; j++){ // var player in ){
						if(players[j].id === bids[i].id){
							console.log("Set "+  bids[i].tricksBidded + " bids for " + players[j].name );
							players[j].tricksBidded = bids[i].tricksBidded;
							break;
						}
					}
					
				}
			});
		}
		
		function startBidding(data){
			if(data.playerBids !== null){
				updateBids(data.playerBids);
			}
			$scope.board.message = null;
			
			if(data.player === null){
				$scope.board.currentPlayer = null;
			}else{
				$scope.board.currentPlayer = data.player.id;
				
				var currentPlayer = $scope.board.players.filter(function(p){
			    	return p.id === data.player.id && data.player.name === p.name && data.player.name === $scope.board.username;
			    });
				
				if(!data.startPlaying){
					if(currentPlayer.length > 0){
						// start bidding for this player
						$scope.board.message = 'Please set your bid...';
						$timeout(function(){
							GameManager.setBid(currentPlayer[0].id, 1, function(data){
								console.log("bidset", data);
							});
						}, 5000);
					}
					else{
						$scope.board.message = data.player.name + ' bidding...';
						console.log("Bidding...");
					}
				}
				else{
					if(currentPlayer.length > 0){
						// start bidding for this player
						$scope.board.message = 'Your turn...';
						/*$timeout(function(){
							GameManager.setBid(currentPlayer[0].id, 1, function(data){
								console.log("bidset", data);
							});
						}, 5000);*/
					}
					else{
						$scope.board.message = data.player.name + '\'s turn...';
						console.log("Playing...");
					}
				}
				
				
				
			}
			
			$scope.$apply();
		}
		
		function gameStarted(response){
		    console.log("START THE GAME", response);
		    var currentPlayer = $scope.board.players.filter(function(p){
		    	return p.id === response.data.id && response.data.name === p.name && response.data.name === $scope.board.username;
		    });
		    
		    $scope.$apply(function(){
		    	$scope.board.round = response.round;
		    	currentPlayer[0].cards = response.data.cards;
		    });
		    
		}
		
		function playerJoined(data){
		    console.log("Player Joined:", data);
		    getAllPlayersCallback(data);
		}

		function playerLeft(data){
		    console.log("Player Left:", data);
		    getAllPlayersCallback(data);
		}
		
		function leaveRoom(){
		    GameManager.leaveRoom($scope.board.username, function(){
		    	console.log("LEFT ROOM BY ME");
		    	$scope.$apply(function(){
		    		$location.url("/board_enter");
		    	});
		    });
		}

		function getAllPlayersCallback(response){
			console.log("GetAllPlayers callback", response);
			var players = response.players;
			var loggedInPlayers = players.filter(function(player){
	    		return player.name === $scope.board.username;
	    	});
			
			var index = players.indexOf(loggedInPlayers[0]);
			if(index > 0){
				var slicedArray = players.splice(0, index);
				players = players.concat(slicedArray);
			}
			
		    $scope.$apply(function(){
		    	//for(var i = 0; i < players.length; i++){
		    		$scope.board.players = players;
		    		//if(!$scope.board.players[i]){
		    			//$scope.board.players.push(players[i]);
		    		// }
		    	//}
		    	console.log($scope.board.players);
		    });
		    
		}
		/*var newGame = new Game();
		newGame.addPlayers();
		newGame.initializeRounds();
		console.log(newGame);
		newGame.setupCurrentRound();
		newGame.shuffle(53);
		newGame.distributeCards();
		$scope.game = newGame;*/
	}]);
	
});
