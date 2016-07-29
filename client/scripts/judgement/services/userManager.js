define(['../module'], function(module){
	
	return module
		.factory('UserManager', ['$http', function($http) {
			console.log('UserManager Service initialized...');

			var service = {
				user: null,
				getUserDetails: getUserDetails
			}
			
			return service;
			
			// returns promise for getBooks
			function getUserDetails(callback){
				if(service.user){
					callback(service.user);
				}
				else{
					$http.get('userDetails').success(function(data){
						service.user = data;
						callback(service.user);
					});
				}
			}
			
			// returns promise for getBookDetails
			function getBookDetails(){
				return $http.get('static/data/bookDetails.json');
			}
		}]);
	
});
