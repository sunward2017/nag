/**
 * Created by yrm on 17-4-13.
 * Target:其它配置
 */
(function() {
    'use strict';
    
    angular
        .module('subsystem.shared')
        .controller('Shared_OtherConfigGridController', Shared_OtherConfigGridController)
    ;


    Shared_OtherConfigGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'instanceVM'];

    function Shared_OtherConfigGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.v;
        var tenantService = vm.modelNode.services['pub-tenant'];

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.doSubmit = doSubmit;

            vm.pub_alarm_D3016_A1000_to_modes = {};
            vm.pub_alarm_D3016_A2000_to_modes = {};

            vmh.parallel([
                vmh.fetch(tenantService.query({_id: vm.tenantId})),
                vmh.shareService.d('D3030')
            ]).then(function (results) {
                vm.other_configs = results[0][0].other_config;
                vm.tenant_name = results[0][0].name;
                if(vm.other_configs.pub_alarm_reason_to_modes){
                    console.log('载入离床告警设置..');
                    var findIndex =  _.findIndex(vm.other_configs.pub_alarm_reason_to_modes, function(o){
                        return o.reason == 'A1000';
                    });
                    if (findIndex!=-1) {
                        _.each(vm.other_configs.pub_alarm_reason_to_modes[findIndex].modes, function (mode) {
                            vm.pub_alarm_D3016_A1000_to_modes[mode] = true;
                        });
                    }
                    console.log('载入药品低库存通知设置..');
                    findIndex =  _.findIndex(vm.other_configs.pub_alarm_reason_to_modes, function(o){
                        return o.reason == 'A2000';
                    });
                    if (findIndex!=-1) {
                        _.each(vm.other_configs.pub_alarm_reason_to_modes[findIndex].modes, function (mode) {
                            vm.pub_alarm_D3016_A2000_to_modes[mode] = true;
                        });
                    }
                }
                vm.selectBinding.alarm_modes = results[1];
            });
        }

        function doSubmit(){
            if ($scope.theForm.$valid) {

                if(!vm.other_configs.pub_alarm_reason_to_modes) {
                    vm.other_configs.pub_alarm_reason_to_modes = [];
                }
                var alarm_D3016_A1000_modes = [], alarm_D3016_A2000_modes = [], findIndex;
                console.log('格式化离床告警设置..');
                for(var key in vm.pub_alarm_D3016_A1000_to_modes) {
                    if(vm.pub_alarm_D3016_A1000_to_modes[key]){
                        alarm_D3016_A1000_modes.push(key);
                    }
                }
                findIndex =  _.findIndex(vm.other_configs.pub_alarm_reason_to_modes, function(o){
                   return o.reason == 'A1000';
                });
                if (findIndex!=-1) {
                    vm.other_configs.pub_alarm_reason_to_modes[findIndex].modes = alarm_D3016_A1000_modes;
                } else {
                    vm.other_configs.pub_alarm_reason_to_modes.push({ reason: 'A1000' ,modes : alarm_D3016_A1000_modes});
                }

                console.log('格式化药品低库存通知设置..');
                for(var key in vm.pub_alarm_D3016_A2000_to_modes) {
                    if(vm.pub_alarm_D3016_A2000_to_modes[key]){
                        alarm_D3016_A2000_modes.push(key);
                    }
                }
                findIndex =  _.findIndex(vm.other_configs.pub_alarm_reason_to_modes, function(o){
                    return o.reason == 'A2000';
                });
                if (findIndex!=-1) {
                    vm.other_configs.pub_alarm_reason_to_modes[findIndex].modes = alarm_D3016_A2000_modes;
                } else {
                    vm.other_configs.pub_alarm_reason_to_modes.push({ reason: 'A2000' ,modes : alarm_D3016_A2000_modes});
                }

                console.log('vm.other_configs.pub_alarm_reason_to_modes:', vm.other_configs.pub_alarm_reason_to_modes);
                vmh.exec(vmh.extensionService.saveTenantOtherConfig(vm.model['tenantId'], vm.other_configs, vm.tenant_name));
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }
    }

})();