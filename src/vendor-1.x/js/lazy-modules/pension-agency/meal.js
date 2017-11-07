/**
 * Created by hcl on 17-9-22.
 */
(function() {
  'use strict';

  angular
    .module('subsystem.pension-agency')
    .controller('MealGridController', MealGridController)
    .controller('MealDetailsController', MealDetailsController)
  ;


  MealGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function MealGridController($scope, ngDialog, vmh, vm) {

    $scope.vm = vm;
    $scope.utils = vmh.utils.g;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});
      vm.query();
    }
  }

  MealDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function MealDetailsController($scope, ngDialog, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;


    init();

    function init() {

      vm.init({removeDialog: ngDialog});

      vm.doSubmit = doSubmit;
      vm.priceChange = priceChange;

      vm.tab1 = {cid: 'contentTab1'};

      vm.treeDataPromiseOfDishesMeat=vmh.shareService.tmp('T3001/psn-mealDish', 'name price nature', {tenantId: vm.tenantId, status: 1, stop_flag: false}, null, true).then(function (nodes) {
        console.log('mealDish nodes:', nodes);
        var meat=[];
        _.each(nodes,function (o) {
        //     if(o.stop_flag){
        //         o.disableCheck =true;
        //     }
          if(o.nature == 'A0000'){
            meat.push(o);
          }
        });
        return meat;
      });
      vm.treeDataPromiseOfDishesVegetable=vmh.shareService.tmp('T3001/psn-mealDish', 'name price nature', {tenantId: vm.tenantId, status: 1, stop_flag: false}, null, true).then(function (nodes) {
        var vegetable=[];
        _.each(nodes,function (o) {
          if(o.nature == 'A0001'){
            vegetable.push(o);
          }
        });
        return vegetable;
      });

      vm.load();

    }

    function priceChange() {
      vm.model.price = 0;
      vm.model.dishes = vm.meat.concat(vm.vegetable);
      console.log('-->', vm.model);
      for (var i = 0, len = vm.model.dishes.length; i < len; i++) {
        vm.model.price += vm.model.dishes[i].price;
      }
    }

    function doSubmit() {

      if ($scope.theForm.$valid) {
        for (var i = 0, len = vm.model.dishes.length; i < len; i++) {
          vm.model.dishes[i].mealDishId = vm.model.dishes[i]._id;
          vm.model.dishes[i].name = vm.model.dishes[i].name;
        }
        console.log('vm.model:', vm.model);
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