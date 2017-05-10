/**
 * room Created by zsx on 17-4-7.
 * Target:养老机构工作项目
 */

(function() {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('DrugUseItemGridController', DrugUseItemGridController)
        .controller('DrugUseItemDetailsController', DrugUseItemDetailsController);


    DrugUseItemGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function DrugUseItemGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({ removeDialog: ngDialog });
            vm.query();
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
            vm.queryElderlyPromise = queryElderly();
            vm.fetchElderlyColumnsPromise = [{label: '入院登记号',name: 'enter_code',width: 100}, {label: '姓名',name: 'name',width: 100}];
            vm.selectElerly = selectElerly;
            vm.queryDrugPromise = queryDrug();
            vm.fetchDrugColumnsPromise = [{label: '药品编码',name: 'drug_no',width: 100}, {label: '药品全称',name: 'full_name',width: 100}]
            vm.selectElerlyForBackFiller = selectElerlyForBackFiller;
            vm.selectDrugForBackFiller = selectDrugForBackFiller;
            // vm.selectDrug = selectDrug;
            vm.initVoiceTemplate = initVoiceTemplate;
            vm.tab1 = { cid: 'contentTab1' };

            vmh.parallel([
                vmh.shareService.tmp('T3001/psn-nursingLevel', 'name', vm.treeFilterObject),
                vmh.shareService.d('D0103'),
                vmh.shareService.d('D0104')
            ]).then(function(results) {
                vm.selectBinding.nursingLevels = _.map(results[0], function(row) {
                    return { id: row._id, name: row.name }
                });
                vm.selectBinding.repeatTypes = results[1];
                vm.selectBinding.remindModes = results[2];
            });

            vm.load().then(function() {
                if (vm.model.repeat_values && vm.model.repeat_values.length > 0) {
                    vm.repeat_values = vm.model.repeat_values.join();
                }
                if(vm.model.elderlyId){
                    vm.selectedElderly = {_id: vm.model.elderlyId, name: vm.model.elderly_name};
                    vm.selectedDrug = {_id:vm.model.drugId,drug_full_name:vm.model.name};
                }
            });
        }

        function queryElderly(keyword) {
            return vmh.fetch(vmh.psnService.queryElderly(vm.tenantId, keyword, {
                live_in_flag: true,
                // begin_exit_flow: {'$in':[false,undefined]}
            }, 'name enter_code'));
        } 

        function selectElerly(o) {
            if (o) {
                // vm.model.enter_code = o.originalObject.enter_code;
                vm.model.elderlyId = o.originalObject._id;
                vm.model.elderly_name = o.originalObject.name;
            }
        }

        function queryDrug(keyword) {
            console.log("elderlyId",vm.model.elderlyId);
            return vmh.fetch(vmh.psnService.queryDrug(vm.tenantId, keyword, {
            }, 'drug_no full_name'));
        }

        function selectDrugForBackFiller(row) {
            if (row) {
                vm.model.drugId = row.id;
                vm.model.drug_no =row.drug_no;
                vm.model.name = row.drug_full_name;
            }
        }

        function selectElerlyForBackFiller(row) {
            if(row){
                vm.model.enter_code = row.enter_code;
                vm.model.elderlyId = row.id;
                vm.model.elderly_name = row.name;
            }
        }

        function doSubmit() {
            vm.model.repeat_values = vm.repeat_values?vm.repeat_values.split(","):"";
            if(vm.model.voice_template){
                var reg = /\${[^}]+}/g;
                var arr = vm.model.voice_template.match(reg);
                console.log('arr', arr);
                var isVerify = false;
                for (var i = 0, len = arr.length; i < len; i++) {

                    if (arr[i] == "${药品名称}" || arr[i] == "${服用方法}"|| arr[i] == "${老人姓名}") {
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
