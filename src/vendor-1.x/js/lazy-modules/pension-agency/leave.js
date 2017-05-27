/**
 * Created by zppro on 17-3-2.
 * Target:外出管理  (移植自fsrok)
 */

(function() {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('LeaveGridController', LeaveGridController)
        .controller('LeaveDetailsController', LeaveDetailsController)
    ;


    LeaveGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function LeaveGridController($scope, ngDialog, vmh, vm) {
        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();


        function init() {
            vm.init({removeDialog: ngDialog});

            vm.query();
        }

    }

    LeaveDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function LeaveDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});

            vmh.shareService.d('D1001').then(function (rows) {
                vm.selectBinding.roles = _.initial(rows);
            });



            vm.doSubmit = doSubmit;
            vm.clearEndOn = clearEndOn;
            vm.queryElderly = queryElderly;
            vm.searchForBackFiller = searchForBackFiller;
            vm.selectElerlyForBackFiller = selectElerlyForBackFiller;
            vm.selectElerly = selectElerly;
            vm.tab1 = {cid: 'contentTab1'};

            vmh.parallel([
                vmh.shareService.d('D1006'),
                vmh.shareService.d('D1012')
            ]).then(function (results) {
                vm.selectBinding.sex = results[0];
                vm.selectBinding.relationsWithTheElderly = results[1];

                vm.fetchElderlyColumnsPromise = [
                    {label: '入院号',name: 'enter_code',width: 100, align:'center'},
                    {label: '姓名',name: 'name',width: 80},
                    {label: '性别',name: 'sex',width: 60, align:'center', filter: 'diFilter', format: vm.selectBinding.sex},
                    {label: '年龄',name: 'birthday',width: 60, align:'center', filter: 'calcAge'},
                    {label: '房间床位',name: 'room_summary',width: 300},
                    {label: '照护情况',name: 'nursing_info',width: 300},
                    {label: '',name: ''}
                ];
            });
            vm.queryElderlyPromise = queryElderly();

            vm.load().then(function(){
                if(vm.model.elderlyId){
                    vm.selectedElderly = {_id: vm.model.elderlyId, name: vm.model.elderly_name};
                }
            });
        }

        function clearEndOn() {
            vm.model.end_on = null;
        }

        function queryElderly(keyword) {
            return vmh.fetch(vmh.psnService.queryElderly(vm.tenantId, keyword, {
                live_in_flag: true,
                begin_exit_flow: {'$in':[false,undefined]}
            }, 'name enter_code sex birthday room_summary nursing_info'));
        }

        function searchForBackFiller (keyword) {
            vm.queryElderlyPromise = queryElderly(keyword);
        }

        function selectElerlyForBackFiller(row) {
            if(row){
                vm.model.enter_code = row.enter_code;
                vm.model.elderlyId = row.id;
                vm.model.elderly_name = row.name;
            }
        }

        function selectElerly(o) {
            if(o){
                vm.model.enter_code = o.originalObject.enter_code;
                vm.model.elderlyId = o.originalObject._id;
                vm.model.elderly_name = o.title;
            }
        }

        function doSubmit() {

            if ($scope.theForm.$valid) {
                vm.save(true).then(function(ret){
                    vmh.psnService.leaveAccompanierSyncElderlyFamilyMembers(vm.model._id||ret._id).then(function (ret) {
                        vmh.alertSuccess(vm.viewTranslatePath('SYNC_FAMILY_MEMBERS_SUCCESS'), true);
                        vm.returnBack();
                    });
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