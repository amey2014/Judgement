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
			
			$scope.$watch('player', function(newValue, oldValue){
				//console.log(newValue, oldValue);
			})
		}
		
		return {
			link: link,
			restrict: 'E',
			templateUrl: 'static/scripts/judgement/directives/loggedInPlayerScoreCard.tmpl.html',
			scope: {
				player: '=',
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
						hasCard = $scope.player.cards.some(function(c){
							return c.suitIndex === $scope.baseCard.card.suitIndex;
						});
					}
					
					if(!hasCard || $scope.baseCard.card.suitIndex === card.suitIndex){
						$scope.selectedCard = card;
					}
					
				}
				
				function playCard(card){
					var hasCard = false;
					if($scope.baseCard){
						hasCard = $scope.player.cards.some(function(c){
							return c.suitIndex === $scope.baseCard.card.suitIndex;
						});
					};
					if(!hasCard || $scope.baseCard.card.suitIndex === card.suitIndex){
						$scope.cardSelected({ card: card });
					}
					
				}
			}]
		}
		
	});

});
