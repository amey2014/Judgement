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
				turn: '='
			}
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
				turn: '='
			},
			controller: ['$scope', function($scope){
				$scope.cardSymbol = {
					Spade: '&spades;',
					Diamond: '&diams;',
					Club: '&clubs;',
					Heart: '&hearts;'
				}
				console.log($scope.player)
			}]
		}
		
	});

});
