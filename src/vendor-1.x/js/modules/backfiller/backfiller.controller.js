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

    BackfillerDefaultPickDialogController.$inject = ['$scope', 'vmh'];
    function BackfillerDefaultPickDialogController($scope, vmh) {
        var vm = $scope.vm = {};

        init();

        function init() {
            vm.pickOne = pickOne;
            vm.search = $scope.ngDialogData.search;
            vm.translatePath = $scope.ngDialogData.translatePath;
            vm.title = $scope.ngDialogData.title;
            vm.rows = $scope.ngDialogData.rows;
            vm.columns = $scope.ngDialogData.columns;
            vm.page = $scope.ngDialogData.page || {size: 5, no: 1};

            $scope.ngDialogData.notify.reloadData = reloadData;
        }

        function pickOne(row) {
            $scope.closeThisDialog(row);
        }

        function reloadData(rows) {
            vm.rows = rows;
        }
    }


})();
