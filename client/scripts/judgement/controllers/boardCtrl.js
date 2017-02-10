define(['../module'], function(module){
	
	return module
	.controller('BoardCtrl', ['$scope', '$location', '$timeout', '$http', 'my.i18n', 'UserManager', 'GameManager', function($scope, $location, $timeout, $http, i18n, UserManager, GameManager) {
		console.log('Board controller initialized...');
		$scope.i18n = i18n;
		$scope.board = {};
		
		$scope.board.GameManager = GameManager;
		$scope.board.leaveRoom = leaveRoom;
		$scope.board.setMyBid = setMyBid;
		$scope.board.players = [];
		$scope.board.currentPlayerCards = [];
		$scope.board.round = null;
		$scope.board.rounds = GameManager.rounds;
		$scope.board.currentPlayer = null;
		$scope.board.message = null;
		$scope.board.cardSelected = cardSelected;
		$scope.board.playerCards = [{}, {}, {}, {}];
		$scope.board.selectBid = selectBid;
		$scope.board.showPoints = showPoints;
		$scope.board.hidePoints =  hidePoints;
		$scope.board.invite = invite;
		$scope.board.showPointsTable = false;
		$scope.board.startTheGame = startTheGame;
		$scope.board.enableBidContainerDrag = false;
		$scope.board.cardSymbol = {
				Spade: '&spades;',
				Diamond: '&diams;',
				Club: '&clubs;',
				Heart: '&hearts;'
			}
		$scope.board.winners = [];
		$scope.board.showInviteUrl = false;
		
		initialize();
		
		function startTheGame(){
			$scope.board.GameManager.startTheGame();
		}
		
		function initialize(){
			if(!UserManager.user){
				UserManager.getUserDetails(userDetailsCallback);
			}
			else{
				userDetailsCallback(UserManager.user);
			}
			angular.element('body').mouseup(function(event){
				console.log(event);
				angular.element('.bidContainerOverlay:visible .bidContainer.enable-drag').css('top', event.clientY);
			});
			angular.element('.bidContainerOverlay .bidContainer').mouseup(function(event){
				event.preventDefault();
				event.stopPropagation();
			})
		}
		
		function showPoints(){
			GameManager.showPoints(function(data){
				console.log("Showing points...", data);
				$scope.board.pointsTable = {
					players: data.players,
					roundPoints: data.roundPoints
				}
				$scope.board.showPointsTable = true;
				$scope.$apply();
			});
		}
		
		function hidePoints(){
			$scope.board.showPointsTable = false;
			
		}
		
		function userDetailsCallback(data){
			if($scope.board.GameManager.roomName){
				//$scope.board.isAdmin = data.isAdmin;
				$scope.board.username = data.username;
				GameManager.initialize(notificationHandler);
				GameManager.enterGame(data.username, updatePlayers);
				// GameManager.getAllPlayers(data.username, updatePlayers);
			}else{
				$location.url("/board_enter");
			}
		}
		
		function notificationHandler(messageKey, data){
			switch(messageKey){
				case GameManager.MESSAGE_KEYS.ROOM_AVAILABLE:
					// roomAvailable(data);
					break;
				case GameManager.MESSAGE_KEYS.ROOM_CREATED:
					//roomCreated(data);
					break;
				case GameManager.MESSAGE_KEYS.PLAYER_ENTERED:
					playerEntered(data);
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
				case GameManager.MESSAGE_KEYS.NEXT_PLAYER:
					nextPlayer(data);
					break;
				case GameManager.MESSAGE_KEYS.ROUND_COMPLETED:
					roundCompleted(data);
					break;
				case GameManager.MESSAGE_KEYS.TRICK_COMPLETED:
					trickCompleted(data);
					break;
				case GameManager.MESSAGE_KEYS.DISCONNECTED:
					disconnected(data);
					break;
				case GameManager.MESSAGE_KEYS.GAME_COMPLETED:
					gameCompleted(data);
					break;
				case GameManager.MESSAGE_KEYS.PLAYER_DISCONNECTED:
					playerDisconnectedHandler(data);
					break;
				case GameManager.MESSAGE_KEYS.PING_ME:
					pingTheServer();
					break;
				default:
					break;
			}
		}
		
		function gameCompleted(response){
			var players = [];
			response.players.forEach(function(p){ 
				// add the first player in an array and return
				if(players.length === 0){
					players.push(p);
					return;
				}
				
				// if subsequent player has lesser points then return
				if(p.points < players[0].points){
					return;
				}

				// if subsequent player has more points then clear all the previous players added
				if(p.points > players[0].points){
					players = [];
				}
				
				// and add this player
				players.push(p);
				
			});
			
			$scope.board.winners = players.map(function(p){ return p.name });
			$scope.board.message = "Winners: " + $scope.board.winners.join();
		}
		
		function disconnected(data){
			console.log("Disconnected", data);

		    $scope.$apply(function(){
				$scope.board.disconnected = true;
		    	$scope.board.message = "You are disconnected! Please refresh";
		    })
		}
		
		function selectBid(bid){
			if(bid <= $scope.board.round.totalTricks && bid !== $scope.board.invalidBid) {
				$scope.board._bid = bid;
			}
		}
		
		function startGame(data){
		    console.log("ADMIN START GAME", data);
		    $scope.$apply(function(){
		    	GameManager.canStartGame = true;
		    });
		}
		
		function nextPlayer(response){
		    console.log("NEXT PLAYER", response);
		    $scope.board.winners = [];
		    updatePlayers(response);
		    $scope.board.baseCard = response.baseCard;
		    
		    $scope.board.currentPlayer = response.player.id;
			
			var currentPlayer = $scope.board.players.filter(function(p){
		    	return p.id === response.player.id && response.player.name === p.name && response.player.name === $scope.board.username;
		    });
			 
			// $scope.board.round = response.round;
			
			// insert previous players card in the right position
			if(response.previousPlayerCard){
				var index = getPlayerIndex(response.previousPlayerCard.id);
				$scope.board.playerCards.splice(index, 1, response.previousPlayerCard);
			}
			else if(response.previousPlayedCards){
				$scope.board.playerCards = [];
				for(var i = 0; i < response.previousPlayedCards.length; i++){
					var index = getPlayerIndex(response.previousPlayedCards[i].id);
					$scope.board.playerCards[index] = response.previousPlayedCards[i];
				}
			}
			if(currentPlayer.length > 0){
				// start bidding for this player
				$scope.board.myTurn = true;
				$scope.board.message = 'Your turn...';
			}
			else{
				$scope.board.myTurn = false;
				$scope.board.message = response.player.name + '\'s turn...';
				console.log("Playing...");
			}
			
			
		    $scope.$apply();
		    
		}
		
		function updateBids(bids){
			console.log(bids);
			var sum_of_bids = 0;
			var players = $scope.board.players;
			$scope.$apply(function(){
				for(var i = 0; i < bids.length; i++){
					for(var j = 0; j < players.length; j++){ // var player in ){
						if(players[j].id === bids[i].id){
							console.log("Set "+  bids[i].tricksBidded + " bids for " + players[j].name );
							players[j].tricksBidded = bids[i].tricksBidded;
							sum_of_bids += bids[i].tricksBidded;
							break;
						}
					}
					
				}
			});
			return sum_of_bids;
		}
		
		function setMyBid(bid){
			GameManager.setBid($scope.board.players[0].id, bid, function(data){
				console.log("bidset", data);
				$scope.board.players[0].tricksBidded = bid;
			});
		}

		function trickCompleted(response){
		    console.log("TRICK COMPLETED", response);
		    $scope.board.currentPlayer = null;
		    updatePlayers(response);
		    var winnerIndex = getPlayerIndex(response.previousTrickWinner);
		    $scope.board.baseCard = null;
		    
		    $scope.board.message = $scope.board.players[winnerIndex].name + " won this trick."
		    $scope.board.winners = [$scope.board.players[winnerIndex].name];
		    $scope.$apply(function(){
		    	var index = getPlayerIndex(response.previousPlayerCard.id);
				$scope.board.playerCards.splice(index, 1, response.previousPlayerCard);
				
		    	$timeout(function(){
		    		$scope.board.playerCards.splice(0, $scope.board.playerCards.length, {}, {}, {}, {});
		    	}, 2000);
		    })
		    
		}
		
		function roundCompleted(data){
			
			console.log("RoUND COMPLETED");
			$scope.board.currentPlayer = null;
			var winnerIndex = getPlayerIndex(data.previousTrickWinner);
			var winnerName = $scope.board.players[winnerIndex].name
		    $scope.board.baseCard = null;
			$scope.board._bid = 0;
			$scope.board.winners = [winnerName];
			
			console.log(data);
			$scope.board.message = winnerName + ' won this trick. Next round will begin in 5 secs...';
			$scope.board.myTurn = false;
			if(data.previousPlayerCard){
				var index = getPlayerIndex(data.previousPlayerCard.id);
				$scope.board.playerCards.splice(index, 1, data.previousPlayerCard);
			}
			$timeout(function(){
	    		$scope.board.playerCards.splice(0, $scope.board.playerCards.length, {}, {}, {}, {});
	    	}, 2000);

	    	updatePlayers(data);
			$scope.$apply();
		}
		
		function cardSelected(card){
			if($scope.board.currentPlayer === $scope.board.players[0].id){
			    console.log("Play card", card);
			    $scope.board.currentPlayer = null;
			    GameManager.playCard($scope.board.round.currentTrick, $scope.board.players[0].id, card.card, function(error, data){
					console.log("played card", data);
					updateCards($scope.board.players[0].id, data.cards);
					$scope.$apply();
					// GameManager.setCurrentCards(data);
				});
			}else{
				console.log("boardCtrl: Already Played");
			}
		}
		
		function startBidding(data){
			$scope.board.winners = [];
			$scope.board.invalidBid = -1;
			
			if(data.playerBids !== null){
				var sum_of_bids = -1;
				var totalBids = data.round.bids;
				sum_of_bids = updateBids(data.playerBids);
				if(totalBids === ($scope.board.players.length - 1)){
					if(sum_of_bids <= data.round.totalTricks){
						$scope.board.invalidBid = data.round.totalTricks - sum_of_bids;
					}
				}
			}
			
			$scope.board._bid = $scope.board.invalidBid === 0 ? 1 : 0;
			
			$scope.board.message = null;
			
			if(data.player === null){
				$scope.board.currentPlayer = null;
			}else{
				$scope.board.currentPlayer = data.player.id;
				
				var currentPlayer = $scope.board.players.filter(function(p){
			    	return p.id === data.player.id && data.player.name === p.name && data.player.name === $scope.board.username;
			    });

				console.log("Set bid for", data);
				$scope.board.round = data.round;
				
				if(!data.startPlaying){
					if(!data.playerBids){
						$scope.board.players.forEach(function(p){ p.tricksBidded = 0; p.tricksWon = 0; });
					}
					if(currentPlayer.length > 0){
						// start bidding for this player
						$scope.board.message = 'Please set your bid...';
						$scope.board.myTurn = true;
					}
					else{
						$scope.board.myTurn = false;
						$scope.board.message = data.player.name + ' bidding...';
						console.log("Bidding...");
					}
				}
				else{
					if(currentPlayer.length > 0){
						// start bidding for this player
						$scope.board.myTurn = true;
						$scope.board.message = 'Your turn...';
						/*$timeout(function(){
							GameManager.setBid(currentPlayer[0].id, 1, function(data){
								console.log("bidset", data);
							});
						}, 5000);*/
					}
					else{
						$scope.board.myTurn = false;
						$scope.board.message = data.player.name + '\'s turn...';
						console.log("Playing...");
					}
				}
			}
			
			$scope.$apply();
		}
		
		function gameStarted(response){
		    console.log("Game Started", response);
		    
		    $scope.$apply(function(){
		    	$scope.board.round = response.round;
		    	$scope.board.rounds = response.rounds;
		    	$scope.board.currentPlayerCards = response.cards;
		    });
		    
		}
		
		// gets called when new player enters the room
		function playerEntered(response){
			if(response.newPlayer.name === $scope.board.username){
				return;
			}
			console.log(response.newPlayer.name,  "entered the game room.");
			$scope.board.message = response.newPlayer.name + " entered the room.";
		    updatePlayers(response);
		    updateRound(response);
		}
		
		function playerLeft(response){
		    console.log("Player Left:", response);
		    if(typeof response.oldPlayer.name === 'undefined')
		    	return;
		    
		    $scope.board.message = response.oldPlayer.name + " left the room.";
		    $scope.$apply();
		    updatePlayers(response);
		}
		
		function updateRound(response){
			if(response.round){
		    	$scope.board.round = response.round;
		    	$scope.$apply();
		    }
		}

		function leaveRoom(){
		    GameManager.exitGame($scope.board.username, function(error, response){
		    	if(error){
		    		console.log(error)
		    	}else{
		    		console.log("LEFT ROOM BY ME");
			    	$scope.$apply(function(){
			    		$location.url("/board_enter");
			    	});
		    	}
		    	
		    });
		}
		
		function getPlayerIndex(id){
			var index = -1;
		    for(var i =0; i < $scope.board.players.length; i++){
		    	if( $scope.board.players[i].id === id){
		    		index = i;
		    		break;
		    	}
		    }
		    return index;
		}

		function updatePlayers(response){

		    $scope.$apply(function(){
		    	if(response.players){
		    		$scope.board.players = response.players;
		    	}
	    		if(response.round){
	    			$scope.board.round = response.round;
	    		}
	    		$scope.board.rounds = response.rounds;
	    		updateCards(response.playerId, response.cards);
		    });
		}
		
		function updateCards(id, cards){
    		var currentPlayer = $scope.board.players.filter(function(p){
		    	return p.id === id;
		    });
    		
    		if(cards && currentPlayer.length > 0){
    			$scope.board.currentPlayerCards = cards;
    			// currentPlayer[0].cards = response.cards;
    		}
		}
		
		function playerDisconnectedHandler(response){
			console.log("Player Disconnected:", response);
		    if(response.oldPlayer){
		    	$scope.board.message = response.oldPlayer.name + " disconnected.";
			    $scope.$apply();
		    }
		}
		
		function invite(){
			$http.post('invitation', { room: $scope.board.GameManager.roomName, total: 4 }).success(function(data){
				console.log('Invitation:', data);
				$scope.board.showInviteUrl = true;
				$scope.board.inviteURL = location.origin + '/invitation/' + data.id
			});
		}
		
		function pingTheServer(){
			if($scope.board.players[0].isOwner){
				$http.post('ping', { user: UserManager.user }).success(function(data){
					console.log('Ping Response:', data);
				});
			}
		}
	}]);
	
});
