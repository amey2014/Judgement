define(['angular', 'static/scripts/language', 'static/scripts/judgement'], function(){
	
	var module = angular.module('cardGames', ['languageModule', 'judgementApp']);

	module.controller('ctrlShell', ['$scope', '$window', 'UserManager', function($scope, $window, UserManager){
		// here we should get locale value, default is set in main.js
		$scope.language = localStorage.getItem('locale'); 

		UserManager.getUserDetails(userDetailsCallback);
		
		function userDetailsCallback(data){
			console.log(data);
		}
		
		// function is invoked when user changes the language
		$scope.$watch('language', function(newValue, oldValue){
			if(oldValue !== newValue){
				localStorage.setItem('locale', newValue);
				$window.location.reload(true);
			}
		});
		
	}]);

	return module;
	
});
