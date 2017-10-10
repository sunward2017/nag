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

    MealDishDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function MealDishDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


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