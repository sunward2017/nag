/**
 * Created by zppro on 17-5-8.
 */

(function() {
    'use strict';

    angular
        .module('subsystem.manage-center')
        .controller('JobStatusGridController', JobStatusGridController)
        .controller('JobStatusDetailsController', JobStatusDetailsController)
    ;

    JobStatusGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function JobStatusGridController($scope, ngDialog, vmh, vm) {
        $scope.vm = vm;
        $scope.utils = vmh.utils.g;
         
        init();


        function init() {
            vm.init({removeDialog: ngDialog});

            vm.query();
        }
    }

    JobStatusDetailsController.$inject = ['$scope','ngDialog', 'vmh','entityVM'];

    function JobStatusDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});

            vm.readlog = readlog;
            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};


            vm.load();

        }

        function readlog() {
            
        }

        function doSubmit() {

            if ($scope.theForm.$valid) {
                //console.log(vm.model);
                vm.model.ver_order = genVerOrder(vm.model.ver);
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
