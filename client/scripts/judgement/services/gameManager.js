define(['../module'], function(module){
	
	return module
		.factory('GameManager', ['$http', '$location', 'UserManager', function($http, $location, UserManager) {
			console.log('GameManager Service initialized...');
			
			var socket = null;
			var notificationHandler = null;
			
			var service = {
				players: [],
				roomName: '',
				rounds: null,
				currentRoundCards: [],
				MESSAGE_KEYS: {
					'PLAYER_ENTERED': 1,
					'PLAYER_LEFT': 2,
					'ROOM_AVAILABLE': 3,
					'ROOM_CLOSED': 4,
					'ROOM_CREATED': 5,
					'PLAYER_LEFT': 6,
					'GAME_CAN_START': 7,
					'GAME_STARTED': 8,
					'START_BIDDING': 9,
					'NEXT_PLAYER': 10,
					'ROUND_COMPLETED': 11,
					'TRICK_COMPLETED': 12,
					'DISCONNECTED': 13,
					'GAME_COMPLETED': 14,
					'PLAYER_DISCONNECTED': 15
				},

				initialize: initializeClientSocket,
				joinRoom: joinRoom,
				createRoom: createRoom,
				enterGame: enterGame,
				exitGame: exitGame,
				ping: ping,
				getAllPlayers: getAllPlayers,
				getAllRooms: getAllRooms,
				setBid: setBid,
				startTheGame: startTheGame,
				playCard: playCard,
				showPoints: showPoints
				//user: null,
				//getUserDetails: getUserDetails
			}
			
			return service;
			
			function initializeClientSocket(callback){
				notificationHandler = callback;
				if(socket === null){
					
					socket = io('/games-for-entertainment');
					// socket = io();
					console.log(socket);
					
					socket.on('player-entered', playerEnteredHandler);
					
					socket.on('room-created', roomCreatedHandler);
					
					socket.on('player-left', playerLeftHandler);
					
					socket.on('player-disconnected', playerDisconnectedHandler);
					
					socket.on('game-can-start', startGame);
					
					socket.on('start-bidding', startBidding);
					
					socket.on('next-player', nextPlayer);
					
					socket.on('game-started', gameStarted);
					
					socket.on('round-completed', roundCompleted);
					
					socket.on('trick-completed', trickCompleted);
					
					socket.on('disconnect', disconnected);
					
					socket.on('game-completed', gameCompleted);					
				}
				
			}

			function showPoints(callback){
				
				if(socket !== null){
					socket.emit('get-score', null, callback );
				}
			}
			
			function startGame(data){
				notificationHandler(service.MESSAGE_KEYS.GAME_CAN_START, data);
			}
			
			function startTheGame(data){
				if(socket !== null){
					socket.emit('start-the-game');
				}
			}
			
			function gameStarted(data){
				notificationHandler(service.MESSAGE_KEYS.GAME_STARTED, data);
			}
			
			function startBidding(response){
				notificationHandler(service.MESSAGE_KEYS.START_BIDDING, response);
			}
			
			function setBid(id, bid, callback){
				if(socket !== null){
					socket.emit('set-bid', { id: id, bid: bid }, callback);
				}
			}

			function playCard(currentTrick, id, card, callback){
				if(socket !== null){
					socket.emit('play-card', { id: id, currentTrick: currentTrick, card: card }, callback);
				}
			}
			
			function nextPlayer(response){
				//if(error){
				//	console.log(error);
				//}else{
					arrangePlayers(UserManager.user.username, response);
					notificationHandler(service.MESSAGE_KEYS.NEXT_PLAYER, response);
				//}
				
			}

			function trickCompleted(response){
				arrangePlayers(UserManager.user.username, response);
				notificationHandler(service.MESSAGE_KEYS.TRICK_COMPLETED, response);
			}
			
			function roundCompleted(response){
				arrangePlayers(UserManager.user.username, response);
				notificationHandler(service.MESSAGE_KEYS.ROUND_COMPLETED, response);
			}

			function gameCompleted(response){
				arrangePlayers(UserManager.user.username, response);
				notificationHandler(service.MESSAGE_KEYS.GAME_COMPLETED, response);
			}
			
			
			
			function getAllRooms(callback){
				if(socket !== null){
					socket.emit('get-rooms', callback);
				}
			}
			
			function exitGame(username, callback){
				if(socket !== null){
					socket.emit('exit-game', { playerName: username, roomName: service.roomName }, callback);
				}
			}
			
			
			function ping(username){
				if(socket !== null){
					socket.emit('ping-room', { playerName: username });
				}
			}
			
			function getAllPlayers(username, callback){
				if(socket !== null){
					socket.emit('get-all-details', { roomName: service.roomName, playerName: username }, function(response){
						arrangePlayers(username, response);
						callback(response);
					});
				}
			}
			
			function playerEnteredHandler(error, response){
				if(error){
					console.log(error);
				}else{
					arrangePlayers(UserManager.user.username, response);
					notificationHandler(service.MESSAGE_KEYS.PLAYER_ENTERED, response);
				}
				
			}
			
			// arrange players in an order where current player is at index 0
			function arrangePlayers(username, response){
				if(response.players){
					var loggedInPlayers = response.players.filter(function(player){
			    		return player && player.name === username;
			    	});
					
					var index = response.players.indexOf(loggedInPlayers[0]);
					
					if(index > 0){
						var slicedArray = response.players.splice(0, index);
						response.players = response.players.concat(slicedArray);
					}
				}
			}
			
			function joinRoom(isAdmin, username, roomName, totalPlayers, callback){
				
				socket.emit('join-room', { playerName: username, roomName: roomName, isAdmin: isAdmin }, callback);
				service.roomName = roomName;
			}
			
			function createRoom(isAdmin, username, roomName, totalPlayers, callback){
				//if(isAdmin){
					createGame(username, roomName, totalPlayers, callback);
				//}
				service.roomName = roomName;
			}
			
			function enterGame( username, callback){
				//if(isAdmin){
				//	createGame(username, roomName, totalPlayers, callback);
				//}
				//else{
					socket.emit('enter-game', { playerName: username, roomName: service.roomName }, function(error, response){
						arrangePlayers(username, response);
						callback(response);
					});
					
				//}
				// service.roomName = roomName;
			}
			
			function createGame(playerName, roomName, totalPlayers, callback){
				if(socket !== null){
					socket.emit('create-game', { playerName: playerName, roomName: roomName, totalPlayers: totalPlayers, isAdmin: true }, callback);
				}
			}
			
			function disconnected(response){
				console.log("Your connection is disconnected.");
				socket = null;
				notificationHandler(service.MESSAGE_KEYS.DISCONNECTED, response);
			}
			
			function joinRoomCallback(response){
				notificationHandler(service.MESSAGE_KEYS.PLAYER_JOINED, response);
			}
			
			function playerDisconnectedHandler(response){
				notificationHandler(service.MESSAGE_KEYS.PLAYER_DISCONNECTED, response);
			}
			
			
			function playerLeftHandler(response){
				arrangePlayers(UserManager.user.username, response);
				notificationHandler(service.MESSAGE_KEYS.PLAYER_LEFT, response);
			}
			
			function roomCreatedHandler(error, response){
				if(error){
					console.log(error);
				}else{
					// arrangePlayers(UserManager.user.username, response);
					notificationHandler(service.MESSAGE_KEYS.ROOM_CREATED, response);
				}
				
			}
			
			function roomAvailableCallback(response){
				notificationHandler(service.MESSAGE_KEYS.ROOM_AVAILABLE, response);
			}
			
		}]);
	
});
