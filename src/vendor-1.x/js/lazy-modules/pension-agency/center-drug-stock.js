/**
 * Created by hcl on 17-9-8.
 */
(function() {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('CenterDrugStockController',CenterDrugStockController)
        .controller('AllotDrugPickerController',AllotDrugPickerController)
    ;

    CenterDrugStockController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function  CenterDrugStockController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.allotDrugInCenterStock = allotDrugInCenterStock;
            vm.query();

            vmh.parallel([
                vmh.shareService.d('D1006'),
                vmh.shareService.d('D3026')
            ]).then(function (results) {
                vm.selectBinding.sex =results[0];
                vm.selectBinding.mini_units = results[1];
            })

        }



        function allotDrugInCenterStock(drug) {
            ngDialog.open({
                template: 'out-stock-add-drug.html',
                controller: 'AllotDrugPickerController',
                className: 'ngdialog-theme-default ngdialog-stock-in-drug-picker',
                data: {
                    vmh: vmh,
                    moduleTranslatePathRoot: vm.viewTranslatePath(),
                    mini_units: vm.selectBinding.mini_units,
                    sex: vm.selectBinding.sex,
                    tenantId: vm.tenantId,
                    drug: drug
                }
            }).closePromise.then(function (ret) {
                if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
                    console.log('确定调拨.......ret.value:',ret.value);
                    vmh.psnService.centerDrugOutStock(vm.tenantId, vm.operated_by, ret.value).then(function () {
                        vmh.alertSuccess();
                        vm.query();
                    });
                }
            });
            console.log('edit or add drug?:',drug);
        }
    }

    AllotDrugPickerController.$inject = ['$scope', 'ngDialog'];
    
    function AllotDrugPickerController($scope, ngDialog) {
        var vm = $scope.vm = {};
        var vmh = $scope.ngDialogData.vmh;
        $scope.utils = vmh.utils.v;

        init();

        function init() {
            vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
            vm.viewTranslatePath = function (key) {
                return vm.moduleTranslatePathRoot + '.' + key;
            };
            vm.tenantId = $scope.ngDialogData.tenantId;

            vm.doSubmit = doSubmit;
            vm.fetchElderlyColumnsPromise = [
                {label: '入院号', name: 'enter_code', width: 100, align: 'center'},
                {label: '姓名', name: 'name', width: 80},
                {label: '性别', name: 'sex', width: 60, align: 'center', filter: 'diFilter', format: $scope.ngDialogData.sex},
                {label: '年龄', name: 'birthday', width: 60, align: 'center', filter: 'calcAge'},
                {label: '房间床位', name: 'room_summary', width: 300},
                {label: '照护情况', name: 'nursing_info', width: 300}
            ];
            vm.searchForBackFiller = searchForBackFiller;
            vm.selectElderlyForBackFiller = selectElderlyForBackFiller;

            vm.tab1 = {cid: 'contentTab1'};
            vm.selectBinding = {};
            vm.selectBinding.mini_units = $scope.ngDialogData.mini_units;
            vm.stock = $scope.ngDialogData.drug ;
            vm.model={drug:{drugId:vm.stock.drugId,drug_name:vm.stock.drug_name,_id:vm.stock._id,expire_in:vm.stock.expire_in},type:"A0100",mode:"A0003"};
            vm.model.drug.mini_unit=vm.stock.mini_unit;

            vm.queryElderlyPromise = queryElderly();
        }

        function queryElderly(keyword) {
            return vmh.fetch(vmh.psnService.queryElderly(vm.tenantId, keyword, {
                live_in_flag: true,
                begin_exit_flow: {'$in': [false, undefined]}
            }, 'name enter_code sex birthday room_summary nursing_info'));
        }

        function searchForBackFiller(keyword) {
            console.log('keyword:', keyword);
            vm.queryElderlyPromise = queryElderly(keyword);
        }

        function selectElderlyForBackFiller(row) {
            if (row) {
                vm.model.enter_code = row.enter_code;
                vm.model.elderlyId = row.id;
                vm.model.elderly_name = row.name;
            }
        }

        function doSubmit() {
            if (vm.alertMessage) {
                vmh.alertWarning(vm.alertMessage, true);
                return;
            }
            if ($scope.theForm.$valid) {
                $scope.closeThisDialog(vm.model);
            }

        }
    }

})();