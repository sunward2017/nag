/**
 * Created by hcl on 17-8-30.
 */
(function() {
    'use strict';

    angular
        .module('subsystem.manage-center')
        .controller('BedMonitorStatusController', BedMonitorStatusController)
    ;


    BedMonitorStatusController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function BedMonitorStatusController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vmh.extensionService.bedMonitorsAggregateQuery().then(function (ret) {
                console.log('ret:',ret);
                vm.rows=ret;
            });
        }

    }


})();