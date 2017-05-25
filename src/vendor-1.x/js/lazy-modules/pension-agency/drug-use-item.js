/**
 * room Created by zsx on 17-4-7.
 * Target:养老机构工作项目
 */

(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('DrugUseItemGridController', DrugUseItemGridController)
        .controller('ElderlyByDrugUseController', ElderlyByDrugUseController)
        .controller('DrugUseItemDetailsController', DrugUseItemDetailsController);


    DrugUseItemGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function DrugUseItemGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;
        vm.onRoomChange = onRoomChange;
        vm.init({ removeDialog: ngDialog });

        vm.yAxisDataPromise = vmh.shareService.tmp('T3009', null, { tenantId: vm.tenantId }).then(function (nodes) {
            return nodes;
        });
        fetchElderly()
        function fetchElderly() {
            vmh.psnService.nursingPlansByRoom(vm.tenantId, ['name', 'sex', 'birthday', 'enter_code', 'nursing_info', 'begin_exit_flow'], ['elderlyId']).then(function (ret) {
                vm.aggrData = ret;
            })
        }
        function onRoomChange() {
            var yAxisDataFlatten = [];
            _.each(vm.yAxisData, function (o) {
                for (var i = 1, len = o.capacity; i <= len; i++) {
                    if (_.contains(o.forbiddens, i)) continue;
                    var trackedKey = o._id + '$' + i;
                    yAxisDataFlatten.push(_.extend({ trackedKey: trackedKey, bed_no: i }, o));
                }
            });
            vm.yAxisDataFlatten = yAxisDataFlatten;
            // console.log('yAxisDataFlatten:',vm.yAxisDataFlatten);
        }
    }

    ElderlyByDrugUseController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function ElderlyByDrugUseController($scope, ngDialog, vmh, vm) {
        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;
        vm.fetchDrugUseItem = fetchDrugUseItem;
        vm.configDrugUseItem = configDrugUseItem;
        vm.addRowIds = addRowIds;
        vm.selectAll = selectAll;
        vm.drugUseItemIds = [];
        vm.removeElderlyDrugUseItem = removeElderlyDrugUseItem;

        var drugUseService = vm.modelNode.services['psn-drugUseItem'];
        init();

        function init() {
            vm.init({ removeDialog: ngDialog });
            vmh.parallel([
                vmh.shareService.d('D1006'),
                vmh.shareService.d('D1008'),
            ]).then(function (results) {
                vm.selectBinding.sex = results[0];
                vm.selectBinding.medical_insurances = results[1];
            });
            vm.medical_historiesPromise = vmh.shareService.d('D1014').then(function (medical_histories) {
                vmh.utils.v.changeProperyName(medical_histories, [{ o: 'value', n: '_id' }]);
                return medical_histories;
            });
            vm.load().then(function () {
                vm.fetchDrugUseItem();
            })
        }
        function fetchDrugUseItem() {
            drugUseService.query({
                elderlyId: vm.model._id,
                tenantId: vm.model.tenantId
            }).$promise.then(function (rows) {
                vm.elderlyDrugUseItems = rows
            });
        }

        function configDrugUseItem(drugUseItem) {
            ngDialog.open({
                template: 'drug-use-item.html',
                controller: 'DrugUseItemDetailsController',
                className: 'ngdialog-theme-default ngdialog-drug-use-item',
                data: {
                    vmh: vmh,
                    moduleTranslatePathRoot: vm.viewTranslatePath(),
                    elderlyId: vm.model._id,
                    elderlyName: vm.model.name,
                    tenantId: vm.model.tenantId,
                    drugUseItem: drugUseItem,
                    fetchDrugUseItem: vm.fetchDrugUseItem
                }
            })
        }

        function addRowIds(r) {
            var id = r._id;
            var index = _.findIndex(vm.drugUseItemIds, function (o) {
                return o == id
            });
            if (r.checked && (index == -1)) {
                vm.drugUseItemIds.push(id);
                // console.log("++",vm.drugUseItemIds);
                return;
            }
            if (index != -1) {
                vm.drugUseItemIds.splice(index, 1);
                // console.log("--",vm.drugUseItemIds)
            }
        }

        function selectAll() {
            vm.drugUseItemIds = [];
            if (vm.all) {
                _.each(vm.elderlyDrugUseItems, function (o) {
                    vm.drugUseItemIds.push(o._id);
                })
            }
        }

        function removeElderlyDrugUseItem() {
            vmh.fetch(vmh.psnService.drugUseItemRemove(vm.model._id, vm.model.tenantId, vm.drugUseItemIds)).then(function (ret) {
                if (ret.success === true) {
                    vmh.alertSuccess(ret.msg, false);
                    vm.fetchDrugUseItem();
                } else {
                    vmh.alertSuccess('保存失败,请重试', false);
                }
            })
        }
    }





    DrugUseItemDetailsController.$inject = ['$scope', 'ngDialog'];

    function DrugUseItemDetailsController($scope, ngDialog) {
        var vm = $scope.vm = {};
        var vmh = $scope.ngDialogData.vmh;
        var drugUseItem = $scope.ngDialogData.drugUseItem;
        var fetchDrugUseItem = $scope.ngDialogData.fetchDrugUseItem

        $scope.utils = vmh.utils.v;
        vm.model = {};
        vm.model.elderlyId = $scope.ngDialogData.elderlyId;
        vm.model.elderly_name = $scope.ngDialogData.elderlyName;
        vm.model.tenantId = $scope.ngDialogData.tenantId;

        vm.selectBinding = {};
        init();

        function init() {
            vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
            vm.viewTranslatePath = function (key) {
                return vm.moduleTranslatePathRoot + '.' + key;
            };

            vm.doSubmit = doSubmit;
            vm.cancel = cancel;
            vm.queryDrugPromise = queryDrug();
            vm.fetchDrugColumnsPromise = [{ label: '药品条码', name: 'barcode', width: 200 }, { label: '药品全称', name: 'full_name', width: 100 }];
            vm.selectDrugForBackFiller = selectDrugForBackFiller;
            vm.initVoiceTemplate = initVoiceTemplate;
            vm.tab1 = { cid: 'contentTab1' };

            vmh.parallel([
                vmh.shareService.d('D0103'),
                vmh.shareService.d('D0104')
            ]).then(function (results) {
                vm.selectBinding.repeatTypes = results[0];
                vm.selectBinding.remindModes = results[1];
            });

            if (drugUseItem) {
                vm.readonly = true;
                _.defaults(vm.model, drugUseItem);
                if (drugUseItem.repeat_values && drugUseItem.repeat_values.length > 0) {
                    vm.repeat_values = drugUseItem.repeat_values.join();
                }
            }
        }



        function queryDrug(keyword) {
            return vmh.fetch(vmh.psnService.queryDrug(vm.model.tenantId, keyword, {}, 'barcode full_name'));
        }

        function selectDrugForBackFiller(row) {
            if (row) {
                vm.model.drugId = row.id;
                vm.model.barcode = row.barcode;
                vm.model.name = row.full_name;
            }
        }

        function doSubmit() {
            vm.model.repeat_values = vm.repeat_values ? vm.repeat_values.split(",") : [];
            if (vm.model.voice_template) {
                var reg = /\${[^}]+}/g;
                var arr = vm.model.voice_template.match(reg);
                // console.log('arr', arr);
                var isVerify = false;
                if (arr && arr.length > 0) {
                    for (var i = 0, len = arr.length; i < len; i++) {

                        if (arr[i] == "${药品名称}" || arr[i] == "${服用方法}" || arr[i] == "${老人姓名}") {
                            continue;
                        } else {
                            isVerify = true;
                            break;
                        }
                    }
                    if (isVerify) {
                        vmh.alertWarning(vm.viewTranslatePath('VOICE_TEPLATE_ERROR'), true);
                        return;
                    }
                }
            }
            if ($scope.theForm.$valid) {
                var data = {
                    elderlyId: vm.model.elderlyId,
                    elderly_name: vm.model.elderly_name,
                    drugId: vm.model.drugId,
                    barcode: vm.model.barcode,
                    name: vm.model.name,
                    description: vm.model.description,
                    duration: vm.model.duration,
                    repeat_type: vm.model.repeat_type,
                    repeat_values: vm.model.repeat_values,
                    repeat_start: vm.model.repeat_start,
                    confirm_flag: vm.model.confirm_flag,
                    remind_flag: vm.model.remind_flag,
                    remind_mode: vm.model.remind_mode,
                    fee_flag: vm.model.fee_flag,
                    fee: vm.model.fee,
                    remind_times: vm.model.remind_times,
                    voice_template: vm.model.voice_template,
                    tenantId: vm.model.tenantId,
                }

                vmh.psnService.drugUseItemSave(data).then(function (ret) {
                    if (ret.success === true) {
                        ngDialog.close("#drug-use-item.html");
                        vmh.alertSuccess(ret.msg, false);
                        fetchDrugUseItem();
                    } else {
                        vmh.alertSuccess('保存失败,请重试', false);
                    }
                })
            }
        }

        function cancel() {
            ngDialog.close("#drug-use-item.html");
        }
        function initVoiceTemplate() {
            if (vm.model.repeat_type == "A0001") {
                vm.model.voice_template = '';
                vm.repeat_values = '';
                vm.model.repeat_start = '*';
                vm.switch = true;
                vm.model.remind_flag = false;
            } else {
                vm.model.voice_template = "${老人姓名},您该服用${药品名称}了,请您依照${服用方法}服用哦";
                vm.repeat_values = '';
                vm.model.repeat_start = '';
                vm.switch = false;
            }
        }
    }

})();
