/**
 * district Created by zppro on 17-3-17.
 * Target:养老机构 模版计划
 */

(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('NursingPlanController', NursingPlanController)
        .controller('WorkItemCustomController', WorkItemCustomController)
        ;

    NursingPlanController.$inject = ['$scope', 'ngDialog', 'vmh', 'instanceVM'];

    function NursingPlanController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;

        init();

        function init() {

            vm.init({ removeDialog: ngDialog });

            vm.onRoomChange = onRoomChange;
            vm.addElderlyNursingLevel = addElderlyNursingLevel;
            vm.editElderlyNursingLevel = editElderlyNursingLevel;
            vm.saveElderlyNursingLevel = saveElderlyNursingLevel;
            vm.cancelElderlyEditing = cancelElderlyEditing;
            vm.switchReadonlyWorkItems = switchReadonlyWorkItems;
            vm.switchReadonlyDrugUseItems = switchReadonlyDrugUseItems;
            vm.workItemChecked = workItemChecked;
            vm.drugUseItemChecked = drugUseItemChecked;
            vm.addNursingPlanRemark = addNursingPlanRemark;
            vm.editNursingPlanRemark = editNursingPlanRemark;
            vm.saveNursingPlanRemark = saveNursingPlanRemark;
            vm.cancelNursingPlanRemark = cancelNursingPlanRemark;
            vm.generateNursingRecord = generateNursingRecord;
            vm.customizedWorkItem = customizedWorkItem;

            vm.tab1 = { cid: 'contentTab1' };
            vm.$editings = {};

            vmh.parallel([
                vmh.clientData.getJson('nursingPlanAxis'),
                vmh.shareService.tmp('T3001/psn-nursingLevel', 'name short_name', null),
                vmh.shareService.tmp('T3001/psn-workItem', 'name nursingLevelId', null),
                vmh.shareService.tmp('T3001/psn-drugUseItem', 'drugId name elderlyId', null),

            ]).then(function (results) {
                vm.xAxisData = results[0];
                // console.log('nursingPlanAxis:', vm.xAxisData);

                vm.selectBinding.nursingLevels = _.map(results[1], function (row) {
                    return { id: row._id, name: row.name, short_name: row.short_name }
                });
                var nursingLevelMap = {};
                _.reduce(vm.selectBinding.nursingLevels, function (o, nursingLevel) {
                    o[nursingLevel.id] = nursingLevel.short_name;
                    return o;
                }, nursingLevelMap);
                vm.nursingLevelMap = nursingLevelMap;

                var workItems = _.map(results[2], function (row) {
                    return { id: row._id, name: row.name, nursingLevelId: row.nursingLevelId }
                });
                var workItemMap = {};
                for (var i = 0, len = vm.selectBinding.nursingLevels.length; i < len; i++) {
                    var nursingLevelId = vm.selectBinding.nursingLevels[i].id;
                    workItemMap[nursingLevelId] = _.filter(workItems, function (o) {
                        return o.nursingLevelId === nursingLevelId;
                    });
                }
                var drugUseItems = _.map(results[3], function (row) {
                    return { id: row._id, name: row.name, drugId: row.drugId, elderlyId: row.elderlyId }
                });
                var drugUseItemMap = {};
                var drugUseItemMap = {},
                    elderlys = [];
                _.each(drugUseItems, function (v) {
                    elderlys.push(v.elderlyId);
                })
                elderlys = _.uniq(elderlys);

                for (var j = 0, l = elderlys.length; j < l; j++) {
                    var elderlyId = elderlys[j];
                    drugUseItemMap[elderlyId] = _.filter(drugUseItems, function (o) {
                        return o.elderlyId === elderlyId;
                    });
                }
                vm.workItemMap = workItemMap;
                vm.drugUseItemMap = drugUseItemMap;
            });

            vm.yAxisDataPromise = vmh.shareService.tmp('T3009', null, { tenantId: vm.tenantId }).then(function (nodes) {
                return nodes;
            });

            vm.editing$NursingLevel = {};
            vm.editing$NursingPlanRemark = {};
            vm.work_items = { "A0001": {}, "A0003": {} };
            fetchNursingPlan();
        }


        function fetchNursingPlan() {
            vmh.psnService.nursingPlansByRoom(vm.tenantId, ['name', 'sex', 'nursingLevelId'], ['elderlyId', 'work_items', 'remark']).then(function (data) {
                vm.aggrData = data;
                // tarnckedKey room + bed ;
                for (var trackedKey in vm.aggrData) {
                    vm.$editings[trackedKey] = {};
                    var nursingLevelId = vm.aggrData[trackedKey]['elderly']['nursingLevelId'];

                    if (nursingLevelId) {
                        var workItemkey = trackedKey + '$' + nursingLevelId;

                        if (!vm.work_items['A0001'][workItemkey]) {
                            vm.work_items['A0001'][workItemkey] = {};
                        }
                        var nursingPlanId = vm.aggrData[trackedKey]['nursing_plan']['id'];
                        if (nursingPlanId) {
                            var work_items = vm.aggrData[trackedKey]['nursing_plan']['work_items'];
                            if (work_items.length > 0) {
                                for (var i = 0, len = work_items.length; i < len; i++) {
                                    if (work_items[i].type == 'A0001') {
                                        vm.work_items['A0001'][workItemkey][work_items[i].workItemId] = true;
                                    }
                                }
                            }
                        }
                    }
                    var elderlyId = vm.aggrData[trackedKey]['elderly']['id'];
                    if (elderlyId) {
                        var drugUseItemkey = trackedKey + '$' + elderlyId;

                        if (!vm.work_items['A0003'][drugUseItemkey]) {
                            vm.work_items['A0003'][drugUseItemkey] = {};
                        }
                        var nursingPlanId = vm.aggrData[trackedKey]['nursing_plan']['id'];
                        if (nursingPlanId) {
                            var work_items = vm.aggrData[trackedKey]['nursing_plan']['work_items'];
                            if (work_items) {
                                for (var i = 0, len = work_items.length; i < len; i++) {
                                    if (work_items[i].type == 'A0003') {
                                        vm.work_items['A0003'][drugUseItemkey][work_items[i].workItemId] = true;
                                    }
                                }
                            }
                        }
                    }
                }
            });

        }

        function onRoomChange() {
            // console.log('onRoomChange: ', vm.yAxisData);
            var yAxisDataFlatten = [];
            _.each(vm.yAxisData, function (o) {
                console.log('o is:' + o);
                for (var i = 1, len = o.capacity; i <= len; i++) {
                    if (_.contains(o.forbiddens, i)) continue;
                    var trackedKey = o._id + '$' + i;
                    yAxisDataFlatten.push(_.extend({ trackedKey: trackedKey, bed_no: i }, o));
                }
            });
            vm.yAxisDataFlatten = yAxisDataFlatten;
            // console.log('yAxisDataFlatten:',vm.yAxisDataFlatten);
        }

        function addElderlyNursingLevel(trackedKey) {
            vm.$editings[trackedKey]['nursingLevelId'] = true;
        }

        function editElderlyNursingLevel(trackedKey) {
            vm.editing$NursingLevel[vm.aggrData[trackedKey]['elderly']['id']] = vm.aggrData[trackedKey]['elderly']['nursingLevelId'];
            vm.$editings[trackedKey]['nursingLevelId'] = true;
        }

        function saveElderlyNursingLevel(trackedKey, nursingLevelId) {
            var elderlyId = vm.aggrData[trackedKey]['elderly'].id;
            vmh.psnService.changeElderlyNursingLevel(vm.tenantId, elderlyId, nursingLevelId, vm.operated_by, vm.operated_by_name).then(function (data) {

                // 更改老人护理等级意味着需要原等级下的所有工作项目
                if (data.oldNursingLevelId && data.nursingLevelId != data.oldNursingLevelId) {
                    // console.log('更改前:', vm.work_items)
                    var key = trackedKey + '$' + data.oldNursingLevelId;
                    var workItemsOfNursingLevel = vm.workItemMap[data.oldNursingLevelId];

                    if (workItemsOfNursingLevel) {

                        for (var i = 0, len = workItemsOfNursingLevel.length; i < len; i++) {
                            if (vm.work_items["A0001"][key]) {
                                vm.work_items["A0001"][key][workItemsOfNursingLevel[i].id] = false;
                            }
                        }
                    }
                    // console.log('更改后:', vm.work_items)
                }

                vm.aggrData[trackedKey]['elderly']['nursingLevelId'] = data.nursingLevelId;
                vm.$editings[trackedKey]['nursingLevelId'] = false;
            });
        }

        function cancelElderlyEditing(trackedKey) {
            vm.$editings[trackedKey]['nursingLevelId'] = false;
        }

        function switchReadonlyWorkItems(trackedKey) {
            vm.$editings[trackedKey]['workItems'] = !vm.$editings[trackedKey]['workItems'];
        }

        function switchReadonlyDrugUseItems(trackedKey) {
            vm.$editings[trackedKey]['drugUseItems'] = !vm.$editings[trackedKey]['drugUseItems'];
        }

        function workItemChecked(trackedKey, workItemId) {
            var elderlyId = vm.aggrData[trackedKey]['elderly'].id;
            var workItemKey = trackedKey + '$' + vm.aggrData[trackedKey]['elderly']['nursingLevelId'];
            var work_item_check_info = { id: workItemId, type: "A0001", checked: vm.work_items['A0001'][workItemKey][workItemId] };
            vmh.psnService.nursingPlanSaveNursingItem(vm.tenantId, elderlyId, work_item_check_info);
        }

        function drugUseItemChecked(trackedKey, drugUseItemId) {

            var elderlyId = vm.aggrData[trackedKey]['elderly'].id;
            var drugUseItemkey = trackedKey + '$' + vm.aggrData[trackedKey]['elderly']['id'];
            var drug_use_item_check_info = { id: drugUseItemId, type: 'A0003', checked: vm.work_items['A0003'][drugUseItemkey][drugUseItemId] };
            vmh.psnService.nursingPlanSaveNursingItem(vm.tenantId, elderlyId, drug_use_item_check_info);
        }


        function addNursingPlanRemark(trackedKey) {
            vm.$editings[trackedKey]['remark'] = true;
        }

        function editNursingPlanRemark(trackedKey) {
            vm.editing$NursingPlanRemark[vm.aggrData[trackedKey]['elderly']['id']] = vm.aggrData[trackedKey]['nursing_plan']['remark'];
            vm.$editings[trackedKey]['remark'] = true;
        }

        function saveNursingPlanRemark(trackedKey, remark) {
            var elderlyId = vm.aggrData[trackedKey]['elderly'].id;
            vmh.psnService.nursingPlanSaveRemark(vm.tenantId, elderlyId, remark).then(function (data) {
                vm.aggrData[trackedKey]['nursing_plan']['remark'] = remark;
                vm.$editings[trackedKey]['remark'] = false;
            });
        }

        function cancelNursingPlanRemark(trackedKey) {
            vm.$editings[trackedKey]['remark'] = false;
        }

        function generateNursingRecord(trackedKey) {
            ngDialog.openConfirm({
                template: 'customConfirmDialog.html',
                className: 'ngdialog-theme-default',
                controller: ['$scope', function ($scopeConfirm) {
                    $scopeConfirm.message = vm.moduleTranslatePath('DIALOG-GENERATE-NURSING-RECORD')
                }]
            }).then(function () {
                var elderlyId = vm.aggrData[trackedKey]['elderly'].id;
                vmh.psnService.nursingRecordGenerate(vm.tenantId, elderlyId).then(function (data) {
                    vmh.alertSuccess('button.GEN', true);
                });
            });
        }

        function customizedWorkItem(workItemId,elderlyId) {  
            ngDialog.open({
                template: 'work-item-custom.html',
                controller: 'WorkItemCustomController',
                className: 'ngdialog-theme-default ngdialog-nursing-plan-custom',
                data: {
                    vmh: vmh,
                    moduleTranslatePathRoot: vm.moduleTranslatePath(),
                    workItemId: workItemId,
                    elderlyId:elderlyId,
                }
            })
        }
    }

    WorkItemCustomController.$inject = ['$scope', 'ngDialog'];

    function WorkItemCustomController($scope, ngDialog) {

        var vm = $scope.vm = {};
        var vmh = $scope.ngDialogData.vmh;
        var workItemId = $scope.ngDialogData.workItemId;
        
        vm.doSubmit = doSubmit;
        vm.cancel = cancel;
        vm.selectBinding = {};
        $scope.utils = vmh.utils.v;
        init();

        function init() {
            vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
            vm.initVoiceTemplate = initVoiceTemplate;
            vm.moduleTranslatePath = function (key) {
                return vm.moduleTranslatePathRoot + '.' + key;
            };
            vmh.parallel([
                vmh.shareService.d('D0103'),
                vmh.shareService.d('D0104'),
                vmh.shareService.d('D3019'),
                vmh.psnService.workItemQuery(workItemId)
            ]).then(function (results) {
                vm.selectBinding.repeatTypes = results[0];
                vm.selectBinding.remindModes = results[1];
                vm.selectBinding.workItemFlags = results[2].slice(0, results[2].length - 1);
                vm.model = results[3];
            })
            function initVoiceTemplate() {
                if (vm.model.repeat_type == "A0001") {
                    vm.model.voice_template = '';
                    vm.model.repeat_values = '';
                    vm.model.repeat_start = '*';
                    vm.voiceSwitch = true;
                    vm.repeatValuesSwitch = true;
                    vm.repeatStartSwitch = true;
                } else {
                    vm.model.voice_template = "${老人姓名},你该${项目名称}了,请您${工作描述}了";
                    vm.model.repeat_values = '';
                    vm.model.repeat_start = '';
                    vm.voiceSwitch = false;
                    vm.repeatValuesSwitch = false;
                    vm.repeatStartSwitch = false;
                }
            }
        }

        function doSubmit(){
           vm.model.elderlyId = $scope.ngDialogData.elderlyId; 
           vmh.psnService.customizedWorkItem(workItemId,vm.model).then(function(){
               
           }) 
        }
        function cancel(){
          ngDialog.close("#work-item-custom.html")   
        }
    }
})();
