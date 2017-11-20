/**
 * Created by hcl on 17-9-30.
 * * 养老机构 基础管理 -> 医生管理
 */
(function() {
  'use strict';

  angular
      .module('subsystem.pension-agency')
      .controller('DoctorGridController', DoctorGridController)
      .controller('DoctorDetailsController', DoctorDetailsController)
  ;


  DoctorGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function DoctorGridController($scope, ngDialog, vmh, vm) {

    $scope.vm = vm;
    $scope.utils = vmh.utils.g;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});
      vm.query();
    }
  }

  DoctorDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function DoctorDetailsController($scope, ngDialog, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;


    init();

    function init() {

      vm.init({removeDialog: ngDialog});


      vm.doSubmit = doSubmit;
      vm.tab1 = {cid: 'contentTab1'};

      vm.load();

    }


    function doSubmit() {
      if ($scope.theForm.$valid) {
        vm.save().then(function (ret) {
          return vmh.psnService.doctorGenerateUser(vm.model._id || ret._id).then(function (userId) {
            vm.model.userId = userId;
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