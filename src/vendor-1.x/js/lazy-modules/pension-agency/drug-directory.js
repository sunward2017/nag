/**
 * district Created by zppro on 17-2-22.
 * Target:养老机构片区  (移植自fsrok)
 */

(function() {
  'use strict';

  angular
    .module('subsystem.pension-agency')
    .controller('DrugDirectoryGridController', DrugDirectoryGridController)
    .controller('DrugDirectoryDetailsController', DrugDirectoryDetailsController)
  ;

  DrugDirectoryGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function DrugDirectoryGridController($scope, ngDialog, vmh, vm) {

    $scope.vm = vm;
    $scope.utils = vmh.utils.g;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});
      vm.query();
    }
  }

  DrugDirectoryDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function DrugDirectoryDetailsController($scope, ngDialog, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;


    init();

    function init() {

      vm.init({removeDialog: ngDialog});


      vm.doSubmit = doSubmit;
      vm.tab1 = {cid: 'contentTab1'};

      vmh.parallel([
        vmh.shareService.d('D3026')
      ]).then(function (results) {
        vm.selectBinding.mini_units = results[0];
      });

      vm.load().then(function () {
        vm.old_full_name = vm.model.full_name;
      });

    }


    function doSubmit() {

      if ($scope.theForm.$valid) {
        vm.save().then(function (ret) {
          console.log('compare:', vm.old_full_name, vm.model.full_name)
          if (vm.old_full_name != vm.model.full_name && vm._action_ == 'edit') {
            console.log('notifyDataChange');
            vmh.shareService.notifyDataChange('psn$drugDirectory$$name', vm.model._id);
          }
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