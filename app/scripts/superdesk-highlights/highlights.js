/**
 * This file is part of Superdesk.
 *
 * Copyright 2013, 2014 Sourcefabric z.u. and contributors.
 *
 * For the full copyright and license information, please see the
 * AUTHORS and LICENSE files distributed with this source code, or
 * at https://www.sourcefabric.org/superdesk/license
 */

(function() {

    'use strict';

    /**
     * Service for highlights with caching.
     */
    HighlightsService.$inject = ['api', '$q', '$cacheFactory'];
    function HighlightsService(api, $q, $cacheFactory) {
    	var service = {};
        var cache = $cacheFactory('highlightList');

        /**
         * Fetches and caches highlights, or returns from the cache.
         */
       service.get = function(desk) {
    	   var DEFAULT_CACHE_KEY = '_nodesk';
           var key = desk || DEFAULT_CACHE_KEY;

            var value = cache.get(key);
            if (value) {
                return $q.when(value);
            } else {
                var criteria = {};
                if (desk) {
                	criteria = {where: {'desks': desk}};
                }

                return api('highlights').query(criteria)
                .then(function(result) {
                    cache.put(key, result);
                    return result;
                });
            }
        };

        /**
         * Clear user cache
         */
        service.clearCache = function() {
        	cache.removeAll();
        };

        /**
         * Mark an item for a highlights list
         */
        service.mark_item = function mark_item(highlights, marked_item) {
            return api.markForHighlights.create({highlights: highlights, marked_item: marked_item})
            	.then(function(result) {
            		console.log('item is marked');
            	});
        };

        return service;
    }

    HighlightsDropdownCtrl.$inject = ['$scope', 'highlightService', 'packagesService'];
    function HighlightsDropdownCtrl($scope, highlightService, packagesService) {
    	highlightService.get($scope.item.task.desk).then(function(result) {
	    	$scope.highlights = result._items;
	    });

        $scope.mark_item = function mark_item(highlight) {
        	highlightService.mark_item(highlight._id, $scope.item._id);
        };

        $scope.createEmptyHighlight = function createEmptyHighlight(highlight) {
            var pkg_defaults = {
                headline: highlight.name,
                highlight: highlight._id
            };

            return packagesService.createEmptyPackage(pkg_defaults);
        };
    }

    var app = angular.module('superdesk.highlights', [
        'superdesk.packaging',
        'superdesk.activity',
        'superdesk.api'
    ]);

    app
    .service('highlightService', HighlightsService)
    .config(['superdeskProvider', function(superdesk) {
        superdesk
	    .activity('mark.item', {
        	label: gettext('Mark item'),
            priority: 30,
        	icon: 'pick',
        	dropdown: true,
        	templateUrl: require.toUrl('./superdesk-highlights/views/highlights_dropdown.html'),
        	filters: [
                {action: 'list', type: 'archive'}
            ],
            condition: function(item) {
                return item.type !== 'composite';
            }
        })
        .activity('create.highlight', {
            label: gettext('Create highlight'),
            controller: ['data', '$location', 'highlightsService', 'superdesk',
                function(data, $location, highlightsService, superdesk) {
                    highlightsService.createEmptyHighlight(data).then(
                        function(new_package) {
                            superdesk.intent('author', 'package', new_package);
                    });
            }],
            filters: [
                {action: 'create', type: 'highlight'}
            ]
        });
    }])
    .config(['apiProvider', function(apiProvider) {
        apiProvider.api('highlights', {
            type: 'http',
            backend: {rel: 'highlights'}
        });
        apiProvider.api('markForHighlights', {
            type: 'http',
            backend: {rel: 'marked_for_highlights'}
        });
    }])
    .controller('HighlightsDropdownCtrl', HighlightsDropdownCtrl);

    return app;
})();
