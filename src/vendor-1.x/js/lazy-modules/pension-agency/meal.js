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
      vm.batchCreatePy = batchCreatePy;
      vm.query();
    }

    function batchCreatePy() {
      vmh.psnService.batchCreatePy(vm.tenantId,'psn_meal','name').then(function () {
        vmh.alertSuccess();
      });
    }
  }

  MealDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function MealDetailsController($scope, ngDialog, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;
    vm.meatsSearch = meatsSearch;
    vm.vegetablesSearch = vegetablesSearch;
    vm.getInitial = getInitial;
    var meats=[],vegetables=[], //从后台获取到的未过滤的原始荤素nodes
        lastCheckedMeats=[],lastCheckedVegetables=[];//关键字搜索后或checkChange事件触发后各自已选中的nodes

    init();

    function init() {

      vm.init({removeDialog: ngDialog});

      vm.doSubmit = doSubmit;
      vm.priceChange = priceChange;

      vm.tab1 = {cid: 'contentTab1'};

      var mealsPromise = vmh.shareService._tmp('T3001/psn-mealDish', 'name price nature py', {tenantId: vm.tenantId, status: 1, stop_flag: false}, {'py':1},null, true).then(function (nodes) {
        // console.log('get search nodes:', nodes);
        _.each(nodes,function (o) {
        //     if(o.stop_flag){
        //         o.disableCheck =true;
        //     }
          if(o.nature == 'A0000'){
            meats.push(o);
          }else if(o.nature == 'A0001'){
            vegetables.push(o);
          }
        });
        return nodes;
      });

      vmh.q.all([mealsPromise,vm.load()])
      .then(function () {
        // console.log('vm._action_ :',vm._action_);
        vm.meats=[];
        vm.vegetables =[];//存放各自选中的nodes
        if(vm._action_ == 'edit'){
          console.log('vm.model.dishes:',vm.model.dishes);
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
        vm.trees = [new vmh.treeFactory.sTree('tree1', meats, {mode: 'check'}), new vmh.treeFactory.sTree('tree2', vegetables, {mode: 'check'})];
        showCheckedMeals(0);
        showCheckedMeals(1);
      });

      $scope.$on('tree:node:checkChange', function ($event, checkedNodes,$index) {
        console.log('checkedNodes:',checkedNodes);
        // console.log('$index:',$index);
        if($index.el.selector =='#tree1'){
          if(checkedNodes.length <lastCheckedMeats.length){
            _.each(lastCheckedMeats,function (o) {
              var isChecked = _.findIndex(checkedNodes,function (checked) {
                return checked._id == o._id;
              });
              if(isChecked == -1){
                var unCheckedIdx = _.findIndex(vm.meats,function (one) {
                  return one._id == o._id;
                });
                vm.meats.splice(unCheckedIdx,1);
              }
            });
          }else{
            _.each(checkedNodes,function (o) {
              var isChecked = _.findIndex(vm.meats,function (meat) {
                return meat._id == o._id;
              });
              if(isChecked == -1){
                vm.meats.push(o);
              }
            });
          }
          lastCheckedMeats = checkedNodes;
        }else{
          if(checkedNodes.length <lastCheckedVegetables.length){
            _.each(lastCheckedVegetables,function (o) {
              var isChecked = _.findIndex(checkedNodes,function (checked) {
                return checked._id == o._id;
              });
              if(isChecked == -1){
                var unCheckedIdx = _.findIndex(vm.vegetables,function (one) {
                  return one._id == o._id;
                });
                vm.vegetables.splice(unCheckedIdx,1);
              }
            });
          }else{
            _.each(checkedNodes,function (o) {
              var isChecked = _.findIndex(vm.vegetables,function (vg) {
                return vg._id == o._id;
              });
              if(isChecked == -1){
                vm.vegetables.push(o);
              }
            });
          }
          lastCheckedVegetables = checkedNodes;
        }
        priceChange();
      });
    }

    function meatsSearch() {
      var mealsPromise = mealSearch(vm.meatsPy,'A0000');
      // console.log('mealsPromise:',mealsPromise);
      vmh.parallel([mealsPromise]).then(function (results) {
        // console.log('meats search results:',results[0]);
        buildTrees(0,results[0],vegetables);
      });
    }

    function vegetablesSearch() {
      vmh.parallel([mealSearch(vm.vegetablesPy,'A0001')]).then(function (results) {
        // console.log('vegetables search results :',results[0]);
        buildTrees(1,meats ,results[0]);
      });
    }

    function mealSearch(py,dishes) {
      var _matches_;
      if(py){
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
        _matches_={keyword:regIn,col_names:['py','name']};
      }else {
        _matches_ = undefined;
      }
      return vmh.shareService._tmp('T3001/psn-mealDish', 'name price nature py', {tenantId: vm.tenantId, status: 1, stop_flag: false,_matches_:_matches_}, {'py':1},null, true).then(function (nodes) {
        var filterMeals = [];
        _.each(nodes,function (o) {
          if(o.nature == dishes){
            filterMeals.push(o);
          }
        });
        return filterMeals;
      });
    }

    function buildTrees(index,treeData1,treeData2) {
      if(vm.trees && vm.trees.length == 2 && index >= 0){
        var treeId = index == 0 ? 'tree1': 'tree2';
        var treeData = index == 0 ? treeData1: treeData2;
        vm.trees[index] = new vmh.treeFactory.sTree(treeId, treeData, {mode: 'check'});
      } else {
        console.log('index:', index);
        vm.trees = [new vmh.treeFactory.sTree('tree1', treeData1, {mode: 'check'}), new vmh.treeFactory.sTree('tree2', treeData2, {mode: 'check'})];
      }
      console.log('buildTrees vm.trees:',vm.trees);
      showCheckedMeals(index);
    }

    function showCheckedMeals(index) {
      var isChecked;
      var vmMeals = index==0? vm.meats : vm.vegetables;
      _.each(vmMeals ,function (o) {
        isChecked = _.findIndex(vm.trees[index].treeData,function (meat) {
          return meat._id == o._id;
        });
        if(isChecked != -1){
          console.log('vm.trees[index].inputCheckedIndex:',vm.trees[index].inputCheckedIndex);
          vm.trees[index].inputCheckedIndex[isChecked]=true;
          vm.trees[index].checkedNodes.push(o);
          console.log('after?',vm.trees[index].inputCheckedIndex);
        }
      });
      console.log('showCheckedMeals vm.trees----:',vm.trees);
      if(index==0){
        lastCheckedMeats = vm.trees[index].checkedNodes;
      }else if(index==1){
        lastCheckedVegetables = vm.trees[index].checkedNodes;
      }
      console.log('after search lastCheckedVegetables:',lastCheckedVegetables,'lastCheckedMeats:',lastCheckedMeats);
    }

    function priceChange() {
      vm.model.price = 0;
      vm.model.dishes = vm.meats.concat(vm.vegetables);
      // console.log('vm.model.dishes-->', vm.model.dishes);
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