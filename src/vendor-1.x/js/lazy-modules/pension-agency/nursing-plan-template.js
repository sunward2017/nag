/**
 * district Created by zppro on 17-3-6.
 * Target:养老机构 模版
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.pension-agency')
        .controller('NursingPlanTemplateGridController', NursingPlanTemplateGridController)
        .controller('NursingPlanTemplateDetailsController', NursingPlanTemplateDetailsController)
    ;


    NursingPlanTemplateGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function NursingPlanTemplateGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.query();
        }
    }

    NursingPlanTemplateDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function NursingPlanTemplateDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});


            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};


            //vm.modelService['psn_room']

            vm.load().then(function(){
                vm.raw$stop_flag = !!vm.model.stop_flag;
                //构造类型表格
                var x_axis = vm.model.type == 'A0001' ? 'weekAxis' :'monthAxis';
                vmh.clientData.getJson(x_axis).then(function (data) {
                    vm.xAxisData = data;
                });
                vm.yAxisData = [];

                vm.yAxisDataPromise = vmh.shareService.d('D1013').then(function (hobbies) {
                    vmh.utils.v.changeProperyName(hobbies, [{o: 'value', n: '_id'}]);
                    return hobbies;
                });

                vm.yAxisDataPromise = vmh.shareService.tmp('T3009', null, {tenantId:vm.tenantId}).then(function(nodes){
                    return nodes;
                });
            });

        }


        function doSubmit() {

            if ($scope.theForm.$valid) {
                var p;
                if(vm.raw$stop_flag === false && vm.model.stop_flag === true) {
                    p = vmh.fetch(vmh.psnService.nursingRobotRemoveRoomConfig(vm.tenantId, vm.model.id));
                } else {
                    p = vmh.promiseWrapper();
                }
                p.then(function(){
                    vm.save();
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