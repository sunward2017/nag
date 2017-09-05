/**
 * district Created by zppro on 17-3-8.
 * Target:设备 睡眠带
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.shared')
        .controller('BedMonitorGridController', BedMonitorGridController)
        .controller('BedMonitorDetailsController', BedMonitorDetailsController)
    ;


    BedMonitorGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function BedMonitorGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.query();
        }
    }

    BedMonitorDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM','$timeout'];

    function BedMonitorDetailsController($scope, ngDialog, vmh, vm,$timeout) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});


            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};

            vm.load().then(function(){
                vm.raw$stop_flag = !!vm.model.stop_flag;
                vm.tenant_name=undefined;
            });

            vm.isBedMonitorUsed=isBedMonitorUsed;
            vm.isBedMonitorName=isBedMonitorName;
        }
        function isBedMonitorUsed() {
            vmh.psnService.bedMonitorUseCheck(vm.model.name,vm.tenantId).then(function(ret){
                // console.log('ret:',ret);
                vm.tenant_name=ret;
            });
            $timeout(function () {
                vm.tenant_name=undefined;
            },3000);
        }
        function isBedMonitorName(name){
            var bValidate = RegExp(/^A[0-9]{7}$/).test(name);
            if (bValidate) {
                return true;
            }
            else
                return false;
        }

        function doSubmit() {

            if ($scope.theForm.$valid) {
                var p;
                if(vm.raw$stop_flag === false && vm.model.stop_flag === true) {
                    p = vmh.fetch(vmh.psnService.bedMonitorRemoveRoomConfig(vm.tenantId, vm.model.id));
                } else {
                    p = vmh.promiseWrapper();
                }
                p.then(function(){
                    vm.save();
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