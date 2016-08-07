define(['angular', 'ngRoute', 'ngSanitize', 'static/scripts/language'], function(angular, ngRoute){
	
	return angular.module('judgementApp', ['ngRoute', 'ngSanitize', 'languageModule'])
		.config(['$routeProvider',
			function($routeProvider) {
				$routeProvider.
			      when('/board_enter', {
					templateUrl: 'static/scripts/judgement/views/board_enter.html',
					controller: 'JudgementHomeCtrl'
				  })/*.when('/ju_home_entry', {
					templateUrl: 'static/scripts/judgement/views/home_entry.html',
					controller: 'JudgementHomeCtrl'
				  })*/.when('/board', {
					templateUrl: 'static/scripts/judgement/views/boardView_4.html',
					controller: 'BoardCtrl'
				  }).
				  otherwise({
					redirectTo: '/board_enter'
				  });
			}
	]);
	
});