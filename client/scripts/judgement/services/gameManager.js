define(['../module'], function(module){
	
	return module
		.factory('GameManager', ['$http', '$location', function($http, $location) {
			console.log('GameManager Service initialized...');
			
			var socket = null;
			var notificationHandler = null;
			
			var service = {
				players: [],
				roomName: '',
				MESSAGE_KEYS: {
					'PLAYER_JOINED': 1,
					'PLAYER_LEFT': 2,
					'ROOM_AVAILABLE': 3,
					'ROOM_CLOSED': 4,
					'ROOM_CREATED': 5,
					'PLAYER_LEFT': 6,
					'GAME_CAN_START': 7
				},

				initialize: initialize,
				goToRoom: goToRoom,
				leaveRoom: leaveRoom,
				ping: ping,
				getAllPlayers: getAllPlayers,
				getAllRooms: getAllRooms
				//user: null,
				//getUserDetails: getUserDetails
			}
			
			return service;
			
			function initialize(callback){
				notificationHandler = callback;
				if(socket === null){
					
					socket = io('/judgement-group');
					
					console.log(socket);
					
					socket.on('player-joined', playerJoinedCallback);
					
					socket.on('room-available', roomAvailableCallback);
					
					socket.on('player-left', playerLeftCallback);
					
					socket.on('game-can-start', startGame);
					
					socket.on('disconnect', disconnected);
					
				}
				
			}

			function startGame(data){
				notificationHandler(service.MESSAGE_KEYS.GAME_CAN_START, data);
			}
			
			function getAllRooms(username){
				if(socket !== null){
					socket.emit('get-all-rooms', { playerName: username });
				}
			}
			
			function leaveRoom(username, callback){
				if(socket !== null){
					socket.emit('leave-room', { playerName: username, room: service.roomName }, callback);
					// socket = null;
				}
			}
			
			
			function ping(username){
				if(socket !== null){
					socket.emit('ping-room', { playerName: username });
				}
			}
			
			function getAllPlayers(username, getAllPlayersCallback){
				if(socket !== null){
					socket.emit('get-all-players', { playerName: username }, getAllPlayersCallback);
				}
			}
			
			
			function goToRoom(isAdmin, username, roomName){
				if(isAdmin){
					socket.emit('create-room', { playerName: username, room: roomName, totalPlayers:  4}, roomCreatedCallback);
				}
				else{
					socket.emit('join-room', { playerName: username, room: roomName }, joinRoomCallback);
					
				}
				service.roomName = roomName;
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
			
			function playerLeftCallback(data){
				notificationHandler(service.MESSAGE_KEYS.PLAYER_LEFT, data);
			}
			
			function roomCreatedCallback(response){
				notificationHandler(service.MESSAGE_KEYS.ROOM_CREATED, response);
			}
			
			function roomAvailableCallback(response){
				notificationHandler(service.MESSAGE_KEYS.ROOM_AVAILABLE, response);
			}
			
		}]);
	
});
