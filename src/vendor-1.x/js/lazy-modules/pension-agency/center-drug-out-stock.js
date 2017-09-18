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
            vm.query();
            console.log('outStock list :',vm.rows);

            vmh.parallel([
                vmh.shareService.d('D3026')
            ]).then(function (results) {
                vm.selectBinding.mini_units = results[0];
            })

        }
    }

})();