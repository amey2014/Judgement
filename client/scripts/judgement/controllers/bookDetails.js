define(['../module'], function(module){
	
	return module.controller('BookDetailsCtrl', ['$scope', 'BooksManagerService', 'my.i18n', function($scope, booksManagerService, i18n) {
		console.log('BookDetailsCtrl initialized...');
		$scope.i18n = i18n;
		$scope.book = {};
		
		booksManagerService.getBookDetails().then(
			// success
			function(data) {
				$scope.book = data.data;
			},
			// error
			function(error) {
				console.log('Error occurred while displaying details: ', error.statusText, error);
				$scope.book = {};
			}
		);
	}]);
	
});


/*

var app = angular.module('libraryApp', ['ngRoute']);

app.factory('BooksManagerService', ['$http', function($http) {
	console.log('BooksManagerService initialized...');
	
	var service = {
		getBooks: getBooks,
		getBookDetails: getBookDetails
	}
	
	return service;
	
	// returns promise for getBooks
	function getBooks(){
		return $http.get('static/data/books.json');
	}
	
	// returns promise for getBookDetails
	function getBookDetails(){
		return $http.get('static/data/bookDetails.json');
	}
}]);

// Books controller
app.controller('BooksCtrl', ['$scope', 'BooksManagerService', function($scope, booksManagerService) {
	console.log('Books controller initialized...');
	$scope.books = [];
	
	booksManagerService.getBooks().then(
		// success
		function(data) {
			// console.log(data);
			$scope.books = data.data;
		},
		// error
		function(error) {
			console.log('Error occurred while getting list of books: ', error.statusText, error);
			$scope.books = [];
		}
	);

}]);

// Book Details controller
app.controller('BookDetailsCtrl', ['$scope', 'BooksManagerService', function($scope, booksManagerService) {
	console.log('BookDetailsCtrl initialized...');
	$scope.book = {};
	
	booksManagerService.getBookDetails().then(
		// success
		function(data) {
			$scope.book = data.data;
		},
		// error
		function(error) {
			console.log('Error occurred while displaying details: ', error.statusText, error);
			$scope.book = {};
		}
	);
}]);

// Book Details Directive
app.directive('bookDetails', function() {
	console.log('bookDetails directive initialized...');
	
	function link(scope, attrs, element){
		console.log(scope, attrs, element);
	}
	
	return {
		link: link,
		restrict: 'E',
		templateUrl: 'static/scripts/templates/bookDetails.tmpl.html',
		scope: {
			book: '='
		}
	}
	
});

// Config
app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/books', {
        templateUrl: 'static/scripts/books.html',
        controller: 'BooksCtrl'
      }).
      when('/books/:bookID', {
        templateUrl: 'static/scripts/bookDetails.html',
        controller: 'BookDetailsCtrl'
      }).
      otherwise({
        redirectTo: '/books'
      });
}]);

/*
angular.bootstrap (
	document,
	[ 'libraryApp' ]
);
*/