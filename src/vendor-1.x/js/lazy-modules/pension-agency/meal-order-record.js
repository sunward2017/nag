/**
 * Created by hcl on 17-9-26.
 *
 */
(function() {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('MealOrderRecordController', MealOrderRecordController)
    ;


    MealOrderRecordController.$inject = ['$scope', 'ngDialog', 'vmh', 'instanceVM'];

    function MealOrderRecordController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;

        init();

        function init() {

            vm.init({removeDialog: ngDialog});

            vm.preDay = preDay;
            vm.nextDay = nextDay;

            vmh.shareService.d('D3040').then(function (nodes) {
                // console.log('xAxisData:',nodes);
                vm.xAxisData = nodes;
            });

            vm.model.order_date = new Date();
            // console.log('vm.model.order_date:',vm.model.order_date);
        }


        function preDay() {
            vm.model.order_date =moment(vm.model.order_date).subtract(1,'d').format('YYYY-MM-DD');
            console.log('pre date:',vm.model.order_date);
        }
        function nextDay() {
            vm.model.order_date =moment(vm.model.order_date).add(1,'d').format('YYYY-MM-DD');
            console.log('next day:',vm.model.order_date);
        }



    }


})();