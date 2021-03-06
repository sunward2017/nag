/**
 * Created by zppro on 17-2-16.
 * Target:租户管理用户=>子系统共享
 */

(function() {
  'use strict';

  angular
    .module('subsystem.shared')
    .controller('Shared_UserManageGridController', Shared_UserManageGridController)
    .controller('Shared_UserManageDetailsController', Shared_UserManageDetailsController)
  ;


  Shared_UserManageGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function Shared_UserManageGridController($scope, ngDialog, vmh, vm) {
    $scope.vm = vm;
    $scope.utils = vmh.utils.g;
    $scope.subsystem_names = vmh.subSystemNames;


    var vmc = $scope.vmc = {};

    init();


    function init() {
      vm.init({removeDialog: ngDialog});

      vmc.resetUserPassword = resetUserPassword;

      if (vm.switches.leftTree) {

        //将来可以增加进自定义的角色
        vmh.shareService.d('D1001').then(function (rows) {
          var treeNodes = _.map(_.initial(rows), function (row) {
            return {_id: row.value, name: row.name};
          });

          vm.trees = [new vmh.treeFactory.sTree('tree1', treeNodes, {mode: 'grid'})];
          vm.trees[0].selectedNode = vm.trees[0].findNodeById($scope.$stateParams.roles);
        });

        $scope.$on('tree:node:select', function ($event, node) {

          var selectNodeId = node._id;
          if ($scope.$stateParams.roles != selectNodeId) {
            $scope.$state.go(vm.viewRoute(), {roles: selectNodeId});
          }
        });
      }

      vmh.translate(vm.viewTranslatePath('RESET-USER-PASSWORD-COMMENT')).then(function (ret) {
        $scope.dialogData = {details: ret};
      });

      vm.query();
    }

    function resetUserPassword(userId) {
      ngDialog.openConfirm({
        template: 'normalConfirmDialog.html',
        className: 'ngdialog-theme-default',
        scope: $scope
      }).then(function () {

        vmh.q.all([vmh.translate('notification.NORMAL-SUCCESS'), vmh.extensionService.resetUserPassword(userId)]).then(function (ret) {
          vmh.notify.alert('<div class="text-center"><em class="fa fa-check"></em> ' + ret[0] + '</div>', 'success');
        });
      });
    }
  }

  Shared_UserManageDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function Shared_UserManageDetailsController($scope, ngDialog, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;


    init();

    function init() {

      vm.init({removeDialog: ngDialog});

      vmh.shareService.d('D1001').then(function (rows) {
        vm.selectBinding.roles = _.initial(rows);
      });


      vm.doSubmit = doSubmit;
      vm.tab1 = {cid: 'contentTab1'};

      vm.load().then(function () {
        //多选角色事由于只有单个值因此需要变更为对象
        if (!_.isArray(vm.model.roles)) {
          vm.model.roles = vm.model.roles.split(',');
        }
      });

    }


    function doSubmit() {

      if ($scope.theForm.$valid) {
        vm.save();
      }
      else {
        if ($scope.utils.vtab(vm.tab1.cid)) {
          vm.tab1.active = true;
        }
      }
    }
  }

})();
