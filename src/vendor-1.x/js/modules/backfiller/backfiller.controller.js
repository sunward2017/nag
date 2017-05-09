/**=========================================================
 * Module: backfiller.controller.js
 * Handle backfiller elements
 * Created by zppro on 17-5-4.
 =========================================================*/

(function() {
    'use strict';

    angular
        .module('app.backfiller')
        .controller('BackfillerDefaultPickDialogController', BackfillerDefaultPickDialogController)
    ;

    BackfillerDefaultPickDialogController.$inject = ['$scope', 'RouteHelpers'];
    function BackfillerDefaultPickDialogController($scope, helper) {
        var vm = $scope.vm = {};
        var vmh = $scope.vmh = helper.buildVMHelper();

        init();

        function init() {
            vm.pickOne = pickOne;

            vm.translatePath = $scope.ngDialogData.translatePath;
            vm.title = $scope.ngDialogData.title;
            vm.rows = $scope.ngDialogData.rows;
            vm.columns = $scope.ngDialogData.columns;

            vm.page =  {size: 5, no: 1};
        }

        function pickOne(row) {
            $scope.closeThisDialog(row);
        }
    }


})();
