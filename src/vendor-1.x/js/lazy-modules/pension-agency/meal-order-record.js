/**
 * Created by hcl on 17-9-26.
 *
 */
(function() {
  'use strict';

  angular
    .module('subsystem.pension-agency')
    .controller('MealOrderRecordController', MealOrderRecordController)
    .controller('MealOrderRecordDetailController', MealOrderRecordDetailController)
    .filter('cookerViewDistrictCellFilter', cookerViewDistrictCellFilter)
  ;

  MealOrderRecordController.$inject = ['$scope', 'ngDialog', 'vmh', 'instanceVM'];
  function MealOrderRecordController($scope, ngDialog, vmh, vm) {
    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.g;
    var tenantService = vm.modelNode.services['pub-tenant'];
    init();
    vm.dateChange = dateChange;
    vm.changeViewPoint = changeViewPoint;
    vm.exportExcelForMealOrderRecord = exportExcelForMealOrderRecord;

    function init() {

      vm.init({removeDialog: ngDialog});
      vm.preDay = preDay;
      vm.nextDay = nextDay;
      vm.cookerView = false;

      vmh.parallel([
        vmh.shareService.d('D3040'),
        tenantService.query({_id: vm.model['tenantId']}, 'other_config'),
        vm.modelNode.services['psn-district'].query({tenantId: vm.model['tenantId']}, 'name',{'name': 1})
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
        vm.y={};
        _.each(vm.xAxisData ,function (o) {
          vm.y[o.value]=o.name;
        });
        vm.districts = results[2];
        console.log('vm.districts:',vm.districts);
        vm.model.order_date = moment(new Date()).format('YYYY-MM-DD');
        fetchMealOrderRecordSummary(vm.tenantId, vm.model.order_date);
      });
      
    }

    function fetchMealOrderRecordSummary(tenantId, order_date) {
      vmh.blocking(vmh.psnService.mealOrderRecordStat(tenantId, order_date).then(function (rows) {
        console.log('stat rows:', rows);
        vm.rows = rows;
      }));
      vmh.psnService.mealOrderRecordStat2(tenantId, order_date).then(function (rows) {
        _.each(rows,function (period) {
          _.each(period.meals,function (meal) {
            var mealDistrictIds=_.map(meal.districts,function (d) {
              return d.districtId;
            });
            // console.log('mealDistrictIds:',mealDistrictIds);
            _.each(vm.districts,function (district,idx) {
              if(mealDistrictIds.indexOf(district.id)==-1){
                meal.districts.splice(idx,0,{});
                console.log('meal.districts:',period.period+meal.meal_name,meal.districts);
              }
            });
          });
        });
        console.log('stat2 rows:', rows);
        vm.rows2 = rows;
      });
    }

    function preDay(){
      vm.model.order_date = moment(vm.model.order_date).subtract(1, 'd').format('YYYY-MM-DD');
      console.log('pre date:', vm.model.order_date);
      fetchMealOrderRecordSummary(vm.tenantId, vm.model.order_date);
    }

    function nextDay(){
      vm.model.order_date = moment(vm.model.order_date).add(1, 'd').format('YYYY-MM-DD');
      console.log('next day:', vm.model.order_date);
      fetchMealOrderRecordSummary(vm.tenantId, vm.model.order_date);
    }

    function dateChange() {
      vm.model.order_date=moment(vm.model.order_date).format('YYYY-MM-DD');
      fetchMealOrderRecordSummary(vm.tenantId, vm.model.order_date);
    }
    
    function changeViewPoint() {
      vm.cookerView=!vm.cookerView;
    }

    function exportExcelForMealOrderRecord(rowData) {
      var title=['餐名'];
      _.each(vm.districts, function (o) {
        title.push(o.name);
      });
      var rows = _.map(rowData.meals,(meal)=>{
        var row={};
        row[title[0]] = meal.meal_name;
        _.each(meal.districts,(district,idx)=>{
          var rooms=[];
          _.each(district.elderlys,(elderly)=>{
            rooms.push(elderly.room_name+'-'+elderly.bed_no);
          });
          row[title[idx+1]] =rooms.join();
        });
        return row
      });
      console.log('excel rows:',rows,'title:',title);
      vmh.psnService.dataByClient('订餐记录信息表(' + vm.tenant_name + '-' + vm.model.order_date+'-' +vm.y[rowData.period]+')',rows ,title);
    }
  }


  MealOrderRecordDetailController.$inject = ['$scope', 'ngDialog', 'vmh', 'instanceVM','$state'];

  function MealOrderRecordDetailController($scope, ngDialog, vmh, vm, $state) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;
    var tenantService = vm.modelNode.services['pub-tenant'];
    vm.onRoomChange = onRoomChange;
    vm.dateChange = dateChange;
    vm.preDay = preDay;
    vm.nextDay = nextDay;
    init();

    function init() {
      vm.model={
        districtId:vm.getParam('_id'),
        floor:vm.getParam('floor'),
        order_date:vm.getParam('date')
      };
      console.log('vm.model:',vm.model);
      vm.init({removeDialog: ngDialog});
      vm.yAxisDataPromise = vmh.shareService.tmp('T3009', null, {tenantId: vm.tenantId}).then(function (nodes) {
        if(vm.model.districtId){
          var districtNode = _.find(nodes,function (node) {
            return node._id == vm.model.districtId
          });
          var floorNode =_.find(districtNode.children,function (node) {
            return node._id == 'floor' + vm.model.floor + '#';
          });
          vm.yAxisData = floorNode.children;
          console.log('vm.yAxisData:',vm.yAxisData);

          fetchMealOrderRecord(vm.tenantId, vm.model.order_date, _.map(vm.yAxisData, function (o) {
            return o._id
          }));
        }
        return nodes;
      });

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
    }

    function fetchMealOrderRecord(tenantId, order_date,roomIds) {
      vmh.blocking(vmh.psnService.mealOrderRecord(tenantId, order_date,roomIds).then(function (rows) {
        console.log('mealOrderRecord rows:', rows);
        vm.rows = rows;
      }));
    }

    function onRoomChange() {
      console.log('vm.yAxisData:',vm.yAxisData);
      fetchMealOrderRecord(vm.tenantId, vm.model.order_date, _.map(vm.yAxisData, function (o) {
        return o._id
      }));
    }

    function preDay(){
      vm.model.order_date = moment(vm.model.order_date).subtract(1, 'd').format('YYYY-MM-DD');
      console.log('pre date:', vm.model.order_date);
      $state.go(vm.transTo.mealOrderRecordDetail,{date:vm.model.order_date});
      fetchMealOrderRecord(vm.tenantId, vm.model.order_date,_.map(vm.yAxisData, function (o) {
        return o._id
      }));
    }

    function nextDay(){
      vm.model.order_date = moment(vm.model.order_date).add(1, 'd').format('YYYY-MM-DD');
      console.log('next day:', vm.model.order_date);
      $state.go(vm.transTo.mealOrderRecordDetail,{date:vm.model.order_date});
      fetchMealOrderRecord(vm.tenantId, vm.model.order_date,_.map(vm.yAxisData, function (o) {
        return o._id
      }));
    }

    function dateChange() {
      vm.model.order_date=moment(vm.model.order_date).format('YYYY-MM-DD');
      $state.go(vm.transTo.mealOrderRecordDetail,{date:vm.model.order_date});
      fetchMealOrderRecord(vm.tenantId, vm.model.order_date,_.map(vm.yAxisData, function (o) {
        return o._id
      }));
    }
  }

  function cookerViewDistrictCellFilter() {
    return cookerViewDistrictCellFormatter;
  }

  function cookerViewDistrictCellFormatter(cellObject, key, key2) {
    if (!cellObject || !angular.isArray(cellObject) || cellObject.length === 0)
      return '';
    return cellObject.map(function (o) {
        return o[key]+'-'+o[key2]
    }).join()
  }

})();