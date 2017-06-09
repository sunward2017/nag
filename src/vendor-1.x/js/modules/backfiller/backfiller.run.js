/**
 * tree.module Created by zppro on 17-5-3.
 * Target:用途
 */
(function() {
    'use strict';

    angular
        .module('app.backfiller')
        .run(backfillerRun);
    ;

    backfillerRun.$inject = ['$templateCache'];

    function backfillerRun($templateCache) {
        var templateContent = '<div class="input-group">\
            <input type="text" name="{{formName}}" class="form-control" ng-model="text"  ng-required="{{required}}" />\
            <span class="input-group-btn"><button type="button" class="btn btn-primary" ng-click="pick()" >\
            <i class="glyphicon " ng-class="icon"></i></button></span></div>';
        $templateCache.put("backfiller-default-render.html",templateContent);

    }
})();