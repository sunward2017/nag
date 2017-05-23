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
        function fetchElderly(){
            vmh.psnService.nursingPlansByRoom(vm.tenantId, ['name', 'sex', 'birthday', 'enter_code' ,'nursing_info','begin_exit_flow'], ['elderlyId']).then(function(ret){
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
    
    ElderlyByDrugUseController.$inject = ['$scope','ngDialog','vmh', 'entityVM'];
    
    function ElderlyByDrugUseController($scope, ngDialog, vmh, vm){
        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;
        init();
        function init(){
            vm.init({removeDialog: ngDialog});
            vmh.parallel([
                vmh.shareService.d('D1006'),
                vmh.shareService.d('D1008'),   
            ]).then(function (results) {
                vm.selectBinding.sex = results[0];
                vm.selectBinding.medical_insurances = results[1];
            });
            vm.medical_historiesPromise = vmh.shareService.d('D1014').then(function (medical_histories) {
                vmh.utils.v.changeProperyName(medical_histories, [{o: 'value', n: '_id'}]);
                return medical_histories;
            });
            vm.load().then(function(){
                console.log(vm.model);
            })  
        }
    }





    DrugUseItemDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function DrugUseItemDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;
        init();

        function init() {

            vm.init({ removeDialog: ngDialog });

            vm.doSubmit = doSubmit;
            // vm.queryElderlyPromise = queryElderly();
            // vm.fetchElderlyColumnsPromise = [{ label: '入院登记号', name: 'enter_code', width: 100 }, { label: '姓名', name: 'name', width: 100 }];

            vm.queryDrugPromise = queryDrug();
            vm.fetchDrugColumnsPromise = [{ label: '药品编码', name: 'drug_no', width: 100 }, { label: '药品全称', name: 'full_name', width: 100 }];
            vm.selectElerlyForBackFiller = selectElerlyForBackFiller;
            vm.selectDrugForBackFiller = selectDrugForBackFiller;

            vm.initVoiceTemplate = initVoiceTemplate;
            vm.tab1 = { cid: 'contentTab1' };

            vmh.parallel([
                vmh.shareService.tmp('T3001/psn-nursingLevel', 'name', vm.treeFilterObject),
                vmh.shareService.d('D0103'),
                vmh.shareService.d('D0104')
            ]).then(function (results) {
                vm.selectBinding.nursingLevels = _.map(results[0], function (row) {
                    return { id: row._id, name: row.name }
                });
                vm.selectBinding.repeatTypes = results[1];
                vm.selectBinding.remindModes = results[2];
            });

            vm.load().then(function () {
                if (vm.model.repeat_values && vm.model.repeat_values.length > 0) {
                    vm.repeat_values = vm.model.repeat_values.join();
                }
                if (vm.model.elderlyId) {
                    vm.selectedElderly = { _id: vm.model.elderlyId, name: vm.model.elderly_name };
                    vm.selectedDrug = { _id: vm.model.drugId, name: vm.model.name };
                }
            });
        }

        function queryElderly(keyword) {
            return vmh.fetch(vmh.psnService.queryElderly(vm.tenantId, keyword, {
                live_in_flag: true,
                // begin_exit_flow: {'$in':[false,undefined]}
            }, 'name enter_code'));
        }

        function queryDrug(keyword) {
            return vmh.fetch(vmh.psnService.queryDrug(vm.tenantId, keyword, {}, 'drug_no full_name'));
        }

        function selectDrugForBackFiller(row) {
            if (row) {
                vm.model.drugId = row.id;
                vm.model.drug_no = row.drug_no;
                vm.model.name = row.full_name;
            }
        }

        function selectElerlyForBackFiller(row) {
            if (row) {
                vm.model.enter_code = row.enter_code;
                vm.model.elderlyId = row.id;
                vm.model.elderly_name = row.name;
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
                vm.save();
            } else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }
        function initVoiceTemplate() {
            if (vm.model.repeat_type == "A0001") {
                vm.model.voice_template = '';
                vm.repeat_values = '';
                vm.model.repeat_start = '*';
                vm.voiceSwitch = true;
                vm.model.remind_flag = false;
                vm.repeatValuesSwitch = true;
                vm.repeatStartSwitch = true;
            } else {
                vm.model.voice_template = "${老人姓名},您该服用${药品名称}了,请您依照${服用方法}服用哦";
                vm.repeat_values = '';
                vm.model.repeat_start = '';
                vm.voiceSwitch = false;
                vm.repeatValuesSwitch = false;
                vm.repeatStartSwitch = false;
            }
        }
    }

})();
