define(['../module'], function(module){
	
	return module
	.controller('RoomCtrl', ['$scope', '$location', 'my.i18n', 'UserManager', 'GameManager',
      function($scope, $location, i18n, UserManager, GameManager) {
		console.log('RoomCtrl initialized...');

		$scope.i18n = i18n;
		$scope.home = {};

		$scope.home.isAdmin = false;
		$scope.home.username = null;
		$scope.home.rooms = [];
		$scope.home.selectedRoom = null;
		$scope.home.roomName = '';
		$scope.home.joinRoom = joinRoom;
		$scope.home.createRoom = createRoom;
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
			if(window.room && window.room.name !== ''){
				$scope.home.selectedRoom = window.room.name;
				$scope.home.totalPlayers = window.room.total;
				joinRoom(data.isAdmin, data.username, window.room.name);
				window.room = null;
			}else{
				GameManager.getAllRooms(getAllRoomsCallback);
			}	
		}
		
		function getAllRoomsCallback(error, response){
			if(error){
				console.log(error);
				return;
			}
			
			$scope.home.rooms = response.rooms;
			if(response.rooms.length > 0){
				$scope.home.selectedRoom = $scope.home.rooms[0];
				$scope.home.totalPlayers = $scope.home.rooms[0].totalPlayersRequired;
			}
			
			$scope.$apply();
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
		function createRoom(isAdmin, username, roomName){
			
			var totalPlayers = +$scope.home.totalPlayers;
			
			if(Number.NaN === totalPlayers || totalPlayers < 4){
				console.log("Please select total players");
				return;
			}
			if(!roomName || roomName === ""){
				console.log("Please enter room name");
				return;
			}
			
			GameManager.createRoom(isAdmin, username, roomName, totalPlayers, joinRoomCallback);
		}
		
		function joinRoom(isAdmin, username, roomName){
			
			var totalPlayers = +$scope.home.totalPlayers;
			
			if(Number.NaN === totalPlayers || totalPlayers < 4){
				console.log("Please select total players");
				return;
			}
			if(!roomName || roomName === ""){
				console.log("Please enter room name");
				return;
			}
			
			GameManager.joinRoom(isAdmin, username, roomName, totalPlayers, joinRoomCallback);
		}
		
		function joinRoomCallback(error, response){
			if(error){
				console.log(error);
				GameManager.getAllRooms(getAllRoomsCallback);
				return;
			}
			
			// GameManager.players = response.players;
			enterRoom();
			
		}
		
		function playerJoined(response){
		    console.log("Player Joined:", response);
		    GameManager.players = response.data.players;
		    gotoRoom();
		}
	
		function roomCreated(response){
			console.log(response);
			
			$scope.home.rooms = response.rooms;
			$scope.home.selectedRoom = $scope.home.rooms[0];
			// $scope.home.roomName = $scope.home.rooms[0].name;
			$scope.home.totalPlayers = $scope.home.rooms[0].totalPlayersRequired;
			// 	GameManager.goToRoom($scope.home.isAdmin, $scope.home.username, $scope.home.roomName);
			$scope.$apply();
		}
		
		function enterRoom(){
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
