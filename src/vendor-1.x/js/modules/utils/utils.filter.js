/**=========================================================
 * Module: utils.js
 * Utility library to use across the theme
 =========================================================*/

(function() {
    'use strict';

    angular
        .module('app.utils')
        .filter('unescapeHTML', unescapeHTMLFilter)
        .filter('safeArrayMember', safeArrayMember)
        .filter('defaultValue', defaultValue)
    ;


    unescapeHTMLFilter.$inject = ['ViewUtils'];

    function unescapeHTMLFilter(ViewUtils) {
        return ViewUtils.unescapeHTML;
    }

    safeArrayMember.$inject = ['ViewUtils'];

    function safeArrayMember(ViewUtils) {
        return ViewUtils.safeArrayMember;
    }

    function defaultValue(ViewUtils) {
        return ViewUtils.defaultValue;
    }

})();
