define(['../module'], function(module){
	
	return module
		.factory('GameManager', ['$http', '$location', function($http, $location) {
			console.log('GameManager Service initialized...');
			
			var socket = null;
			var notificationHandler = null;
			var service = {
				MESSAGE_KEYS: {
					'PLAYER_JOINED': 1,
					'PLAYER_LEFT': 2,
					'ROOM_AVAILABLE': 3,
					'ROOM_CLOSED': 4,
					'ROOM_CREATED': 5
				},

				initialize: initialize,
				goToRoom: goToRoom,
				ping: ping
				//user: null,
				//getUserDetails: getUserDetails
			}
			
			return service;
			
			function initialize(callback){
				if(socket === null){
					notificationHandler = callback;
					
					socket = io('/judgement-group');
					
					console.log(socket);
					
					socket.on('player-joined', playerJoinedCallback);
					
					socket.on('room-available', roomAvailableCallback);
					
					socket.on('disconnect', disconnected);
					
				}
			}
			
			function ping(username){
				if(socket !== null){
					socket.emit('ping-room', { playerName: username });
				}
			}
			
			function goToRoom(isAdmin, username, roomName){
				if(isAdmin){
					socket.emit('create-room', { playerName: username, room: roomName }, roomCreatedCallback);
				}
				else{
					socket.emit('join-room', { playerName: username, room: roomName }, joinRoomCallback);
				}
			}
			
			function disconnected(){
				socket = null;
			}
			
			function joinRoomCallback(response){
				notificationHandler(service.MESSAGE_KEYS.PLAYER_JOINED, response);
			}
			
			function playerJoinedCallback(data){
				notificationHandler(service.MESSAGE_KEYS.PLAYER_JOINED, data);
			}
			
			function roomCreatedCallback(response){
				notificationHandler(service.MESSAGE_KEYS.ROOM_CREATED, response);
			}
			
			function roomAvailableCallback(response){
				notificationHandler(service.MESSAGE_KEYS.ROOM_AVAILABLE, response);
			}
		}]);
	
});
