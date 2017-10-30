/**
 * Created by zppro on 17-10-30.
 * Target:数据权限
 */

(function() {
  'use strict';

  angular
    .module('subsystem.shared')
    .controller('Shared_DataPermissionConfigController', Shared_DataPermissionConfigController)
  ;

  Shared_DataPermissionConfigController.$inject = ['$scope', 'vmh', 'instanceVM'];

  function Shared_DataPermissionConfigController($scope, vmh, vm) {
    $scope.vm = vm;
    init();


    function init() {

      vm.init();

      vm.checkedDataPermissionItems = {};

      vmh.parallel([
        vmh.shareService.d2('D0105'),
        vmh.shareService.d2('D0106')
      ]).then(function (results) {
        vm.subject_type_name = (results[0][vm.model.subject_type]||{}).name || '未指定授权主体'
        vm.object_type_name = (results[1][vm.model.object_type]||{}).name || '未指定授权客体'

        switch (vm.model.subject_type) {
          case 'A0001':
            //用户
            vmh.fetch(vm.modelNode.services['pub-user'].get({_id: vm.getParam('_id')})).then(function(user){
              console.log('user:', user)
              vm.subject_name = (user || {}).name;
            });
            break;
          default:
            break;
        }
      });

      switch (vm.model.object_type) {
        case 'A1001':
          vm.dataPermissionItemsPromise = vmh.shareService.tmp('T3009', null, {tenantId: vm.tenantId});
          break;
        default:
          break;
      }

      //vm.dataPermissionItemsPromise =
      // vm.dataPermissionItemsPromise = vmh.clientData.getJson('charge-standards-pension-agency').then(function (items) {
      //   vm.selectBinding.standards = iuser-manage-tems;
      //   if (vm.selectBinding.standards.length > 0) {
      //     return vmh.parallel([
      //       vmh.extensionService.tenantChargeItemCustomizedAsTree(vm.model['tenantId'], PENSION_AGENCY_DEFAULT_CHARGE_STANDARD, vm._subsystem_),
      //
      //       vmh.fetch(tenantService.query({_id: vm.model['tenantId']}, 'charge_standards')),
      //       vmh.extensionService.tenantChargeItemNursingLevelAsTree(vm.model['tenantId'], PENSION_AGENCY_DEFAULT_CHARGE_STANDARD,vm._subsystem_)
      //
      //     ]).then(function (results) {
      //       console.log(results);
      //       var tenantChargeStandard = _.find(results[1][0].charge_standards, function(o){
      //         console.log(o.subsystem )
      //         console.log(vm._subsystem_)
      //         return o.subsystem == vm._subsystem_
      //       });
      //       var selectedStandard;
      //       if (tenantChargeStandard){
      //         selectedStandard = _.find(vm.selectBinding.standards, function(o){
      //           return o._id == tenantChargeStandard.charge_standard
      //         });
      //         vm.chargeItems = tenantChargeStandard.charge_items;
      //       }
      //
      //       if (!selectedStandard) {
      //         selectedStandard = vm.selectBinding.standards[0];
      //       }
      //
      //       if (selectedStandard) {
      //         vm.selectedStandardId = selectedStandard._id;
      //       }
      //
      //       if(results[0].children.length>0) {
      //         selectedStandard.children.push(results[0]);
      //       }
      //
      //       if(results[2].children.length>0){
      //         selectedStandard.children.push(results[2]);
      //       }
      //
      //       setCheckedChargeItems();
      //
      //       return vmh.promiseWrapper(selectedStandard.children);
      //     });
      //   }
      // });
      //
      //
      // vm.createChargeItem = createChargeItem;
      // vm.saveChargeStandard = saveChargeStandard;
      //
      // function onStandardChanged() {
      //   var selectedStandard = _.findWhere(vm.selectBinding.standards, {_id: vm.selectedStandardId});
      //   if(selectedStandard){
      //     vm.chargeItemDataPromise = vmh.promiseWrapper(selectedStandard.children);
      //     setCheckedChargeItems();
      //   }
      // }
      //
      //
      // function setCheckedChargeItems(){
      //   vm.checkedChargeItems = _.map(vm.chargeItems,function(o){
      //     o._id = o.item_id;
      //     return o;
      //   });
      //   _.each(vm.checkedChargeItems,function(item) {
      //     vm.charges[item.item_id] = {
      //       item_id: item.item_id,
      //       item_name: item.item_name,
      //       period_price: item.period_price,
      //       period: item.period
      //     };
      //   });
      // }
      //
      //
      // function createChargeItem(node) {
      //   var theOne = vm.charges[node._id];
      //   if (!theOne) {
      //     console.log(node);
      //     vm.charges[node._id] = {
      //       item_id: node._id,
      //       item_name: node.name,
      //       period_price: 0,
      //       period: 'A0005'
      //     }
      //   }
      //   //console.log(vm.charges);
      // }
      //
      // function saveChargeStandard() {
      //
      //   var checkedIds = _.map(vm.checkedChargeItems,function(o){return o._id});
      //   console.log(checkedIds);
      //
      //   vm.saveCharges = _.filter(vm.charges,function(o){
      //     return _.contains(checkedIds,o.item_id);
      //   });
      //
      //   vmh.exec(vmh.extensionService.saveTenantChargeItemCustomized(vm.model['tenantId'], {
      //     charge_standard: vm.selectedStandardId,
      //     subsystem: vm._subsystem_,
      //     charge_items: _.values(vm.saveCharges)
      //   }));
      // }

    }
  }

})();
