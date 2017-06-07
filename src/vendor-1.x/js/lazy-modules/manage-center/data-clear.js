/**
 * Created by zppro on 16-3-22.
 */

(function() {
    'use strict';

    angular
        .module('subsystem.manage-center')
        .controller('DataClearController', DataClearController)
    ;

    DataClearController.$inject = ['$scope', 'ngDialog', 'vmh', 'instanceVM'];

    function DataClearController($scope, ngDialog, vmh, vm) {
        $scope.vm = vm;

        init();

        function init() {

            vm.init();

            vm.clearElderly = clearElderly;

        }

        function clearElderly() {
            if(!vm.clearElderlyId || vm.clearElderlyId.length != 24) {
                vmh.alertWarning(vm.moduleTranslatePath('MSG-INVALID-ELDERLYID'), true);
                return;
            }
            ngDialog.openConfirm({
                template: 'customConfirmDialog.html',
                className: 'ngdialog-theme-default',
                controller: ['$scope', function ($scopeConfirm) {
                    $scopeConfirm.message = vm.moduleTranslatePath('MSG-CLEAR-ELDERLY')
                }]
            }).then(function () {
                console.log('-----clear elderly--------', vm.clearElderlyId);
                vmh.extensionService.clearElderly(vm.clearElderlyId).then(function () {
                    vmh.alertSuccess('notification.NORMAL-SUCCESS', true);
                });
            });
        }
    }

})();
