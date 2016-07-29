define(['../module'], function(module){
	
	// Book Details Directive
	return module.directive('bookDetails', function() {
		console.log('bookDetails directive initialized...');
		
		function link(scope, attrs, element){
			console.log(scope, attrs, element);
		}
		
		return {
			link: link,
			restrict: 'E',
			templateUrl: 'static/scripts/booksLibrary/directives/bookDetails.tmpl.html',
			scope: {
				book: '='
			}
		}
		
	});

});
