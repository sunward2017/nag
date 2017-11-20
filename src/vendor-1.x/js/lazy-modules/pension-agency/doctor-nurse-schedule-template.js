/**
 * Created by hcl on 17-11-13.
 * 养老机构  -> 医护排班模板
 */
(function() {
  'use strict';

  angular
      .module('subsystem.pension-agency')
      .controller('DoctorNurseScheduleTemplateGridController', DoctorNurseScheduleTemplateGridController)
      .controller('DoctorNurseScheduleTemplateDetailsController', DoctorNurseScheduleTemplateDetailsController)
  ;


  DoctorNurseScheduleTemplateGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function DoctorNurseScheduleTemplateGridController($scope, ngDialog, vmh, vm) {

    $scope.vm = vm;
    $scope.utils = vmh.utils.g;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});
      vm.query();
    }
  }

  DoctorNurseScheduleTemplateDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function DoctorNurseScheduleTemplateDetailsController($scope, ngDialog, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;


    init();

    function init() {

      vm.init({removeDialog: ngDialog});

      vm.doSubmit = doSubmit;
      vm.enterGridEditMode = enterGridEditMode;
      vm.exitGridEditMode = exitGridEditMode;
      vm.selectGrid = selectGrid;
      vm.selectGridCol = selectGridCol;
      vm.selectGridRow = selectGridRow;
      vm.selectGridCell = selectGridCell;
      vm.replaceSelected = replaceSelected;
      vm.appendSelected = appendSelected;
      vm.removeSelected = removeSelected;
      vm.tab1 = {cid: 'contentTab1'};

      vm.aggrValuePromise = vmh.shareService.tmp('T3001/psn-nursingShift', 'code name', {tenantId: vm.tenantId, status: 1, stop_flag: false}).then(function (treeNodes) {
        vm.selectBinding.nursingShifts = treeNodes;
        return treeNodes;
      });

      vm.yAxisDataPromise = vmh.shareService.tmp('T3001/psn-doctor', 'name', {tenantId:vm.tenantId, status: 1, stop_flag: false}).then(function (nodes1) {
        vm.nodes1=nodes1;
        return vmh.shareService.tmp('T3001/psn-nurse', 'name', {tenantId:vm.tenantId, status: 1, stop_flag: false}).then(function (nodes2) {
          vm.nodes2 = nodes2;
          return nodes1.concat(nodes2);
        });
      });
      console.log('vm.yAxisDataPromise:',vm.yAxisDataPromise);

      vm.load().then(function(){
        vm.raw$stop_flag = !!vm.model.stop_flag;
        //构造类型表格
        var x_axis = vm.model.templateType == 'A0001' ? 'weekAxis' :'monthAxis';
        vmh.clientData.getJson(x_axis).then(function (data) {
          vm.xAxisData = data;
          vm.cols = {};
          for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
            var colId = vm.xAxisData[j]._id;
            vm.cols[colId] = false;//selectedCol control variable
          }
        });

        if (vm.model.content) {
          parseTemplateContent();
        }
      });

    }

    function parseTemplateContent() {
      console.log('parse content');
      var nursingShifts = vm.selectBinding.nursingShifts;
      var yAxisData = [];
      vm.aggrData = {};
      for(var i=0,len=vm.model.content.length;i<len;i++) {
        var aggrPoint = vm.model.content[i];
        var aggrY = vm.aggrData[aggrPoint.y_axis];
        if (!aggrY){
          aggrY = vm.aggrData[aggrPoint.y_axis] = {};

          yAxisData.push({_id: aggrPoint.y_axis});
        }
        var doctorNurseObject = _.find(nursingShifts, function(o){
          return o._id == aggrPoint.aggr_value
        })

        if(!aggrY[aggrPoint.x_axis]){
          aggrY[aggrPoint.x_axis] = [];
        }
        aggrY[aggrPoint.x_axis].push(doctorNurseObject);
      }
      vm.yAxisData = yAxisData;
    }

    function enterGridEditMode () {
      vm.gridEditing = true;
      if (!vm.aggrData) {
        vm.aggrData = {};
      }
      if (!vm.cells) {
        vm.cells = {};
      }
      for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
        var rowId = vm.yAxisData[i]._id;
        var rowDataObject = vm.aggrData[rowId];
        if (!rowDataObject) {
          rowDataObject = vm.aggrData[rowId] = {};
        }
        var rowCellsObject = vm.cells[rowId];
        if (!rowCellsObject) {
          rowCellsObject = vm.cells[rowId] = {'row-selected': false};
        }
        for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
          var colId = vm.xAxisData[j]._id;
          var aggrValue = rowDataObject[colId];
          if(aggrValue === undefined) {
            rowDataObject[colId] = []; //""=>[]
          }
          var cell = rowCellsObject[colId];
          if(cell === undefined) {
            rowCellsObject[colId] = false;
          }
        }
      }
    }

    function exitGridEditMode () {
      _unSelectAll();
      vm.gridEditing = false;
    }

    function _unSelectAll () {
      for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
        var rowId = vm.yAxisData[i]._id;
        if (vm.cells[rowId]) {
          vm.cells[rowId]['row-selected'] = false;
          for (var j = 0, xlen = vm.xAxisData.length; j < xlen; j++) {
            var colId = vm.xAxisData[j]._id;
            vm.cells[rowId][colId] = false;
            if (vm.cols[colId]) {
              vm.cols[colId] = false;
            }
          }
        }
      }
    }

    function _checkWholeRowIsSelected (rowId) {
      var wholeRowSelected = true;
      for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
        var colId2 = vm.xAxisData[j]._id;
        wholeRowSelected = wholeRowSelected  && vm.cells[rowId][colId2];
        if (!wholeRowSelected){
          break;
        }
      }
      return wholeRowSelected;
    }

    function _checkWholeColIsSelected (colId) {
      var wholeColSelected = true;
      for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
        var rowId = vm.yAxisData[i]._id;
        wholeColSelected = wholeColSelected  && vm.cells[rowId][colId];
        if (!wholeColSelected){
          break;
        }
      }
      return wholeColSelected;
    }

    function selectGrid() {
      if(!vm.gridEditing) return;
      for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
        var rowId = vm.yAxisData[i]._id;
        selectGridRow(rowId);
      }
    }

    function selectGridCol(colId) {
      if(!vm.gridEditing) return;
      var newColSelected = vm.cols[colId] = !vm.cols[colId]
      for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
        var rowId = vm.yAxisData[i]._id;
        vm.cells[rowId][colId] = newColSelected;
        vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
      }
    }

    function selectGridRow(rowId) {
      if(!vm.gridEditing) return;
      var newRowSelected = vm.cells[rowId]['row-selected'] = !vm.cells[rowId]['row-selected'];
      for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
        var colId = vm.xAxisData[j]._id;
        vm.cells[rowId][colId] = newRowSelected;
        vm.cols[colId] = _checkWholeColIsSelected(colId);
      }
    }

    function selectGridCell (rowId, colId) {
      if(!vm.gridEditing) return;
      vm.cells[rowId][colId] = !vm.cells[rowId][colId];
      vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
      vm.cols[colId] = _checkWholeColIsSelected(colId);
    }

    function replaceSelected () {
      saveSelected(true);
    }

    function appendSelected () {
      saveSelected(false);
    }

    function saveSelected (isReplace) {
      if (!vm.selectedNursingShifts || vm.selectedNursingShifts.length == 0) {
        vmh.alertWarning(vm.viewTranslatePath('MSG-NO-PICK-NURSING_SHIFT'), true);
        return;
      }
      var selectedNursingShifts = _.map(vm.selectedNursingShifts, function (o) {
        return {_id: o._id, id: o.id, name: o.name};
      });
      for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
        var rowId = vm.yAxisData[i]._id;
        for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
          var colId = vm.xAxisData[j]._id;
          if (vm.cells[rowId][colId]) {
            vm.cells[rowId][colId] = false;
            vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
            vm.cols[colId] = _checkWholeColIsSelected(colId);

            if (isReplace) {
              vm.aggrData[rowId][colId] = selectedNursingShifts;
            } else {
              // 追加
              var arr = vm.aggrData[rowId][colId];
              _.each(selectedNursingShifts, function (o) {
                var findIndex = _.findIndex(arr, function (o2) {
                  return o.id == o2.id
                });
                if (findIndex == -1) {
                  console.log('o:', o);
                  arr.push(o);
                }
              });
            }
          }
        }
      }
    }

    function removeSelected () {
      if(vm.aggrData) {
        for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
          var rowId = vm.yAxisData[i]._id;
          if(vm.aggrData[rowId]) {
            for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
              var colId = vm.xAxisData[j]._id;
              var date = vm.xAxisData[j].value;
              if (vm.cells[rowId][colId]) {
                vm.cells[rowId][colId] = false;
                vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
                vm.cols[colId] = _checkWholeColIsSelected(colId);
                if (vm.aggrData[rowId][colId]) {
                  vm.aggrData[rowId][colId] = [];
                }
              }
            }
          }
        }
      }
    }

    function doSubmit() {
      if ($scope.theForm.$valid) {
        var findDoctorNurseToSaveTemplate = false;
        vm.model.content = [];
        if(vm.aggrData) {
          var type;
          for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
            var rowId = vm.yAxisData[i]._id;
            if(vm.aggrData[rowId]) {
              var doctorIndex = _.findIndex(vm.nodes1, function (o) {
                return rowId == o._id
              });
              console.log('doctorIndex:',doctorIndex);
              if (doctorIndex == -1){
                type = 'A0002';
              }else {
                type = 'A0001';
              }
              for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                var colId = vm.xAxisData[j]._id;
                if(vm.aggrData[rowId][colId]) {
                  var assignedWorkers = vm.aggrData[rowId][colId];
                  for(var k=0,zlen = assignedWorkers.length;k<zlen;k++) {
                    vm.model.content.push({x_axis: colId, y_axis: rowId, aggr_value: assignedWorkers[k],type:type});
                    if(!findDoctorNurseToSaveTemplate) {
                      findDoctorNurseToSaveTemplate = true;
                    }
                  }
                }
              }
            }
          }
        }
        console.log('vm.model:',vm.model);
        if(!findDoctorNurseToSaveTemplate) {
          vmh.alertWarning(vm.viewTranslatePath('MSG-NO-NURSING_SHIFT-FOR-NURSING_WORKER'), true);
          return;
        }
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