/**
 * district Created by zppro on 17-4-27.
 * Target:养老机构 照护组
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.pension-agency')
        .controller('NursingGroupGridController', NursingGroupGridController)
        .controller('NursingGroupDetailsController', NursingGroupDetailsController)
    ;


    NursingGroupGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function NursingGroupGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.query();
        }
    }

    NursingGroupDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function NursingGroupDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});

            vm.resetLeader = resetLeader;
            vm.doSubmit = doSubmit;

            vm.tab1 = {cid: 'contentTab1'};

            vm.treeDataPromiseOfNursingWorkers = vmh.shareService.tmp('T3011', 'name', {tenantId:vm.tenantId, groupId: vm.getParam('_id')}, true).then(function(nodes){
                console.log(nodes);
                return nodes;
            });

            vm.load();

        }

        function resetLeader(item) {
            if (item.leader_flag) {
                if (!vm.leader) {
                    console.log(1);
                    vm.leader = item;
                } else {
                    if (vm.leader !== item) {
                        console.log(2);
                        vm.leader.leader_flag = false;
                    }
                    vm.leader = item;
                }
            } else {
                if(vm.leader === item) {
                    vm.leader.leader_flag = true;
                }
            }
        }

        function doSubmit() {

            if ($scope.theForm.$valid) {
                if(!vm.leader) {
                    vmh.alertWarning(vm.viewTranslatePath('NOT-SET-LEADER'), true);
                    return;
                }
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