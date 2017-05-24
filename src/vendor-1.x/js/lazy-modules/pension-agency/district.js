/**
 * district Created by zppro on 17-2-22.
 * Target:养老机构片区  (移植自fsrok)
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.pension-agency')
        .controller('DistrictGridController', DistrictGridController)
        .controller('DistrictDetailsController', DistrictDetailsController)
    ;


    DistrictGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function DistrictGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.query();
        }
    }

    DistrictDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function DistrictDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});


            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};

            vm.load().then(function(){
                vm.old_name = vm.model.name;
            });

        }


        function doSubmit() {

            if ($scope.theForm.$valid) {
                vm.save().then(function (ret) {
                    if (vm.old_name != vm.model.name && vm._action_ == 'edit') {
                        console.log('notifyDataChange');
                        vmh.shareService.notifyDataChange('psn$district$name', vm.model._id);
                    }
                });
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }


    }

})();