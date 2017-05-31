/**
 * room Created by zppro on 17-5-31.
 * Target:养老机构用药模版
 */

(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('DrugUseTemplateGridController', DrugUseTemplateGridController)
        .controller('DrugUseTemplateDetailsController', DrugUseTemplateDetailsController)
        ;


    DrugUseTemplateGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function DrugUseTemplateGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({ removeDialog: ngDialog });

            vm.query();
        }
    }

    DrugUseTemplateDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function DrugUseTemplateDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({ removeDialog: ngDialog });

            vm.initVoiceTemplate = initVoiceTemplate;
            vm.changeRemindFlag = changeRemindFlag;
            vm.doSubmit = doSubmit;

            vm.tab1 = { cid: 'contentTab1' };

            vmh.parallel([
                vmh.shareService.d('D0103'),
                vmh.shareService.d('D0104')
            ]).then(function (results) {
                vm.selectBinding.repeatTypes = results[0];
                vm.selectBinding.remindModes = results[1];
            });

            vm.load().then(function () {
                if (vm.model.repeat_values && vm.model.repeat_values.length > 0) {
                    vm.repeat_values = vm.model.repeat_values.join();
                }
            });
        }

        function doSubmit() {
            vm.model.repeat_values = (vm.repeat_values && vm.repeat_values.length > 0) ? vm.repeat_values.split(",") : [];

            if (vm.model.voice_template) {
                var reg = /\${[^}]+}/g;
                var arr = vm.model.voice_template.match(reg);
                if (arr && arr.length > 0) {
                    var isVerify = false;
                    for (var i = 0, len = arr.length; i < len; i++) {

                        if (arr[i] == "${药品名称}" || arr[i] == "${老人姓名}") {
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
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }

        function changeRemindFlag () {
            console.log('vm.model.remind_flag:', vm.model.remind_flag);

            if(vm.selectBinding.remindModes && vm.selectBinding.remindModes.length == 1) {
                vm.model.remind_mode = vm.selectBinding.remindModes[0].value;
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
                vm.model.voice_template = "${老人姓名},您该服用${药品名称}了";
                vm.repeat_values = '';
                vm.model.repeat_start = '';
                vm.voiceSwitch = false;
                vm.repeatValuesSwitch = false;
                vm.repeatStartSwitch = false;
            }
        }
    }

})();