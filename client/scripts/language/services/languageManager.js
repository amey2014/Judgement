define(['../module', 'i18n!static/scripts/nls/default'], function(module, keys){

	return module.factory('my.i18n', function(){

		var service = {
			get: get
		}

		return service;

		function get(key){
			return keys[key];
		}
	});

})