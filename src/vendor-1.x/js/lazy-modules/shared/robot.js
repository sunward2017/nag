/**
 * district Created by zppro on 17-3-6.
 * Target:机器人
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.shared')
        .controller('RobotGridController', RobotGridController)
        .controller('RobotDetailsController', RobotDetailsController)
        .controller('RobotListController',RobotListController)
    ;


    RobotGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function RobotGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.importRobot = importRobot;
            vm.query();
        }

        function importRobot(){
             ngDialog.open({
                template: 'robot-list.html',
                controller: 'RobotListController',
                className: 'ngdialog-theme-default ngdialog-robot-list',
                data: {
                    vmh: vmh,
                    moduleTranslatePathRoot: vm.viewTranslatePath()
                }
            }).closePromise.then(function (ret) {
                if(ret.value!='$document' && ret.value!='$closeButton' && ret.value!='$escape' ) {
                    vm.query();
                }
            })
        }
    }
    
    RobotListController.$inject = ['$scope', 'ngDialog']; 
    function RobotListController($scope,ngDialog){
        var vm = $scope.vm = {};
        var vmh = $scope.ngDialogData.vmh;
        vm.doSubmit = doSubmit;
        vm.moduleTranslatePath = moduleTranslatePath
        init();
        function init() {
            vmh.parallel([
                vmh.clientData.getJson('robotList'),
            ]).then(function(ret){
                vm.xAxisData = ret[0];
            })        
        }

        var moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
        function moduleTranslatePath(key) {
            return moduleTranslatePathRoot + '.' + key;
        };

        function doSubmit() {
            var promise = ngDialog.openConfirm({
                template: 'customConfirmDialog.html',
                className: 'ngdialog-theme-default',
                controller: ['$scope', function ($scopeConfirm) {
                    $scopeConfirm.message = vm.moduleTranslatePath('DLG-COPY-WORK_ITEM')
                }]
            }).then(function () {
                vmh.psnService.workItemCopy(vm.nursingLevelIds, row.id).then(function () {
                    $scope.closeThisDialog();
                    vmh.alertSuccess('notification.NORMAL-SUCCESS', true);
                })
            });
        }
    }



    RobotDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function RobotDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});


            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};

            vm.load().then(function(){
                vm.raw$stop_flag = !!vm.model.stop_flag;
            });

        }


        function doSubmit() {

            if ($scope.theForm.$valid) {
                var p;
                if(vm.raw$stop_flag === false && vm.model.stop_flag === true) {
                    p = vmh.fetch(vmh.psnService.robotRemoveRoomConfig(vm.tenantId, vm.model.id));
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