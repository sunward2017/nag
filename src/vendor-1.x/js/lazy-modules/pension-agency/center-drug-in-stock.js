/**
 * Created by hcl on 17-9-8.
 */
(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('CenterDrugInstockGridController', CenterDrugInstockGridController)
        .controller('CenterDrugInstockDetailsController', CenterDrugInstockDetailsController)
        .controller('StockInDrugPickerController', StockInDrugPickerController)
    ;

    CenterDrugInstockGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function CenterDrugInstockGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.query();
        }
    }

    CenterDrugInstockDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function CenterDrugInstockDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;

        init();

        function init() {

            vm.init({removeDialog: ngDialog});
            vm.now = moment().format('YYYY-MM-DD');

            vm.doSubmit = doSubmit;
            vm.addDrugInStock = addDrugInStock;
            vm.editDrugInStock = editDrugInStock;
            vm.removeDrugInStock = removeDrugInStock;
            vm.selectAll = selectAll;
            vm.checkDrugsListChanged = checkDrugsListChanged;

            vm.tab1 = {cid: 'contentTab1'};

            vm.drugs_to_remove = [];
            vmh.parallel([
                vmh.shareService.d('D3014'),
                vmh.shareService.d('D3026'),
                vmh.shareService.d('D3027')
            ]).then(function (results) {
                vm.selectBinding.types = _.filter(results[0], function (o) {
                    return o.value.substr(0, 1) == 'A'&&o.value !='A0003'&& o.value !='A0100';
                });
                vm.selectBinding.mini_units = results[1];
                vm.selectBinding.modes = results[2];

                vm.load().then(function () {
                    // console.log('detail load vm.model:',vm.model);
                    if (vm.model.id) {
                        vmh.psnService.drugStockInRecordCheck(vm.tenantId, vm.model.id).then(function (ret) {
                            vm.drugsStockStatus = ret;
                        });
                    }
                });
            })

        }

        function addDrugInStock() {
            editDrugInStock();
        }

        function editDrugInStock(drug) {
            ngDialog.open({
                template: 'in-stock-add-drug.html',
                controller: 'StockInDrugPickerController',
                className: 'ngdialog-theme-default ngdialog-stock-in-drug-picker',
                data: {
                    vmh: vmh,
                    moduleTranslatePathRoot: vm.viewTranslatePath(),
                    mini_units: vm.selectBinding.mini_units,
                    tenantId: vm.model.tenantId,
                    drug: drug
                }
            }).closePromise.then(function (ret) {
                if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
                    if (vm._action_ == 'add') {
                        syncToDrugListWhenAdd(ret.value);
                    } else {
                        syncToDrugListWhenEdit(ret.value);
                    }
                }
            });
            // console.log('edit or add drug?:',drug);
        }

        function selectAll() {
            var drugs = vm.model.drugs;
            for (var i = 0, len = drugs.length; i < len; i++) {
                drugs[i].checked = vm.all;
            }
        }

        function removeDrugInStock() {
            var drugs = vm.model.drugs;
            var selectedDrugs = _.filter(drugs, function (o) {
                return o.checked;
            });
            if (selectedDrugs.length == 0) {
                vmh.alertWarning('notification.SELECT-NONE-WARNING', true);
                return;
            }

            _.each(selectedDrugs, function (drug) {
                if (drug.id) {
                    drug.to_action = 'r';
                    vm.drugs_to_remove.push(drug);
                }
                var index = _.indexOf(drugs, drug);
                if (index != -1) {
                    drugs.splice(index, 1);
                }
            });
        }

        function checkDrugsListChanged() {
            return vm.drugs_to_remove.length > 0 || _.filter(vm.model.drugs, function (o) {
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
                if (drugExist.id) {
                    drugExist.to_action = 'm';
                }
            } else {
                drug.to_action = 'a';
                vm.model.drugs.push(drug);
            }
        }



        function doSubmit() {
            // console.log('in-stock vm.model:',vm.model);
            if ($scope.theForm.$valid) {
                if (vm._action_ == 'add') {
                    vmh.psnService.drugInStock(vm.tenantId, vm.operated_by, vm.model).then(function () {
                        vmh.alertSuccess();
                        vm.returnBack();
                    });
                } else {
                    vmh.psnService.updateDrugsInStock(vm.tenantId, vm.model._id, vm.operated_by, vm.model, vm.drugs_to_remove).then(function () {
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

    StockInDrugPickerController.$inject = ['$scope', 'ngDialog'];

    function StockInDrugPickerController($scope, ngDialog) {
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

            vm.openDP = openDP;
            vm.doSubmit = doSubmit;
            vm.fetchDrugColumnsPromise = [
                {label: '药品条码', name: 'barcode', width: 150},
                {label: '药品全称', name: 'full_name', width: 300},
                {label: '药品简称', name: 'short_name', width: 100},
                {label: '药品别名', name: 'alias', width: 100},
                {label: '生产厂商', name: 'vender', width: 300},
                {label: '剂型', name: 'dosage_form', width: 80},
                {label: '服用说明', name: 'usage'}
            ];
            vm.searchForBackFiller = searchForBackFiller;
            vm.selectDrugForBackFiller = selectDrugForBackFiller;

            vm.tab1 = {cid: 'contentTab1'};
            vm.selectBinding = {};
            vm.selectBinding.mini_units = $scope.ngDialogData.mini_units;
            vm.model = $scope.ngDialogData.drug || {};
            // console.log('$scope.ngDialogData.drug:',$scope.ngDialogData.drug);


            if (vm.model.drugId) {
                // 修改
                vm.readonly = true;
            } else {
                vm.queryDrugPromise = queryDrug('');
            }
        }

        function queryDrug(keyword) {
            // 过滤已选的药,此处不在弹出列表中过滤,因为业务上可以在不同的用药模版中选择相同的药
            return vmh.fetch(vmh.psnService.queryDrug(vm.tenantId, vm.elderlyId, keyword, null, 'barcode full_name short_name dosage_form alias vender'));
        }

        function searchForBackFiller(keyword) {
            console.log('keyword:', keyword);
            vm.queryDrugPromise = queryDrug(keyword);
        }

        function selectDrugForBackFiller(row) {
            if (row) {
                vm.model.drugId = row.id;
                vm.model.drug_name = row.short_name || row.full_name;
            }
        }

        function openDP($event, length, index) {
            $event.preventDefault();
            $event.stopPropagation();
            if (length == undefined) {
                vm.openedDP = true;
            }
            else {
                if (!vm.openedDP) {
                    vm.openedDP = _.map(_.range(length), function () {
                        return false;
                    });

                }
                vm.openedDP[index] = true;
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