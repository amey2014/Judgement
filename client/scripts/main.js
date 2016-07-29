// get the locale from localStorgae. If no locale is set, then use English as default
var locale = localStorage.getItem('locale') || 'en';
localStorage.setItem('locale', locale);

require.config({
	packages: [ 'static/scripts/language', 'static/scripts/judgement' ],
	
	paths: {
		angular: "static/lib/angular.min",
		angularLocale: "static/lib/i18n/angular-locale_" + locale,
        ngRoute: "static/lib/angular-route.min",
		app: 'static/scripts/app'
	},
	
	shim: {
		'angular' : {'exports' : 'angular'},
		'angularRoute': ['angular'],
		'angularLocale': ['angular']
	},
	
	priority: [
		"angular"
	],

	config: {
        i18n: {
            locale: locale
        }
    }
})

require([
	'angular',
	'angularLocale',
	'app'
	], function(angular, angularLocale, app) {
		var $html = angular.element(document.getElementsByTagName('html')[0]);
		angular.element().ready(function() {
			// bootstrap the app manually
			angular.bootstrap(document, ['cardGames']);
		});
	}
);
