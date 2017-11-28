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
    vm.meatsSearch = meatsSearch;
    vm.vegetablesSearch = vegetablesSearch;
    var meats=[],vegetables=[];

    init();

    function init() {

      vm.init({removeDialog: ngDialog});

      vm.doSubmit = doSubmit;
      vm.priceChange = priceChange;

      vm.tab1 = {cid: 'contentTab1'};

      vm.treeDataPromiseOfDishesMeat=vmh.shareService._tmp('T3001/psn-mealDish', 'name price nature py', {tenantId: vm.tenantId, status: 1, stop_flag: false}, {'py':1},null, true).then(function (nodes) {
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

      vm.treeDataPromiseOfDishesVegetable=vmh.shareService._tmp('T3001/psn-mealDish', 'name price nature py', {tenantId: vm.tenantId, status: 1, stop_flag: false},{'py':1}, null, true).then(function (nodes) {
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

    function meatsSearch() {
      vm.treeDataPromiseOfDishesMeat = vmh.promiseWrapper(mealSearch(vm.meatsPy, meats));
      console.log('vm.treeDataPromiseOfDishesMeat:',vm.treeDataPromiseOfDishesMeat);

    }
    
    function vegetablesSearch() {
      console.log('vegetables search------');
      vm.treeDataPromiseOfDishesVegetable = vmh.promiseWrapper(mealSearch(vm.vegetablesPy, vegetables));
    }

    function mealSearch(py,dishes) {
      var regIn = '^';
      _.each(py,function (o) {
        var oLower = o.toLowerCase();
        console.log('o:',o);
        if(o!=oLower){
          regIn += '['+o+oLower+']';
        }else {
          regIn += '['+o+']';
        }
      });
      var reg = new RegExp(regIn);
      // console.log('meats search------reg:',reg);
      var matchedDishes =[];
      _.each(dishes,function (o) {
        if(reg.test(o.py)){
          matchedDishes.push(o);
        }
      });
      console.log('matchedDishes:',matchedDishes);
      return matchedDishes;
    }
    function priceChange() {
      vm.model.price = 0;
      vm.model.dishes = vm.meats.concat(vm.vegetables);
      console.log('-->', vm.model);
      for (var i = 0, len = vm.model.dishes.length; i < len; i++) {
        vm.model.price += vm.model.dishes[i].price;
      }
    }

    function getInitial() {
      console.log(transl(vm.model.name));
      console.log(slugify(vm.model.name));
      var initialArr = slugify(vm.model.name).split('-');
      vm.model.py = _.map(initialArr,function (o) {
        return o[0];
      }).join('');
      console.log('vm.model.py:',vm.model.py);
    }
    function doSubmit() {

      if ($scope.theForm.$valid) {
        for (var i = 0, len = vm.model.dishes.length; i < len; i++) {
          vm.model.dishes[i].mealDishId = vm.model.dishes[i]._id;
        }
        getInitial();
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