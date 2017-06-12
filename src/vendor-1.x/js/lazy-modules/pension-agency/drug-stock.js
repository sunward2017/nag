// Created by yrm on 17-3-28. modified by zppro 2017-6-12
(function() {
    'use strict';
    
    angular
        .module('subsystem.pension-agency')
        .controller('DrugStockGridController',DrugStockGridController)
        .controller('DrugStockDetailsController',DrugStockDetailsController)
    ;

    DrugStockGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function  DrugStockGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});

            vm.onRoomChange = onRoomChange;

            vm.roomTreeDataPromise = vmh.shareService.tmp('T3009', null, { tenantId: vm.tenantId });
        }

        function fetchElderly(roomIds) {
            vmh.shareService.tmp('T3001/psn-elderly', 'name sex birthday enter_code room_summary nursing_info',
                {
                    tenantId: vm.tenantId, status: 1,
                    live_in_flag: true,
                    begin_exit_flow: {$in: [false, undefined]},
                    "room_value.roomId": {$in: roomIds}
                }
            ).then(function (nodes) {
                vm.elderlys = nodes;
            });
        }
        function onRoomChange() {
            fetchElderly(_.map(vm.roomData, function(o){return o._id}));
        }
    }

    DrugStockDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];
    function  DrugStockDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.elderlyId = vm._id_ ;

            vm.tab1 = {cid: 'contentTab1'};

            vmh.parallel([
                vmh.shareService.d('D1006'),
                vmh.shareService.d('D1008'),
            ]).then(function (results) {
                vm.selectBinding.sex = results[0];
                vm.selectBinding.medical_insurances = results[1];
            });

            vm.load().then(function () {
                fetchDrugStock();
            });
        }

        function fetchDrugStock() {
            vmh.psnService.drugStockList(vm.elderlyId, vm.tenantId).then(function(rows){
                vm.elderlyStockList = rows;
            });
        }
    }

})();