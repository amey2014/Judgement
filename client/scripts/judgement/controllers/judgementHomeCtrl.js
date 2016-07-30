define(['../module'], function(module){
	
	return module
	.controller('JudgementHomeCtrl', ['$scope', '$location', 'my.i18n', 'UserManager', 'GameManager',
      function($scope, $location, i18n, UserManager, GameManager) {
		console.log('JudgementHomeCtrl initialized...');
		$scope.i18n = i18n;
		$scope.home = {};

		$scope.home.isAdmin = false;
		$scope.home.username = null;
		$scope.home.rooms = [];
		var socket = null;
		
		initialize();
		$scope.home.GameManager = GameManager;
		
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
			
			GameManager.initialize(notificationHandler);
			/*if(socket === null){
				socket = io('/judgement-group');
				
				console.log(socket);
				
				socket.on('player-joined', playerJoinedCallback);
				
				socket.on('room-available', roomAvailableCallback);
				
				socket.on('disconnect', disconnected);
			}*/
		}
		
		function notificationHandler(messageKey, data){
			switch(messageKey){
				case GameManager.MESSAGE_KEYS.ROOM_AVAILABLE:
					roomAvailable(data);
					break;
				case GameManager.MESSAGE_KEYS.ROOM_CREATED:
					roomCreated(data);
					break;
				case GameManager.MESSAGE_KEYS.PLAYER_JOINED:
					playerJoined(data);
					break;
				default:
					break;
			}
		}
		
		/*function ping(){
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
		
		function joinRoom(response){
			console.log(response);
		}*/
		
		function playerJoined(data){
		    console.log("Player Joined:", data);
		}
	
		function roomCreated(response){
			console.log(response);
			$location.url('/board');
		}
		
		function roomAvailable(response){
			console.log(response);
			$scope.home.rooms = response.rooms;
			$scope.$apply();
		}
		/*
		var newGame = new Game();
		newGame.addPlayers();
		newGame.initializeRounds();
		// console.log(newGame);
		newGame.setupCurrentRound();
		newGame.shuffle(53);
		newGame.distributeCards();
		$scope.game = newGame;*/
	}]);
	
});
