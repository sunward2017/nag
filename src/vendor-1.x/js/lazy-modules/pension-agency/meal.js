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
      var meats=[];
      vm.treeDataPromiseOfDishesMeat=vmh.shareService._tmp('T3001/psn-mealDish', 'name price nature', {tenantId: vm.tenantId, status: 1, stop_flag: false}, {'name':1},null, true).then(function (nodes) {
        console.log('mealDish nodes:', nodes);
        _.each(nodes,function (o) {
        //     if(o.stop_flag){
        //         o.disableCheck =true;
        //     }
          if(o.nature == 'A0000'){
            meats.push(o);
          }
        });
        return meats;
      });
      var vegetables=[];
      vm.treeDataPromiseOfDishesVegetable=vmh.shareService._tmp('T3001/psn-mealDish', 'name price nature', {tenantId: vm.tenantId, status: 1, stop_flag: false},{'name':1}, null, true).then(function (nodes) {
        _.each(nodes,function (o) {
          if(o.nature == 'A0001'){
            vegetables.push(o);
          }
        });
        return vegetables;
      });

      vmh.q.all([vm.treeDataPromiseOfDishesMeat,
        vm.treeDataPromiseOfDishesVegetable,
        vm.load()
      ]).then(function () {
        console.log('vm._action_ :',vm._action_);
        if(vm._action_ == 'edit'){
          console.log('vm.model.dishes:',vm.model.dishes);
          vm.meats=[];
          vm.vegetables =[];
          _.each(vm.model.dishes,function (o) {
            var isMeat = _.findIndex(meats,function (meat) {
              return meat._id == o.mealDishId;
            });
            var isVegetable = _.findIndex(vegetables,function (vg) {
              return vg._id == o.mealDishId;
            });
            if(isMeat!=-1){
              vm.meats.push(o);
            }else if(isVegetable!=-1){
              vm.vegetables.push(o);
            }
          });
        }
      });

    }

    function priceChange() {
      vm.model.price = 0;
      vm.model.dishes = vm.meats.concat(vm.vegetables);
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