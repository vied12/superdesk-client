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
    HighlightsService.$inject = ['api', '$q', '$cacheFactory', 'packagesService'];
    function HighlightsService(api, $q, $cacheFactory, packagesService) {
    	var service = {};
        var cache = $cacheFactory('highlightList');

        service.createEmptyHighlight = function createEmptyHighlight(highlight) {
            var pkg_defaults = {
                headline: highlight.name,
                highlight: highlight._id
            };

            return packagesService.createEmptyPackage(pkg_defaults);
        };

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
         * Mark an item for a highlight
         */
        service.mark_item = function mark_item(highlight, marked_item) {
            console.log('create highlight', highlights, marked_item);
            return api.markForHighlights.create({highlight: highlight, marked_item: marked_item})
            	.then(function(result) {
                    return result;
            	});
        };

        return service;
    }

    HighlightsDropdownCtrl.$inject = ['$scope', 'highlightsService', 'packagesService'];
    function HighlightsDropdownCtrl($scope, highlightsService, packagesService) {
    	highlightsService.get($scope.item.task.desk).then(function(result) {
	    	$scope.highlights = result._items;
	    });

        $scope.mark_item = function mark_item(highlight) {
        	highlightsService.mark_item(highlight._id, $scope.item._id);
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
    .service('highlightsService', HighlightsService)
    .directive('highlightsDropdown', function() {
        return {
            templateUrl: require.toUrl('./superdesk-highlights/views/highlights_dropdown.html')
        };
    })
    .config(['superdeskProvider', function(superdesk) {
        superdesk
	    .activity('mark.item', {
        	label: gettext('Mark item'),
            priority: 30,
        	icon: 'pick',
        	dropdown: true,
        	filters: [
                {action: 'list', type: 'archive'}
            ],
            condition: function(item) {
                return item.type !== 'composite';
            }
        })
        .activity('create.highlight', {
            label: gettext('Create highlight'),
            controller: ['data', 'highlightsService', 'superdesk',
                function(data, highlightsService, superdesk) {
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
