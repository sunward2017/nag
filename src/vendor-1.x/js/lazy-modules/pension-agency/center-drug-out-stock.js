/**
 * Created by hcl on 17-9-12.
 */
(function() {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('CenterDrugOutStockController',CenterDrugOutStockController)
    ;

    CenterDrugOutStockController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function  CenterDrugOutStockController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});

            vm.pagingChange = pagingChange;
            vm.page={size:5,no:1};
            vmh.psnService.queryCenterStockAllotRecords(vm.tenantId,null).then(function (ret) {
                vm.page.totals=ret.length;
                queryRecords();
            });

        }

        function queryRecords() {
            vmh.psnService.queryCenterStockAllotRecords(vm.tenantId,vm.page).then(function (ret) {
                vm.rows=ret;
            });
        }

        function pagingChange() {
            queryRecords();
        }
    }

})();