/**
 * Created by hcl on 17-11-13.
 * 养老机构  -> 医护排班
 */
(function() {
  'use strict';

  angular
      .module('subsystem.pension-agency')
      .controller('DoctorNurseScheduleController', DoctorNurseScheduleController)
      .controller('DoctorNurseScheduleSaveAsTemplateController', DoctorNurseScheduleSaveAsTemplateController)
  ;

  DoctorNurseScheduleController.$inject = ['$scope', 'ngDialog', 'vmh', 'instanceVM'];

  function DoctorNurseScheduleController($scope, ngDialog, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;

    init();

    function init() {

      vm.init({removeDialog: ngDialog});

      vm.preWeek = preWeek;
      vm.nextWeek = nextWeek;
      vm.selectGrid = selectGrid;
      vm.selectGridCol = selectGridCol;
      vm.selectGridRow = selectGridRow;
      vm.selectGridCell = selectGridCell;
      vm.replaceSelected = replaceSelected;
      vm.appendSelected = appendSelected;
      vm.removeSelected = removeSelected;
      vm.importTemplate = importTemplate;
      vm.saveAsTemplate = saveAsTemplate;
      vm.changeView= changeView;
      vm.tab1 = {cid: 'contentTab1'};

      fetchDoctorNurseScheduleTemplates();
      vm.aggrValuePromise = vmh.shareService.tmp('T3001/psn-nursingShift', 'code name', {tenantId: vm.tenantId, status: 1, stop_flag: false}).then(function (nodes) {
        vm.selectBinding.nursingShifts = nodes;
        console.log('nursingShift:', nodes);
        return nodes;
      });
      vmh.parallel([
        vmh.shareService.tmp('T3001/psn-doctor', 'name', {tenantId: vm.tenantId, status: 1, stop_flag: false}),
        vmh.shareService.tmp('T3001/psn-nurse', 'name', {tenantId: vm.tenantId, status: 1, stop_flag: false}),
        vmh.shareService.d('D3042')
      ]).then(function (results) {
        vm.yAxisData1 = results[0];
        vm.yAxisData2 = results[1];
        vm.yAxisData = vm.yAxisData1.concat(vm.yAxisData2);
        console.log('vm.yAxisData :',vm.yAxisData );
        vm.selectBinding.type = results[2];
        vm.table_type = 'A0000';
      });

      vm.baseWeek = 0;
      loadWeek();

    }
    function changeView() {
      console.log('vm.table_type:',vm.table_type);
      if(vm.table_type=='A0000'){
        vm.yAxisData = vm.yAxisData1.concat(vm.yAxisData2);
      }else if(vm.table_type=='A0001'){
        vm.yAxisData=vm.yAxisData1;
      }else if(vm.table_type=='A0002'){
        vm.yAxisData=vm.yAxisData2;
      }
    }


    function fetchDoctorNurseScheduleTemplates () {
      vmh.shareService.tmp('T3001/psn-doctorNurseScheduleTemplate', 'name', {tenantId: vm.tenantId, status: 1, stop_flag: false}, null, true).then(function (treeNodes) {
        vm.selectBinding.doctorNurseScheduleTemplates = treeNodes;
      });
    }

    function preWeek() {
      loadWeek(-1);
    }
    function nextWeek() {
      loadWeek(1);
    }
    function loadWeek(delta) {
      vm.baseWeek += delta || 0;
      return vmh.blocking(vmh.shareService.tmp('T0100', null, {delta: vm.baseWeek}, null, true).then(function (treeNodes) {
        vm.xAxisData = treeNodes;
        vm.cols = {};
        for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
          var colId = vm.xAxisData[j]._id;
          vm.cols[colId] = false;//selectedCol control variable
        }
        queryDoctorNurseSchedule();
      }));
    }

    function queryDoctorNurseSchedule() {
      var start = vm.xAxisData[0].value;
      var end = vm.xAxisData[vm.xAxisData.length-1].value;
      vmh.psnService.doctorNurseScheduleWeekly(vm.tenantId, start, end).then(parseDoctorNurseSchedule);
    }

    function parseDoctorNurseSchedule(doctorNurseSchedule) {
      console.log('parse doctorNurseSchedule:',doctorNurseSchedule);
      var doctorNurseScheduleItems = doctorNurseSchedule.items;
      var nursingShifts = vm.selectBinding.nursingShifts;
      vm.aggrData = {};

      // 确保vm.aggrData[rowId] 存在并初始化
      for (var i=0,len= vm.yAxisData.length;i<len;i++) {
        var rowId = vm.yAxisData[i]._id;
        if (!vm.aggrData[rowId]) {
          vm.aggrData[rowId] = {};
        }
      }

      _.each(doctorNurseScheduleItems,function (doctorNurseScheduleItem) {
        var nursingShiftObject = _.find(nursingShifts, function(o){
          return o._id == doctorNurseScheduleItem.aggr_value
        });
        if (nursingShiftObject) {
          if (!vm.aggrData[doctorNurseScheduleItem.y_axis]) {
            vm.aggrData[doctorNurseScheduleItem.y_axis] = {};
          }
          if (!vm.aggrData[doctorNurseScheduleItem.y_axis][doctorNurseScheduleItem.x_axis_value]){
            vm.aggrData[doctorNurseScheduleItem.y_axis][doctorNurseScheduleItem.x_axis_value] = [];
          }
          vm.aggrData[doctorNurseScheduleItem.y_axis][doctorNurseScheduleItem.x_axis_value].push(nursingShiftObject);
        }
      });
      console.log('vm.aggrData......:', vm.aggrData);
      enterGridEditMode();
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
            rowDataObject[colId] = []; // "" => []
          }
          var cell = rowCellsObject[colId];
          if(cell === undefined) {
            rowCellsObject[colId] = false;
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
        vmh.alertWarning(vm.moduleTranslatePath('MSG-NO-PICK_NURSING_SHIFT'), true);
        return;
      }
      console.log('vm.selectedNursingShifts:', vm.selectedNursingShifts);
      var selectedNursingShifts = _.map(vm.selectedNursingShifts, function (o) {
        return {_id: o._id, id: o.id, name: o.name};
      });
      var toSaveRows = [];
      for(var i=0, ylen = vm.yAxisData1.length;i< ylen;i++) {
        var rowId = vm.yAxisData1[i]._id;
        for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
          var colId = vm.xAxisData[j]._id;
          var date = vm.xAxisData[j].value;
          if (vm.cells[rowId][colId]) {
            vm.cells[rowId][colId] = false;
            vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
            vm.cols[colId] = _checkWholeColIsSelected(colId);

            if (isReplace) {
              vm.aggrData[rowId][colId] = selectedNursingShifts;
              _.each(selectedNursingShifts, function (o){
                toSaveRows.push({ x_axis: date, y_axis: rowId, aggr_value: o.id ,type:'A0001'});
              });
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
              _.each(arr, function(o){
                toSaveRows.push({ x_axis: date, y_axis: rowId, aggr_value: o.id ,type:'A0001'});
              });
            }
          }
        }
      }
      for(var a=0, aylen = vm.yAxisData2.length;a< aylen;a++) {
        var rowId = vm.yAxisData2[a]._id;
        for (var b=0, bxlen = vm.xAxisData.length;b<bxlen;b++) {
          var colId = vm.xAxisData[b]._id;
          var date = vm.xAxisData[b].value;
          if (vm.cells[rowId][colId]) {
            vm.cells[rowId][colId] = false;
            vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
            vm.cols[colId] = _checkWholeColIsSelected(colId);

            if (isReplace) {
              vm.aggrData[rowId][colId] = selectedNursingShifts;
              _.each(selectedNursingShifts, function (o){
                toSaveRows.push({ x_axis: date, y_axis: rowId, aggr_value: o.id ,type:'A0002'});
              });
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
              _.each(arr, function(o){
                toSaveRows.push({ x_axis: date, y_axis: rowId, aggr_value: o.id ,type:'A0002'});
              });
            }
          }
        }
      }
      console.log('toSaveRows:',toSaveRows);
      if(toSaveRows.length > 0) {
        vmh.psnService.doctorNurseScheduleSave(vm.tenantId, toSaveRows).then(function(){
          vmh.alertSuccess();
        });
      }
    }

    function removeSelected () {
      ngDialog.openConfirm({
        template: 'removeConfirmDialog.html',
        className: 'ngdialog-theme-default'
      }).then(function () {
        var toRemoveRows = [];
        for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
          var rowId = vm.yAxisData[i]._id;
          for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
            var colId = vm.xAxisData[j]._id;
            var date = vm.xAxisData[j].value;
            if (vm.cells[rowId][colId]) {
              vm.cells[rowId][colId] = false;
              vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
              vm.cols[colId] = _checkWholeColIsSelected(colId);
              if (vm.aggrData[rowId][colId]) {
                vm.aggrData[rowId][colId] = null;
                toRemoveRows.push({ x_axis: date, y_axis: rowId });
              }
            }
          }
        }
        console.log('toRemoveRows:',toRemoveRows);
        if(toRemoveRows.length > 0) {
          vmh.psnService.doctorNurseScheduleRemove(vm.tenantId, toRemoveRows).then(function(){
            vmh.alertSuccess('notification.REMOVE-SUCCESS', true);
          });
        }
      });
    }

    function importTemplate () {
      if (!vm.selectedDoctorNurseScheduleTemplate) {
        vmh.alertWarning(vm.moduleTranslatePath('MSG-NO-PICK-NURSING_WORKER_SCHEDULE_TEMPLATE'), true);
        return;
      }

      ngDialog.openConfirm({
        template: 'customConfirmDialog.html',
        className: 'ngdialog-theme-default',
        controller: ['$scope', function ($scopeConfirm) {
          $scopeConfirm.message = vm.moduleTranslatePath('DIALOG-IMPORT-MESSAGE')
        }]
      }).then(function () {
        var toImportXAxisRange = vm.xAxisData.map(function (o) {return o.value });
        vmh.psnService.doctorNurseScheduleTemplateImport(vm.selectedDoctorNurseScheduleTemplate._id, toImportXAxisRange).then(function(){
          vmh.alertSuccess('notification.NORMAL-SUCCESS', true);
          loadWeek();
        });
      });
    }

    function saveAsTemplate () {
      var toSaveRows = [];
      var findDoctorNurseToSaveTemplate = false;
      var type;
      for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
        var rowId = vm.yAxisData[i]._id;
        var doctorIndex = _.findIndex(vm.yAxisData1, function (o) {
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
              toSaveRows.push({ x_axis: moment(vm.xAxisData[j].value).day(), y_axis: rowId, aggr_value: assignedWorkers[k] ,type:type});
              if(!findDoctorNurseToSaveTemplate) {
                findDoctorNurseToSaveTemplate = true;
              }
            }
          }
        }
      }

      if(!findDoctorNurseToSaveTemplate) {
        vmh.alertWarning(vm.moduleTranslatePath('MSG-SAVE-AS-TEMPLATE-DATA-INVALID'), true);
        return;
      }

      ngDialog.open({
        template: 'nursing-worker-schedule-save-as-template.html',
        controller: 'DoctorNurseScheduleSaveAsTemplateController',
        className: 'ngdialog-theme-default ngdialog-nursing-worker-schedule-save-as-template',
        data: {
          vmh: vmh,
          moduleTranslatePathRoot: vm.moduleTranslatePath(),
          tenantId: vm.tenantId,
          doctorNurseScheduleTemplates: vm.selectBinding.doctorNurseScheduleTemplates,
          toSaveRows: toSaveRows
        }
      }).closePromise.then(function (ret) {
        console.log('saveAsTemplate closeDialog:',ret.value);
        if(ret.value!='$document' && ret.value!='$closeButton' && ret.value!='$escape' ) {
          if(ret.value === true){
            fetchDoctorNurseScheduleTemplates();
          }
        }
      });
    }
  }

  DoctorNurseScheduleSaveAsTemplateController.$inject = ['$scope', 'ngDialog'];

  function DoctorNurseScheduleSaveAsTemplateController($scope, ngDialog) {

    var vm = $scope.vm = {};
    var vmh = $scope.ngDialogData.vmh;

    $scope.utils = vmh.utils.v;

    init();

    function init() {
      vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
      vm.moduleTranslatePath = function(key) {
        return vm.moduleTranslatePathRoot + '.' + key;
      };
      vm.tenantId = $scope.ngDialogData.tenantId;
      vm.fetchDoctorNurseScheduleTemplatesPromise = vmh.promiseWrapper($scope.ngDialogData.doctorNurseScheduleTemplates);
      vm.toSaveRows = $scope.ngDialogData.toSaveRows;
      console.log('toSaveRows:',vm.toSaveRows);

      vm.selectDoctorNurseScheduleTemplateToSave = selectDoctorNurseScheduleTemplateToSave;
      vm.cancel = cancel;
      vm.doSubmit = doSubmit;
    }

    function selectDoctorNurseScheduleTemplateToSave(selectedNode) {
      console.log(selectedNode);
      vmh.timeout(function(){
        vm.doctorNurseScheduleTemplateName = selectedNode.name;
      }, 25);
    }

    function cancel(){
      $scope.closeThisDialog('$closeButton');
    }

    function doSubmit() {
      if ($scope.theForm.$valid) {
        var promise = ngDialog.openConfirm({
          template: 'customConfirmDialog.html',
          className: 'ngdialog-theme-default',
          controller: ['$scope', function ($scopeConfirm) {
            $scopeConfirm.message = vm.moduleTranslatePath('CONFIRM-MESSAGE-SAVE-AS-TEMPLATE')
          }]
        }).then(function () {
          vmh.psnService.doctorNurseScheduleSaveAsTemplateWeekly(vm.tenantId, vm.doctorNurseScheduleTemplateName, vm.toSaveRows).then(function (isCreate) {
            $scope.closeThisDialog(isCreate);
            vmh.alertSuccess();
          });
        });
      }
    }
  }
})();