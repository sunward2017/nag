/**
 * district Created by zppro on 17-3-17.
 * Target:养老机构 护工排班
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.pension-agency')
        .controller('NursingWorkerScheduleController', NursingWorkerScheduleController)
        .controller('NursingWorkerScheduleSaveAsTemplateController', NursingWorkerScheduleSaveAsTemplateController)
    ;

    NursingWorkerScheduleController.$inject = ['$scope', 'ngDialog', 'vmh', 'instanceVM'];

    function NursingWorkerScheduleController($scope, ngDialog, vmh, vm) {

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
            vm.tab1 = {cid: 'contentTab1'};

            fetchNursingWorkerScheduleTemplates();
            vm.aggrValuePromise = vmh.shareService.tmp('T3001/psn-nursingShift', 'code name', {tenantId: vm.tenantId, status: 1, stop_flag: false}).then(function (nodes) {
                vm.selectBinding.nursingShifts = nodes;
                console.log('nursingShift:', nodes);
                return nodes;
            });
            vmh.shareService.tmp('T3001/psn-nursingWorker', 'name', {tenantId: vm.tenantId, status: 1, stop_flag: false}).then(function (nodes) {
                vm.yAxisData = nodes;
            });

            vm.baseWeek = 0;
            var p1 = loadWeek();

        }


        function fetchNursingWorkerScheduleTemplates () {
            vmh.shareService.tmp('T3001/psn-nursingWorkerScheduleTemplate', 'name', {tenantId: vm.tenantId, status: 1, stop_flag: false}, null, true).then(function (treeNodes) {
                vm.selectBinding.nursingWorkerScheduleTemplates = treeNodes;
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
                queryNursingWorkerSchedule();
            }));
        }
        
        function queryNursingWorkerSchedule() {
            var start = vm.xAxisData[0].value;
            var end = vm.xAxisData[vm.xAxisData.length-1].value;
            var p3 = vmh.psnService.nursingWorkerScheduleWeekly(vm.tenantId, start, end).then(parseNursingWorkerSchedule);
        }

        function parseNursingWorkerSchedule(nursingWorkerSchedule) {
            console.log('parse nursingWorkerScheduleItems');
            var nursingWorkerScheduleItems = nursingWorkerSchedule.items;
            console.log(nursingWorkerSchedule);
            var nursingShifts = vm.selectBinding.nursingShifts;
            vm.aggrData = {};

            // 确保vm.aggrData[rowId] 存在并初始化
            for (var i=0,len= vm.yAxisData.length;i<len;i++) {
                var rowId = vm.yAxisData[i]._id;
                if (!vm.aggrData[rowId]) {
                    vm.aggrData[rowId] = {};
                }
            }

            for(var i=0,len=nursingWorkerScheduleItems.length;i<len;i++) {
                var nursingWorkerScheduleItem = nursingWorkerScheduleItems[i];
                var nursingShiftObject = _.find(nursingShifts, function(o){
                    return o._id == nursingWorkerScheduleItem.aggr_value
                });
                if (nursingShiftObject) {
                    if (!vm.aggrData[nursingWorkerScheduleItem.y_axis]) {
                        vm.aggrData[nursingWorkerScheduleItem.y_axis] = {};
                    }
                    if (!vm.aggrData[nursingWorkerScheduleItem.y_axis][nursingWorkerScheduleItem.x_axis_value]){
                        vm.aggrData[nursingWorkerScheduleItem.y_axis][nursingWorkerScheduleItem.x_axis_value] = [];
                    }
                    vm.aggrData[nursingWorkerScheduleItem.y_axis][nursingWorkerScheduleItem.x_axis_value].push(nursingShiftObject);
                }
            }

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
        
        function exitGridEditMode () {
            _unSelectAll();
            vm.gridEditing = false;
        }

        function _unSelectAll () {
            for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                var rowId = vm.yAxisData[i]._id;
                if (vm.cells && vm.cells[rowId]) {
                    vm.cells[rowId]['row-selected'] = false;
                    for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                        var colId = vm.xAxisData[j]._id;
                        vm.cells[rowId][colId] = false
                        if (vm.cols[colId]){
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
            console.log(vm.gridEditing)
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
            // if (!vm.selectedNursingWorker) {
            //     vmh.alertWarning(vm.moduleTranslatePath('MSG-NO-PICK-NURSING'), true);
            //     return;
            // }
            if (!vm.selectedNursingShifts || vm.selectedNursingShifts.length == 0) {
                vmh.alertWarning(vm.moduleTranslatePath('MSG-NO-PICK_NURSING_SHIFT'), true);
                return;
            }
            console.log('vm.selectedNursingShifts:', vm.selectedNursingShifts)
            var selectedNursingShifts = _.map(vm.selectedNursingShifts, function (o) {
                return {_id: o._id, id: o.id, name: o.name};
            });
            var toSaveRows = [];
            for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                var rowId = vm.yAxisData[i]._id;
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
                                toSaveRows.push({ x_axis: date, y_axis: rowId, aggr_value: o.id });
                            });
                        } else {
                            // 追加
                            var arr = vm.aggrData[rowId][colId]; 
                            _.each(selectedNursingShifts, function (o) {
                                var findIndex = _.findIndex(arr, function (o2) {
                                    return o.id == o2.id
                                });
                                console.log('findIndex:', findIndex);
                                if (findIndex == -1) {
                                    console.log('o:', o);
                                    arr.push(o);

                                }
                            });

                            _.each(arr, function(o){
                                toSaveRows.push({ x_axis: date, y_axis: rowId, aggr_value: o.id });
                            });
                        }
                    }
                }
            }
            if(toSaveRows.length > 0) {
                vmh.psnService.nursingWorkerScheduleSave(vm.tenantId, toSaveRows).then(function(){
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
                if(toRemoveRows.length > 0) {
                    vmh.psnService.nursingWorkerScheduleRemove(vm.tenantId, toRemoveRows).then(function(){
                        vmh.alertSuccess('notification.REMOVE-SUCCESS', true);
                    });
                }
            });
        }
        
        function importTemplate () {
            if (!vm.selectedNursingWorkerScheduleTemplate) {
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
                console.log(vm.selectedNursingWorkerScheduleTemplate._id);
                vmh.psnService.nursingWorkerScheduleTemplateImport(vm.selectedNursingWorkerScheduleTemplate._id, toImportXAxisRange).then(function(){
                    vmh.alertSuccess('notification.NORMAL-SUCCESS', true);
                    loadWeek();
                });
            });
        }

        function saveAsTemplate () {

            var toSaveRows = [];
            var findNursingWorkerToSaveTemplate = false;
            for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                var rowId = vm.yAxisData[i]._id;
                for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                    var colId = vm.xAxisData[j]._id;
                    if(vm.aggrData[rowId][colId]) {
                        var assignedWorkers = vm.aggrData[rowId][colId];
                        for(var k=0,zlen = assignedWorkers.length;k<zlen;k++) {
                            toSaveRows.push({ x_axis: moment(vm.xAxisData[j].value).day(), y_axis: rowId, aggr_value: assignedWorkers[k] });
                            if(!findNursingWorkerToSaveTemplate) {
                                findNursingWorkerToSaveTemplate = true;
                            }
                        }
                    }
                }
            }

            if(!findNursingWorkerToSaveTemplate) {
                vmh.alertWarning(vm.moduleTranslatePath('MSG-SAVE-AS-TEMPLATE-DATA-INVALID'), true);
                return;
            }

            ngDialog.open({
                template: 'nursing-worker-schedule-save-as-template.html',
                controller: 'NursingWorkerScheduleSaveAsTemplateController',
                className: 'ngdialog-theme-default ngdialog-nursing-worker-schedule-save-as-template',
                data: {
                    vmh: vmh,
                    moduleTranslatePathRoot: vm.moduleTranslatePath(),
                    tenantId: vm.tenantId,
                    nursingWorkerScheduleTemplates: vm.selectBinding.nursingWorkerScheduleTemplates,
                    toSaveRows: toSaveRows
                }
            }).closePromise.then(function (ret) {
                if(ret.value!='$document' && ret.value!='$closeButton' && ret.value!='$escape' ) {
                    console.log(ret.value)
                    if(ret.value === true){
                        fetchNursingWorkerScheduleTemplates();
                    }
                }
            });
        }
    }

    NursingWorkerScheduleSaveAsTemplateController.$inject = ['$scope', 'ngDialog'];

    function NursingWorkerScheduleSaveAsTemplateController($scope, ngDialog) {

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
            vm.fetchNursingWorkerScheduleTemplatesPromise = vmh.promiseWrapper($scope.ngDialogData.nursingWorkerScheduleTemplates);
            vm.toSaveRows = $scope.ngDialogData.toSaveRows;

            vm.selectNuringScheduleTemplateToSave = selectNuringScheduleTemplateToSave;
            vm.cancel = cancel;
            vm.doSubmit = doSubmit;
        }

        function selectNuringScheduleTemplateToSave(selectedNode) {
            console.log(selectedNode);
            vmh.timeout(function(){
                vm.nursingWorkerScheduleTemplateName = selectedNode.name;
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
                    vmh.psnService.nursingWorkerScheduleSaveAsTemplateWeekly(vm.tenantId, vm.nursingWorkerScheduleTemplateName, vm.toSaveRows).then(function (isCreate) {
                        $scope.closeThisDialog(isCreate);
                        vmh.alertSuccess();
                    });
                });
            }
        }
    }
})();