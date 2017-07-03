/**
 * district Created by zppro on 17-5-27.
 * Target:养老机构片区  (移植自fsrok)
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.pension-agency')
        .controller('AlarmGridController',AlarmGridController)
         
    ;

    AlarmGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function  AlarmGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});

            vm.closeAlarm = closeAlarm;

            vm.query();
        }

        function closeAlarm(alarmId) {
            var promise = ngDialog.openConfirm({
                template: 'customConfirmDialog.html',
                className: 'ngdialog-theme-default',
                controller: ['$scope', function ($scopeConfirm) {
                    $scopeConfirm.message = vm.viewTranslatePath('DLG-ALARM-TO-CONFIRM-CLOSE')
                }]
            }).then(function () {
                vmh.psnService.nursingStationCloseBedMonitorAlarm(alarmId, {
                    operated_by: vm.operated_by,
                    operated_by_name: vm.operated_by_name
                }).then(function (ret) {
                    vm.query();
                });
            });
        }
    }
    
})();