/**
 * district Created by zppro on 17-5-12.
 * Target: 管理平台 数据管理 药品
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.manage-center')
        .controller('DrugGridController',DrugGridController)
        .controller('DrugDetailsController',DrugDetailsController)
    ;

    DrugGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function  DrugGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.query();
        }
    }
    DrugDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function  DrugDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});


            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};

            vm.load();

        }


        function doSubmit() {

            if ($scope.theForm.$valid) {
                vm.save();
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }


    }

})();