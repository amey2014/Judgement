define(['../module'], function(module){
	
	return module
	.controller('BoardCtrl', ['$scope', '$location', 'my.i18n', 'UserManager', 'GameManager', function($scope, $location, i18n, UserManager, GameManager) {
		console.log('Board controller initialized...');
		$scope.i18n = i18n;
		$scope.board = {};
		$scope.board.GameManager = GameManager;
		$scope.board.leaveRoom = leaveRoom;
		$scope.board.players = [];
		
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
