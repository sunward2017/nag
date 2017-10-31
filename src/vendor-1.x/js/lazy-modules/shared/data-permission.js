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

      vm.saveDataPermission = saveDataPermission;
      vm.checkedDataPermissionItems = [];
      vm.model.tenantId = vm.tenantId;
      vm.model.subject_id = vm.getParam('_id');

      vmh.parallel([
        vmh.shareService.d2('D0105'),
        vm.modelNode.services[vm.model.subject_model].get({_id: vm.model.subject_id}),
        vm.modelService.single(_.pick(vm.model, 'tenantId', 'subject_type', 'subject_id', 'object_type'), '_id object_ids')
      ]).then(function (results) {
        vm.object_type_name = (results[0][vm.model.object_type] || {}).name || '未指定授权客体'
        vm.subject_name = (results[1] || {}).name;
        vm.model._id = results[2]._id;
        vm.checkedDataPermissionItems = results[2].object_ids;
      });

      switch (vm.model.object_type) {
        case 'A1001':
          vm.dataPermissionItemsPromise = vmh.shareService.tmp('T3009', null, {tenantId: vm.tenantId});
          break;
        default:
          break;
      }
    }

    function saveDataPermission() {
      var promise;
      if (vm.blocker) {
        vm.blocker.start();
      }
      vm.model.object_ids = vm.checkedDataPermissionItems;
      if (vm.model._id) {
        promise = vm.modelService.update(vm.model._id, vm.model);
      }
      else {
        promise = vm.modelService.save(vm.model);
      }
      vmh.fetch(promise).then(function(ret){
        !vm.model._id && (vm.model._id = ret._id)
        vmh.alertSuccess();
      }).finally(function () {
        if (vm.blocker) {
          vm.blocker.stop();
        }
      });
    }
  }

})();
