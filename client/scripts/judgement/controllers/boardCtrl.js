define(['../module'], function(module){
	
	return module
	.controller('BoardCtrl', ['$scope', '$location', '$timeout', 'my.i18n', 'UserManager', 'GameManager', function($scope, $location, $timeout, i18n, UserManager, GameManager) {
		console.log('Board controller initialized...');
		$scope.i18n = i18n;
		$scope.board = {};
		
		$scope.board.GameManager = GameManager;
		$scope.board.leaveRoom = leaveRoom;
		$scope.board.setMyBid = setMyBid;
		$scope.board.players = [];
		$scope.board.round = null;
		$scope.board.currentPlayer = null;
		$scope.board.message = null;
		$scope.board.cardSelected = cardSelected;
		$scope.board.playerCards = [{}, {}, {}, {}];
		$scope.board.selectBid = selectBid;
		$scope.board.showPoints = showPoints;
		$scope.board.hidePoints =  hidePoints;
		$scope.board.showPointsTable = false;
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
				case GameManager.MESSAGE_KEYS.NEXT_PLAYER:
					nextPlayer(data);
					break;
				case GameManager.MESSAGE_KEYS.ROUND_COMPLETED:
					roundCompleted(data);
					break;
				case GameManager.MESSAGE_KEYS.TRICK_COMPLETED:
					trickCompleted(data);
					break;
				default:
					break;
			}
		}
		
		function selectBid(bid){
			if(bid <= $scope.board.round.totalTricks &&  bid !== $scope.board.invalidBid) {
				$scope.board._bid = bid;
			}
			
		}
		
		function startGame(data){
		    console.log("ADMIN START GAME", data);
		    $scope.$apply(function(){
		    	GameManager.canStartGame = true;
		    })
		    
		}
		
		function nextPlayer(response){
		    console.log("NEXT PLAYER", response);
		    
		    getAllPlayersCallback(response);
		    $scope.board.baseCard = response.baseCard;
		    
		    $scope.board.currentPlayer = response.player.id;
			
			var currentPlayer = $scope.board.players.filter(function(p){
		    	return p.id === response.player.id && response.player.name === p.name && response.player.name === $scope.board.username;
		    });
			 
			$scope.board.round = response.round;
			
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
		    getAllPlayersCallback(response);
		    var winnerIndex = getPlayerIndex(response.previousTrickWinner);
		    $scope.board.baseCard = null;
		    
		    $scope.board.message = $scope.board.players[winnerIndex].name + " won this trick."
		    	
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
			$scope.board._bid = 0;
			$scope.board.baseCard = null;
			console.log(data);
			$scope.board.message = 'Next round will begin in 5 secs...';
			$scope.board.myTurn = false;
			if(data.previousPlayerCard){
				var index = getPlayerIndex(data.previousPlayerCard.id);
				$scope.board.playerCards.splice(index, 1, data.previousPlayerCard);
			}
			$timeout(function(){
	    		$scope.board.playerCards.splice(0, $scope.board.playerCards.length, {}, {}, {}, {});
	    	}, 2000);

	    	getAllPlayersCallback(data);
			$scope.$apply();
		}
		
		function cardSelected(card){
			if($scope.board.currentPlayer === $scope.board.players[0].id){
			    console.log("Play card", card);
			    $scope.board.currentPlayer = null;
			    GameManager.playCard($scope.board.round.currentTrick, $scope.board.players[0].id, card.card, function(data){
					console.log("played card", data);
					GameManager.setCurrentCards(data);
				});
			}else{
				console.log("boardCtrl: Already Played");
			}
		}
		
		function startBidding(data){
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
		    if(data.round){
		    	$scope.board.round = data.round;
		    	$scope.$apply();
		    }
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
	    		$scope.board.players = players;
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
