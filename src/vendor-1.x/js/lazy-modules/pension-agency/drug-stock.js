// Created by yrm on 17-3-28. modified by zppro 2017-6-12
(function() {
  'use strict';

  angular
    .module('subsystem.pension-agency')
    .controller('DrugStockGridController', DrugStockGridController)
    .controller('DrugStockDetailsController', DrugStockDetailsController)
  ;

  DrugStockGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function DrugStockGridController($scope, ngDialog, vmh, vm) {

    $scope.vm = vm;
    $scope.utils = vmh.utils.g;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});

      vm.onRoomChange = onRoomChange;

      vm.roomTreeDataPromise = vmh.shareService.tmp('T3009', null, {tenantId: vm.tenantId});
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
      fetchElderly(_.map(vm.roomData, function (o) {
        return o._id
      }));
    }
  }

  DrugStockDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];
  function DrugStockDetailsController($scope, ngDialog, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});
      vm.elderlyId = vm._id_;

      vm.tab1 = {cid: 'contentTab1'};
      vm.editDrugStockItem = editDrugStockItem;
      vm.saveDrugStockItem = saveDrugStockItem;
      vm.cancelDrugStockItem = cancelDrugStockItem;
      vm.backoutAllotDrug = backoutAllotDrug;

      vmh.parallel([
        vmh.shareService.d('D1006'),
        vmh.shareService.d('D1008'),
        vmh.shareService.d('D3026')
      ]).then(function (results) {
        vm.selectBinding.sex = results[0];
        vm.selectBinding.medical_insurances = results[1];
        vm.selectBinding.mini_units = results[2];
      });

      vm.load().then(function () {
        fetchDrugStock();
      });
    }

    function fetchDrugStock() {
      vmh.psnService.elderlyDrugStockList(vm.tenantId, vm.elderlyId).then(function (rows) {
        vm.elderlyDrugStockList = rows;
      }).then(function () {
        vmh.psnService.allotdrugStockInRecordCheck(vm.tenantId, vm.elderlyId).then(function (ret) {
          vm.drugsStockStatus = ret;
          console.log('drugsStockStatus ret:', ret);
        });
      });
    }

    function editDrugStockItem(row) {
      vm.rawRow = angular.copy(row);
      row.$editing = true;
    }

    function saveDrugStockItem(row) {
      vm.rawRow = null;
      row.$editing = false;
      console.log(vm.tenantId, vm.elderlyId, row.id, row.mini_unit, vm.operated_by);

      vmh.blocking(vmh.psnService.updateMiniUnitOfDrugStockItem(vm.tenantId, vm.elderlyId, row.id, row.mini_unit, vm.operated_by)).then(function(){
        vmh.alertSuccess();
      });
    }

    function cancelDrugStockItem(row) {
      _.extend(row, vm.rawRow);
      row.$editing = false;
    }

    function backoutAllotDrug(drugStockRow) {
      ngDialog.openConfirm({
        template: 'normalConfirmDialog.html',
        className: 'ngdialog-theme-default',
        scope: $scope
      }).then(function () {
        // console.log('撤销移库.......drugStockRow:',drugStockRow);
        vmh.q.all([vmh.translate('notification.NORMAL-SUCCESS'), vmh.psnService.backoutAllotDrug(vm.tenantId, vm.operated_by, drugStockRow)]).then(function (ret) {
          vmh.notify.alert('<div class="text-center"><em class="fa fa-check"></em> ' + ret[0] + '</div>', 'success');
          fetchDrugStock();
        });
      });
    }

  }

})();