/**
 * Created by hcl on 17-9-22.
 */
(function() {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('MealDishGridController', MealDishGridController)
        .controller('MealDishDetailsController', MealDishDetailsController)
    ;


    MealDishGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function MealDishGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.batchCreatePy = batchCreatePy;
            vm.query();
        }

        function batchCreatePy() {
          vmh.blocking(vmh.psnService.batchCreatePy(vm.tenantId,'psn_mealDish','name').then(function () {
            vmh.alertSuccess();
          }));
        }
    }

    MealDishDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function MealDishDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;
        vm.isDishNameUsed = isDishNameUsed;
        vm.getInitial = getInitial;
        console.log('vm._action_:',vm._action_);


        init();

        function init() {

            vm.init({removeDialog: ngDialog});


            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};

            vmh.shareService.d('D3039').then(function(rows) {
                vm.selectBinding.nature = rows;
            });

            vm.load();

        }

        function isDishNameUsed() {
          return vm.modelService.query({tenantId: vm.tenantId,name:vm.model.name,status:1},'name').$promise.then(function (ret) {
            console.log('ret:',ret);
            if(ret.length>0){
              vm.nameUsed = true;
              if(vm._action_ == 'edit'){
                var isSelf = _.find(ret,function (o) {
                  return o._id == vm._id_;
                });
                console.log('isSelf:',isSelf);
                if(isSelf){
                  vm.nameUsed = false;
                }
              }
            }else {
              vm.nameUsed=false;
            }
            return vm.nameUsed;
          });
        }

        function getInitial() {
            var initialArr = slugify(vm.model.name).split('-');
            vm.model.py = _.map(initialArr,function (o) {
              return o[0];
            }).join('');
            console.log('vm.model.py:',vm.model.py);
        }
        function doSubmit() {
            var p=vm.isDishNameUsed().then(function (nameRet) {
              console.log('nameRet:',nameRet);
              if ($scope.theForm.$valid && nameRet===false) {
                console.log('submit vm.model:',vm.model);
                vm.save();
              }
              else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                  vm.tab1.active = true;
                }
              }
            });
            // console.log('p:',p);
        }


    }

})();