/**
 * district Created by zsx on 17-5-27.
 * Target:养老机构片区  (移植自fsrok)
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.pension-agency')
        .controller('OverdueWorkItemGridController',OverdueWorkItemGridController)
    ;

    OverdueWorkItemGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function OverdueWorkItemGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            // vm.query();
             vmh.psnService.overdueWorkItem(vm.tenantId).then(function(ret){  
                vm.overdueWorkItems = ret;
                console.log(ret)
            })
        }
    }
})();