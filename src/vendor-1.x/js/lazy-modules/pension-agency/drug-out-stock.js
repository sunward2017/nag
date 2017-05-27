/**
 *  Created by yrm on 17-3-31.
 */

(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('DrugOutStockGridController', DrugOutStockGridController)
        .controller('DrugOutStockDetailsController', DrugOutStockDetailsController)
        ;

    DrugOutStockGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function DrugOutStockGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({ removeDialog: ngDialog });
            vm.drugOutStockInvalid = drugOutStockInvalid;
            vm.query();
        }

        function drugOutStockInvalid(row) {
            // console.log("==============================");
            // console.log(o);
            // vmh.psnService.drugOutStockInvalid(o);
            if (row.valid_flag === false) return;
            vm.removeDialog.openConfirm({
                template: 'normalConfirmDialog.html',
                className: 'ngdialog-theme-default'
            }).then(function () {
                vmh.psnService.drugOutStockInvalid(row._id).then(function () {
                    vm.query();
                });
            })
        }
    }
    DrugOutStockDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function DrugOutStockDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;

        init();

        function init() {
            vm.init({ removeDialog: ngDialog });
            vm.doSubmit = doSubmit;
            vm.searchElderlyForBackFiller = searchElderlyForBackFiller;
            vm.queryElderlyPromise = queryElderly();
            vm.searchDrugForBackFiller = searchDrugForBackFiller;
            vm.queryDrugPromise = queryDrug();
            vm.fetchDrugColumnsPromise = [
                { label: '药品条码', name: 'barcode', width: 150 },
                { label: '药品全称', name: 'full_name', width: 300 },
                { label: '药品简称', name: 'short_name', width: 100 },
                { label: '药品别名', name: 'alias', width: 100 },
                { label: '生产厂商', name: 'vender', width: 300 },
                { label: '剂型', name: 'dosage_form', width: 80 },
                { label: '服用说明', name: 'usage'}
            ];
            vm.selectElerlyForBackFiller = selectElerlyForBackFiller;
            vm.selectDrugForBackFiller = selectDrugForBackFiller;
            vm.tab1 = { cid: 'contentTab1' };

            vmh.parallel([
                vmh.shareService.d('D3013'),
                vmh.shareService.d('D1006')
            ]).then(function (results) {
                vm.selectBinding.unit = results[0];

                vm.fetchElderlyColumnsPromise = [
                    {label: '入院号',name: 'enter_code',width: 100, align:'center'},
                    {label: '姓名',name: 'name',width: 80},
                    {label: '性别',name: 'sex',width: 60, align:'center', filter: 'diFilter', format: results[1]},
                    {label: '年龄',name: 'birthday',width: 60, align:'center', filter: 'calcAge'},
                    {label: '房间床位',name: 'room_summary',width: 300},
                    {label: '照护情况',name: 'nursing_info',width: 300},
                    {label: '',name: ''}
                ];
            })

            vm.typePromise = vmh.shareService.d('D3014').then(function (types) {
                vmh.utils.v.changeProperyName(types, [{ o: 'value', n: '_id' }]);
                return types;
            });

            vm.load().then(function () {
                if (vm.model.elderlyId) {
                    vm.selectedElderly = { _id: vm.model.elderlyId, name: vm.model.elderly_name };
                    vm.selectedDrug = { _id: vm.model.drugId, drug_no: vm.model.drug_no };
                }
            });

        }

        function queryElderly(keyword) {
            return vmh.fetch(vmh.psnService.queryElderly(vm.tenantId, keyword, {
                live_in_flag: true,
                begin_exit_flow: {'$in':[false,undefined]}
            }, 'name enter_code sex birthday room_summary nursing_info'));
        }

        function searchElderlyForBackFiller (keyword) {
            vm.queryElderlyPromise = queryElderly(keyword);
        }
        
        function selectDrugForBackFiller(row) {
            if (row) {
                vm.model.drugId = row.id;
                vm.model.drug_no = row.drug_no;
                vm.model.drug_full_name = row.full_name;
            }
        }

        function selectElerlyForBackFiller(row) {
            if (row) {
                vm.model.enter_code = row.enter_code;
                vm.model.elderlyId = row.id;
                vm.model.elderly_name = row.name;
            }
        }

        function queryDrug(keyword) {
            return vmh.fetch(vmh.psnService.queryDrug(vm.tenantId, keyword, {}, 'barcode full_name short_name dosage_form alias vender'));
        }

        function searchDrugForBackFiller (keyword) {
            vm.queryDrugPromise = queryDrug(keyword);
        }

        function doSubmit() {
            if ($scope.theForm.$valid) {
                vmh.psnService.drugOutStock(vm.tenantId, vm.model.elderlyId, vm.model.drugId, vm.model.in_out_quantity, vm.model.type, vm.model.unit).then(function (ret) {
                    vm.returnBack();
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