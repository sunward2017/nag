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

      vm.tab1 = {cid: 'contentTab1'};
      vm.tab2 = {cid: 'contentTab2'};

      vm.pub_alarm_D3016_A1000_setting_modes = {};
      vm.pub_alarm_D3016_A2000_setting_modes = {};
      vm.pub_alarm_D3016_A1000_modes_receivers_obj = {};
      vm.pub_alarm_D3016_A2000_modes_receivers_obj = {};
      vm.pub_alarm_D3016_A1000_modes_receivers_value = {};
      vm.pub_alarm_D3016_A2000_modes_receivers_value = {};
      vm.psn_meal_periods = [];

      vmh.parallel([
        vmh.fetch(tenantService.query({_id: vm.tenantId})),
        vmh.shareService.d('D3029'),
        vmh.shareService.d('D3030'),
        vmh.shareService.d('D3031'),
        vmh.shareService.d('D3040'),
        vmh.shareService.d('D3041'),
        vmh.shareService.d('D3028'),
        vmh.shareService.d('D3043'),
      ]).then(function (results) {
        vm.other_configs = results[0][0].other_config;
        console.log('--->',vm.other_configs)
        vm.tenant_name = results[0][0].name;
        vm.head_of_agency = results[0][0].head_of_agency || {};

        if(vm.other_configs&&vm.other_configs.pub_alarm_limit_settings && vm.other_configs.pub_alarm_limit_settings.sms_flag){
          vm.sms_remains = vm.other_configs.pub_alarm_limit_settings.sms_remains;
        }else {
          vm.sms_remains = '不限';
        }
        _.each(results[2], function (mode) {
          vm.pub_alarm_D3016_A1000_modes_receivers_obj[mode.value] = {};
          vm.pub_alarm_D3016_A2000_modes_receivers_obj[mode.value] = {};
          vm.pub_alarm_D3016_A1000_modes_receivers_value[mode.value] = {};
          vm.pub_alarm_D3016_A2000_modes_receivers_value[mode.value] = {};
        });

        if (!vm.other_configs.pub_alarm_D3016_settings) {
          vm.other_configs.pub_alarm_D3016_settings = [];
        }

        console.log('载入离床告警设置..');
        vm.pub_alarm_D3016_A1000_setting = _.find(vm.other_configs.pub_alarm_D3016_settings, function (o) {
          return o.reason == 'A1000';
        });
        if (vm.pub_alarm_D3016_A1000_setting) {
          _.each(vm.pub_alarm_D3016_A1000_setting.modes, function (mode) {
            vm.pub_alarm_D3016_A1000_setting_modes[mode.value] = true;
            _.each(mode.receivers, function (receiver) {
              vm.pub_alarm_D3016_A1000_modes_receivers_obj[mode.value][receiver.type] = true;
              if (receiver.type == 'A3001') {
                vm.pub_alarm_D3016_A1000_modes_receivers_value[mode.value][receiver.type] = receiver.value;
              }
            });
          });

        } else {
          vm.pub_alarm_D3016_A1000_setting = {reason: 'A1000', content_template: '${发生时间}${房间床位}${老人姓名}离床未归', level: 'A0007'};
          vm.other_configs.pub_alarm_D3016_settings.push(vm.pub_alarm_D3016_A1000_setting);
        }

        console.log('载入药品低库存通知设置..');
        vm.pub_alarm_D3016_A2000_setting = _.find(vm.other_configs.pub_alarm_D3016_settings, function (o) {
          return o.reason == 'A2000';
        });
        if (vm.pub_alarm_D3016_A2000_setting) {
          _.each(vm.pub_alarm_D3016_A2000_setting.modes, function (mode) {
            vm.pub_alarm_D3016_A2000_setting_modes[mode.value] = true;
            _.each(mode.receivers, function (receiver) {
              vm.pub_alarm_D3016_A2000_modes_receivers_obj[mode.value][receiver.type] = true;
              if (receiver.type == 'A3001') {
                vm.pub_alarm_D3016_A2000_modes_receivers_value[mode.value][receiver.type] = receiver.value;
              }
            });
          });
        } else {
          vm.pub_alarm_D3016_A2000_setting = {reason: 'A2000', content_template: '截止到${发生时间}${老人姓名}的药品已有不足.清单:${药品清单}', level: 'A0001'};
          vm.other_configs.pub_alarm_D3016_settings.push(vm.pub_alarm_D3016_A2000_setting);
        }

        vm.selectBinding.alarm_levels = results[1];
        vm.selectBinding.alarm_modes = results[2];
        vm.selectBinding.alarm_mode_A0001_receiver_types = _.filter(results[3], function (o) {
          return _.contains(o.alarm_modes, 'A0001');
        });
        vm.selectBinding.alarm_mode_A0003_receiver_types = _.filter(results[3], function (o) {
          return _.contains(o.alarm_modes, 'A0003');
        });
        vm.selectBinding.alarm_mode_A0005_receiver_types = _.filter(results[3], function (o) {
          return _.contains(o.alarm_modes, 'A0005');
        });
        vm.selectBinding.alarm_mode_A0007_receiver_types = _.filter(results[3], function (o) {
          return _.contains(o.alarm_modes, 'A0007');
        });
        vm.selectBinding.psn_meal_periods = results[4];
        vm.selectBinding.psn_meal_biz_modes = results[5];
        vm.psn_meal_periods = _.map(vm.selectBinding.psn_meal_periods, function(o){return _.contains(vm.other_configs.psn_meal_periods||[], o.value) ? o.value : '';})
        vm.selectBinding.psn_drug_stock_out_modes = results[6];
        vm.selectBinding.psn_drug_stock_alarm_low_mode = results[7];
      });
    }

    function doSubmit() {
      if ($scope.theForm.$valid) {

        var alarm_D3016_A1000_modes = [], alarm_D3016_A2000_modes = [], alarm_D3016_A1000_modes_receivers, alarm_D3016_A1000_modes_receiver, alarm_D3016_A2000_modes_receivers, alarm_D3016_A2000_modes_receiver;
        console.log('格式化离床告警设置..');
        for (var mode in vm.pub_alarm_D3016_A1000_setting_modes) {
          if (vm.pub_alarm_D3016_A1000_setting_modes[mode]) {
            alarm_D3016_A1000_modes_receivers = [];
            for (var receiverType in vm.pub_alarm_D3016_A1000_modes_receivers_obj[mode]) {
              if (vm.pub_alarm_D3016_A1000_modes_receivers_obj[mode][receiverType]) {
                alarm_D3016_A1000_modes_receiver = {type: receiverType};
                if (receiverType == 'A3001') {
                  alarm_D3016_A1000_modes_receiver.value = vm.pub_alarm_D3016_A1000_modes_receivers_value[mode][receiverType];
                }
                alarm_D3016_A1000_modes_receivers.push(alarm_D3016_A1000_modes_receiver);
              }
            }
            alarm_D3016_A1000_modes.push({value: mode, receivers: alarm_D3016_A1000_modes_receivers});
          }
        }
        vm.pub_alarm_D3016_A1000_setting.modes = alarm_D3016_A1000_modes;

        console.log('格式化药品低库存通知设置..');
        for (var mode in vm.pub_alarm_D3016_A2000_setting_modes) {
          if (vm.pub_alarm_D3016_A2000_setting_modes[mode]) {
            alarm_D3016_A2000_modes_receivers = [];
            for (var receiverType in vm.pub_alarm_D3016_A2000_modes_receivers_obj[mode]) {
              if (vm.pub_alarm_D3016_A2000_modes_receivers_obj[mode][receiverType]) {
                alarm_D3016_A2000_modes_receiver = {type: receiverType};
                if (receiverType == 'A3001') {
                  alarm_D3016_A2000_modes_receiver.value = vm.pub_alarm_D3016_A2000_modes_receivers_value[mode][receiverType];
                }
                alarm_D3016_A2000_modes_receivers.push(alarm_D3016_A2000_modes_receiver);
              }
            }
            alarm_D3016_A2000_modes.push({value: mode, receivers: alarm_D3016_A2000_modes_receivers});
          }
        }
        vm.pub_alarm_D3016_A2000_setting.modes = alarm_D3016_A2000_modes;
        vm.other_configs.psn_meal_periods = _.compact(vm.psn_meal_periods);
        // console.log('vm.other_configs.pub_alarm_D3016_settings:', vm.other_configs.pub_alarm_D3016_settings);
        vmh.exec(vmh.extensionService.saveTenantConfig(vm.model['tenantId'], {
          main: {name: vm.tenant_name, head_of_agency: vm.head_of_agency},
          other: vm.other_configs
        }));
      }
      else {
        if ($scope.utils.vtab(vm.tab1.cid)) {
          vm.tab1.active = true;
        } else if ($scope.utils.vtab(vm.tab2.cid)) {
          vm.tab2.active = true;
        }
      }
    }
  }

})();