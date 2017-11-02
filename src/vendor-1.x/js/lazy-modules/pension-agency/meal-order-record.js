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
    var tenantService = vm.modelNode.services['pub-tenant'];
    init();

    function init() {

      vm.init({removeDialog: ngDialog});

      vm.preDay = preDay;
      vm.nextDay = nextDay;

      // vmh.shareService.d('D3040').then(function (nodes) {
      //   // console.log('xAxisData:',nodes);
      //   vm.xAxisData = nodes;
      // });

      vmh.parallel([
        vmh.shareService.d('D3040'),
        tenantService.query({_id: vm.model['tenantId']}, 'other_config')
      ]).then(function (results) {
        var nodes = results[0];
        var meal_periods = results[1][0].other_config.psn_meal_periods || [];
        var len = meal_periods.length;
        if (len > 0 && len < nodes.length) {
          vm.xAxisData = _.filter(nodes, function (node) {
            return _.contains(meal_periods, node.value)
          });
        } else {
          vm.xAxisData = nodes;
        }
      });

      vm.model.order_date = moment(new Date()).format('YYYY-MM-DD');
      console.log('vm.model.order_date:', vm.model.order_date);

      fetchMealOrderRecord(vm.tenantId, vm.model.order_date);

    }

    function fetchMealOrderRecord(tenantId, order_date) {
      vmh.blocking(vmh.psnService.mealOrderRecord(tenantId, order_date).then(function (rows) {
        console.log('rows:', rows);
        vm.rows = rows;
      }));

      vmh.blocking(vmh.psnService.mealOrderRecordStat(tenantId, order_date).then(function (rows) {
        console.log('stat rows:', rows);
      }));
    }

    function preDay() {
      vm.model.order_date = moment(vm.model.order_date).subtract(1, 'd').format('YYYY-MM-DD');
      console.log('pre date:', vm.model.order_date);
      fetchMealOrderRecord(vm.tenantId, vm.model.order_date);
    }

    function nextDay() {
      vm.model.order_date = moment(vm.model.order_date).add(1, 'd').format('YYYY-MM-DD');
      console.log('next day:', vm.model.order_date);
      fetchMealOrderRecord(vm.tenantId, vm.model.order_date);
    }


  }


})();