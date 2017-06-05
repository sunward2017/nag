/**
 * dashboard Created by zppro on 17-6-5.
 * Target:第三方接口账号管理
 */
(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('Shared_interfaceAccountIndexController', Shared_interfaceAccountIndexController)
        .controller('Shared_InterfaceAccountMingZhongGridController', Shared_InterfaceAccountMingZhongGridController)
        .controller('Shared_InterfaceAccountMingZhongDetailsController', Shared_InterfaceAccountMingZhongDetailsController)
        ;

    Shared_interfaceAccountIndexController.$inject = ['$scope', 'vmh', 'instanceVM'];

    function Shared_interfaceAccountIndexController($scope, vmh, vm) {
        $scope.vm = vm;

        init();


        function init() {

            vm.init();

        }

    }

    Shared_InterfaceAccountMingZhongGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function Shared_InterfaceAccountMingZhongGridController($scope, ngDialog, vmh, vm) {
        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});

            vm.updateElderlyUsers = updateElderlyUsers;
            vm.query();
        }
        
        function updateElderlyUsers(id) {
            vmh.psnService.vitalSign$MingZhong$updateElderlyUsers(vm.tenantId, id).then(function () {
                vmh.alertSuccess('notification.SYNC-SUCCESS', true);
                vm.query();
            });
        }
    }

    Shared_InterfaceAccountMingZhongDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function Shared_InterfaceAccountMingZhongDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});

            vm.doSubmit = doSubmit;

            vm.tab1 = {cid: 'contentTab1',active:true};

            vm.load();
        }
        

        function doSubmit() {

            if ($scope.theForm.$valid) {
                vm.save(true).then(function(){
                    $scope.$state.go(vm.transTo.mingzhong$list);
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