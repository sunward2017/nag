/**
 *  Created by yrm on 17-3-31.
 */

(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('DrugOutStockGridController', DrugOutStockGridController)
        .controller('DrugOutStockDetailsController', DrugOutStockDetailsController)
        .controller('StockOutDrugPickerController', StockOutDrugPickerController)
        ;

    DrugOutStockGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function DrugOutStockGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({ removeDialog: ngDialog });
            vm.query();
        }
    }
    
    DrugOutStockDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function DrugOutStockDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;

        init();

        function init() {

            vm.init({ removeDialog: ngDialog });
            vm.now = moment().format('YYYY-MM-DD');

            vm.doSubmit = doSubmit;
            vm.addDrugOutStock = addDrugOutStock;
            vm.editDrugOutStock = editDrugOutStock;
            vm.removeDrugOutStock = removeDrugOutStock;
            vm.selectAll = selectAll;
            vm.checkDrugsListChanged = checkDrugsListChanged;
            vm.importFromDrugUseItem = importFromDrugUseItem;

            vm.searchElderlyForBackFiller = searchElderlyForBackFiller;
            vm.selectElderlyForBackFiller = selectElderlyForBackFiller;
            vm.queryElderlyPromise = queryElderly();

            vm.tab1 = { cid: 'contentTab1' };

            vm.drugs_to_remove = [];

            vmh.parallel([
                vmh.shareService.d('D1006'),
                vmh.shareService.d('D3014'),
                vmh.shareService.d('D3026'),
                vmh.shareService.d('D3027')
            ]).then(function (results) {

                vm.fetchElderlyColumnsPromise = [
                    {label: '入院号',name: 'enter_code',width: 100, align:'center'},
                    {label: '姓名',name: 'name',width: 80},
                    {label: '性别',name: 'sex',width: 60, align:'center', filter: 'diFilter', format: results[0]},
                    {label: '年龄',name: 'birthday',width: 60, align:'center', filter: 'calcAge'},
                    {label: '房间床位',name: 'room_summary',width: 300},
                    {label: '照护情况',name: 'nursing_info',width: 300},
                    {label: '',name: ''}
                ];

                vm.selectBinding.types = _.filter(results[1], function(o){ return o.value.substr(0,1) == 'B';});
                vm.selectBinding.mini_units = results[2];
                vm.selectBinding.modes =  results[3];

                vm.load().then(function () {
                    console.log('vm.model.drugs:', vm.model.drugs);
                    if (vm.model.elderlyId) {
                        vm.selectedElderly = { _id: vm.model.elderlyId, name: vm.model.elderly_name };
                    }

                    if(vm.model.id) {
                        // vmh.psnService.drugStockOutRecordCheck(vm.tenantId, vm.model.id).then(function(ret) {
                        //     vm.drugsStockStatus = ret;
                        // });
                    }
                });
            })

        }

        function addDrugOutStock() {
            editDrugOutStock();
        }

        function editDrugOutStock(drug) {
            if(!vm.model.elderlyId){
                vmh.alertWarning(vm.viewTranslatePath('WARNING-NOT-SELECT-ELDERLY'), true);
                return;
            }
            ngDialog.open({
                template: 'out-stock-add-drug.html',
                controller: 'StockOutDrugPickerController',
                className: 'ngdialog-theme-default ngdialog-stock-out-drug-picker',
                data: {
                    vmh: vmh,
                    moduleTranslatePathRoot: vm.viewTranslatePath(),
                    mini_units: vm.selectBinding.mini_units,
                    tenantId: vm.tenantId,
                    elderlyId: vm.model.elderlyId,
                    drug: drug
                }
            }).closePromise.then(function (ret) {
                if(ret.value!='$document' && ret.value!='$closeButton' && ret.value!='$escape' ) {
                    if (vm._action_ == 'add') {
                        syncToDrugListWhenAdd(ret.value);
                    } else {
                        syncToDrugListWhenEdit(ret.value);
                    }
                }
            });
        }

        function selectAll() {
            var drugs = vm.model.drugs;
            for(var i=0,len=drugs.length;i<len;i++) {
                drugs[i].checked = vm.all;
            }
        }

        function removeDrugOutStock() {
            console.log('removeDrugInStock:');
            var drugs = vm.model.drugs;
            var selectedDrugs = _.filter(drugs, function (o) {
                return o.checked;
            });
            if (selectedDrugs.length == 0) {
                vmh.alertWarning('notification.SELECT-NONE-WARNING', true);
                return;
            }

            _.each(selectedDrugs, function (drug) {
                console.log('drug:', drug);
                if(drug.id) {
                    drug.to_action = 'r';
                    vm.drugs_to_remove.push(drug);
                }
                var index = _.indexOf(drugs, drug);
                if (index != -1) {
                    drugs.splice(index, 1);
                }
            });
        }
        
        function importFromDrugUseItem() {
            if(!vm.model.elderlyId){
                vmh.alertWarning(vm.viewTranslatePath('WARNING-NOT-SELECT-ELDERLY'), true);
                return;
            }
            vm.modelNode.services['psn-drugUseItem'].query({
                status: 1,
                elderlyId: vm.model.elderlyId,
                repeat_type:'A0003',
                stop_flag:false,
                tenantId: vm.model.tenantId
            }, 'elderly_name drugId quantity unit repeat_type repeat_values', null, [{
                path: 'drugId',
                select: '_id full_name short_name mini_unit'
            }]).$promise.then(function (rows) {
                console.log('elderlyDrugUseItems rows:',rows);
                var repeat_value,drug_name;
                _.each(rows,function (o) {
                    repeat_value = o.repeat_values.length>1? o.repeat_values.length:1;
                    console.log('repeat_value:',repeat_value);
                    drug_name = o.drugId.short_name || o.drugId.full_name ;
                    syncToDrugListWhenAdd({drugId:o.drugId._id,drug_name:drug_name,mini_unit:o.drugId.mini_unit,quantity:repeat_value * o.quantity});
                });
            });

        }

        function checkDrugsListChanged () {
            return vm.drugs_to_remove.length > 0 || _.filter(vm.model.drugs, function(o){
                    return !!o.to_action;
                }).length > 0;
        }

        function syncToDrugListWhenAdd(drug) {
            var drugs = vm.model.drugs;
            var drugExist = _.find(drugs, function (o) {
                return o.drugId == drug.drugId;
            });
            if (!drugExist) {
                vm.model.drugs.push(drug);
            }
        }
        function syncToDrugListWhenEdit(drug) {
            var drugs = vm.model.drugs;
            var drugExist = _.find(drugs, function (o) {
                return o.drugId == drug.drugId;
            });
            if (drugExist) {
                if(drugExist.id){
                    drugExist.to_action = 'm';
                }
            } else {
                drug.to_action = 'a';
                vm.model.drugs.push(drug);
            }
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

        function selectElderlyForBackFiller(row) {
            if (row) {
                vm.model.enter_code = row.enter_code;
                vm.model.elderlyId = row.id;
                vm.model.elderly_name = row.name;
            }
        }

        function doSubmit() {
            if ($scope.theForm.$valid) {
                if (vm._action_ == 'add') {
                    vmh.psnService.drugOutStock(vm.tenantId, vm.operated_by, vm.model).then(function () {
                        vmh.alertSuccess();
                        vm.returnBack();
                    });
                } else {
                    vmh.psnService.updateDrugsOutStock(vm.tenantId, vm.model._id, vm.operated_by, vm.model, vm.drugs_to_remove).then(function () {
                        vmh.alertSuccess();
                        vm.returnBack();
                    });
                }
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }
    }

    StockOutDrugPickerController.$inject = ['$scope', 'ngDialog'];

    function StockOutDrugPickerController($scope, ngDialog) {
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
            vm.elderlyId = $scope.ngDialogData.elderlyId;

            vm.doSubmit = doSubmit;
            vm.fetchElderlyDrugStockColumnsPromise = [
                { label: '药品条码', name: 'drug.barcode', width: 150 },
                { label: '药品全称', name: 'drug.full_name', width: 300 },
                { label: '库存', name: 'total', width: 80, align: 'right' },
                { label: '单位', name: 'unit_name', width:  60 },
                { label: '药品简称', name: 'drug.short_name', width: 100 },
                { label: '药品别名', name: 'drug.alias', width: 100 },
                { label: '剂型', name: 'drug.dosage_form', width: 80 },
                { label: '生产厂商', name: 'drug.vender', width: 300 },
                { label: '服用说明', name: 'drug.usage', width: 400},
                { label: '', name: ''}
            ];
            vm.searchForBackFiller = searchForBackFiller;
            vm.selectElderlyDrugStockForBackFiller = selectElderlyDrugStockForBackFiller;

            vm.tab1 = { cid: 'contentTab1' };
            vm.selectBinding = {};
            vm.stock = {total:0, unit_name: '--'};
            vm.selectBinding.mini_units = $scope.ngDialogData.mini_units;
            vm.model = $scope.ngDialogData.drug || {};


            if (vm.model.drugId) {
                // 修改
                
                //读取选中药品库存
                vmh.psnService.elderlyDrugStockSummary(vm.tenantId, vm.elderlyId, vm.model.drugId).then(function(ret){
                    vm.stock = ret;
                });
                
                vm.readonly = true;
            } else {
                vm.queryElderlyDrugStockPromise = queryElderlyDrugStock('');
            }
            console.log('StockOutDrugPickerController finished ---------------------------------------')
        }

        function queryElderlyDrugStock(keyword) {
            return vmh.fetch(vmh.psnService.queryElderlyDrugStock(vm.tenantId, vm.elderlyId, keyword));
        }

        function searchForBackFiller (keyword) {
            console.log('keyword:', keyword);
            vm.queryElderlyDrugStockPromise = queryElderlyDrugStock(keyword);
        }

        function selectElderlyDrugStockForBackFiller(row) {
            if (row) {
                vm.model.drugId = row.drugId;
                vm.model.drug_name = row["drug.short_name"] || row["drug.full_name"];
                vm.model.mini_unit = row.unit;
                vm.stock.total = row.total;
                vm.stock.unit_name = row.unit_name;
                vm.stock.unit = row.unit;
                console.log('selectElderlyDrugStockForBackFiller: ',vm.model)
            }
        }

        function doSubmit() {
            if(vm.alertMessage) {
                vmh.alertWarning(vm.alertMessage, true);
                return;
            }
            if ($scope.theForm.$valid) {
                $scope.closeThisDialog(vm.model);
            }

        }
    }

})();