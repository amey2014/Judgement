define(['../module'], function(module){
	
	// Book Details Directive
	return module.directive('playerScoreCard', function() {
		console.log('playerScoreCard directive initialized...');
		
		function link(scope, attrs, element){
			//console.log(scope, attrs, element);
		}
		
		return {
			link: link,
			restrict: 'E',
			templateUrl: 'static/scripts/judgement/directives/playerScoreCard.tmpl.html',
			scope: {
				player: '=',
				round: '=',
				turn: '=',
				currentCard: '='
			},
			controller: ['$scope', function($scope){
				$scope.cardSymbol = {
					Spade: '&spades;',
					Diamond: '&diams;',
					Club: '&clubs;',
					Heart: '&hearts;'
				}
			}]
		}
		
	}).directive('loggedInPlayerScoreCard', function() {
		console.log('loggedInPlayerScoreCard directive initialized...');
		
		function link($scope, attrs, element){
			
			$scope.$watch('baseCard', function(newValue, oldValue){
				console.log("Inside base card");
				
				if($scope.turn && $scope.player){
					if($scope.turn === $scope.player.id){
						var hasCard = false;
						if($scope.baseCard){
							$scope.cards.forEach(function(card){
								card.canPlay = false;
							});
							
							console.log("Start");

							if($scope.baseCard){
								$scope.cards.forEach(function(card){
									if(card.suitIndex === $scope.baseCard.card.suitIndex){
										card.canPlay = true;
										hasCard = true;
									}else{
										card.canPlay = false;
									}
								});
							}
							
						}
						
						console.log("hasCard", hasCard);
						if(!hasCard){
							$scope.cards.forEach(function(card){
								card.canPlay = true;	
							});
						}
					}else{
						console.log("not your turn 1");
						if($scope.player && $scope.cards){
							$scope.cards.forEach(function(card){
								card.canPlay = true;	
							});
						}
						
					}
				}else{
					console.log("not your turn 2");
					if($scope.player && $scope.cards){
						$scope.cards.forEach(function(card){
							card.canPlay = true;	
						});
					}
				}
			})
		}
		
		return {
			link: link,
			restrict: 'E',
			templateUrl: 'static/scripts/judgement/directives/loggedInPlayerScoreCard.tmpl.html',
			scope: {
				player: '=',
				cards: '=',
				round: '=',
				turn: '=',
				baseCard: '=',
				cardSelected: '&'
			},
			controller: ['$scope', function($scope){
				$scope.cardSymbol = {
					Spade: '&spades;',
					Diamond: '&diams;',
					Club: '&clubs;',
					Heart: '&hearts;'
				}
				
				$scope.selectedCard = null;
				$scope.playCard = playCard;
				$scope.cardClicked = cardClicked;
				
				function cardClicked(card){
					var hasCard = false;
					if($scope.baseCard){
						hasCard = $scope.cards.some(function(c){
							return c.suitIndex === $scope.baseCard.card.suitIndex;
						});
					}
					
					if(!hasCard || $scope.baseCard.card.suitIndex === card.suitIndex){
						$scope.selectedCard = card;
					}
					
				}
				
				var inProcess = false;
					
				function playCard(card){
					console.log("Test", card)
					if(!inProcess){
						
						try{
							if(card){
								inProcess = true;
								var hasCard = false;
								if($scope.baseCard){
									hasCard = $scope.cards.some(function(c){
										return c.suitIndex === $scope.baseCard.card.suitIndex;
									});
								};
								if(!hasCard || $scope.baseCard.card.suitIndex === card.suitIndex){
									$scope.cardSelected({ card: card });
									$scope.selectedCard = null;
								}
							}
						}catch(error){
							console.log("Error occured in playCard()");
						}finally{
							inProcess = false;
						}
					}
					else{
						console.log("Already played");
					}
				}
			}]
		}
		
	});

});
