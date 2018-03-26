/**
 * Created by hcl on 18-2-28.
 * 病症管理
 */
(function() {
  'use strict';

  angular
      .module('subsystem.pension-agency')
      .controller('DiseaseGridController', DiseaseGridController)
      .controller('DiseaseDetailsController', DiseaseDetailsController)
  ;


  DiseaseGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function DiseaseGridController($scope, ngDialog, vmh, vm) {

    $scope.vm = vm;
    $scope.utils = vmh.utils.g;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});
      vm.query();
      console.log('rows:',vm.rows);
    }
  }

  DiseaseDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function DiseaseDetailsController($scope, ngDialog, vmh, vm) {

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
        console.log("model:",vm.model);
        vm.save();
      } else {
        if ($scope.utils.vtab(vm.tab1.cid)) {
          vm.tab1.active = true;
        }
      }
    }
  }


})();