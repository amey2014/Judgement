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
		$scope.home.selectedRoom = null;
		$scope.home.roomName = '';
		$scope.home.joinRoom = joinRoom;
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
			
			GameManager.getAllRooms($scope.home.username);
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
		*/
		function joinRoom(isAdmin, username, roomName){
			
			var totalPlayers = +$scope.home.totalPlayers;
			
			if(Number.isNaN(totalPlayers) || totalPlayers < 4){
				console.log("Please select total players");
				return;
			}
			if(!roomName || roomName === ""){
				console.log("Please enter room name");
				return;
			}
			
			GameManager.goToRoom(isAdmin, username, roomName, totalPlayers);
			
			
		}
		
		function playerJoined(response){
		    console.log("Player Joined:", response);
		    GameManager.players = response.data.players;
		    gotoRoom();
		}
	
		function roomCreated(response){
			console.log(response);
			
			GameManager.players = response.data.players;
			
			gotoRoom();
		}
		
		function gotoRoom(){
			$scope.$apply(function(){
				if($scope.home.totalPlayers == "5")
					$location.url('/board_5');
				else
					$location.url('/board_4');
			});
		}
		
		function roomAvailable(response){
			console.log('Rooms available: ', response);
			$scope.home.rooms = response.rooms;
			$scope.home.selectedRoom = $scope.home.rooms[0];
			// $scope.home.roomName = $scope.home.rooms[0].name;
			$scope.home.totalPlayers = response.totalPlayersRequired;
			// 	GameManager.goToRoom($scope.home.isAdmin, $scope.home.username, $scope.home.roomName);
			$scope.$apply();
		}
		
	}]);
	
});
