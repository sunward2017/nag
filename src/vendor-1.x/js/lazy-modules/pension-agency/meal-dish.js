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
            vm.query();
        }
    }

    MealDishDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM','$timeout'];

    function MealDishDetailsController($scope, ngDialog, vmh, vm,$timeout) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;
        vm.isDishNameUsed = isDishNameUsed;


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
          vm.modelService.query({tenantId: vm.tenantId,name:vm.model.name},'name').$promise.then(function (ret) {
            console.log('ret:',ret);
            if(ret.length>0){
              vm.nameUsed = true;
            }else {
              vm.nameUsed=false;
            }
          });
          $timeout(function () {
            vm.nameUsed=undefined;
          },3000);
        }

        function doSubmit() {

            if ($scope.theForm.$valid) {
                console.log('submit vm.model:',vm.model);
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