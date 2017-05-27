/**
 * district Created by zppro on 17-5-27.
 * Target:养老机构片区  (移植自fsrok)
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.pension-agency')
        .controller('WarningGridController',WarningGridController)
         
    ;

    WarningGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function  WarningGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.query();
        }
    }
})();