/**
 * room Created by zppro on 17-3-23.
 * Target:养老机构工作项目
 */

(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('WorkItemGridController', WorkItemGridController)
        .controller('WorkItemDetailsController', WorkItemDetailsController)
        ;


    WorkItemGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function WorkItemGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({ removeDialog: ngDialog });

            if (vm.switches.leftTree) {
                vmh.shareService.tmp('T3001/psn-nursingLevel', 'name', vm.treeFilterObject).then(function (rows) {
                    var treeNodes = _.map(rows, function (row) { return row });
                    treeNodes.unshift({ _id: '', name: '全部' });
                    vm.trees = [new vmh.treeFactory.sTree('tree1', treeNodes, { mode: 'grid' })];
                    vm.trees[0].selectedNode = vm.trees[0].findNodeById($scope.$stateParams.nursingLevelId);
                });

                $scope.$on('tree:node:select', function ($event, node) {
                    var selectNodeId = node._id;
                    if ($scope.$stateParams.nursingLevelId != selectNodeId) {
                        $scope.$state.go(vm.viewRoute(), { nursingLevelId: selectNodeId });
                    }
                });
            }

            vm.query();
        }
    }

    WorkItemDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function WorkItemDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({ removeDialog: ngDialog });
            vm.initVoiceTemplate = initVoiceTemplate;
            vm.doSubmit = doSubmit;
            vm.tab1 = { cid: 'contentTab1' };

            vmh.parallel([
                vmh.shareService.tmp('T3001/psn-nursingLevel', 'name', vm.treeFilterObject),
                vmh.shareService.d('D0103'),
                vmh.shareService.d('D0104'),
                vmh.shareService.d('D3019')
            ]).then(function (results) {
                vm.selectBinding.nursingLevels = _.map(results[0], function (row) { return { id: row._id, name: row.name } });
                vm.selectBinding.repeatTypes = results[1];
                vm.selectBinding.remindModes = results[2];
                vm.selectBinding.workItemFlags = results[3].slice(0, results[3].length - 1);
            });

            vm.load().then(function () {
                if (vm.model.repeat_values && vm.model.repeat_values.length > 0) {
                    vm.repeat_values = vm.model.repeat_values.join();
                }
            });
        }

        function doSubmit() {
            vm.model.repeat_values = vm.repeat_values ? vm.repeat_values.split(",") : "";

            if (vm.model.voice_template) {
                var reg = /\${[^}]+}/g;
                var arr = vm.model.voice_template.match(reg);
                console.log('arr', arr);
                var isVerify = false;
                for (var i = 0, len = arr.length; i < len; i++) {

                    if (arr[i] == "${项目名称}" || arr[i] == "${工作描述}"|| arr[i] == "${老人姓名}") {
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
            }
            else {
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
                vm.model.voice_template = "${老人姓名},你该${项目名称}了,请您${工作描述}了";
                vm.repeat_values = '';
                vm.model.repeat_start = '';
                vm.voiceSwitch = false;
                vm.repeatValuesSwitch = false;
                vm.repeatStartSwitch = false;
            }
        }
    }

})();