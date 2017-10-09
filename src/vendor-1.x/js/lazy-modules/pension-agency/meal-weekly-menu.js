/**
 * Created by hcl on 17-9-22.
 */
(function() {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('MealWeeklyMenuController', MealWeeklyMenuController)
        .controller('MealWeeklyMenuSaveAsTemplateController', MealWeeklyMenuSaveAsTemplateController)
        .controller('AddMealQuantityController',AddMealQuantityController)
    ;

    MealWeeklyMenuController.$inject = ['$scope', 'ngDialog', 'vmh', 'instanceVM'];

    function MealWeeklyMenuController($scope, ngDialog, vmh, vm) {

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
            vm.addQuantity = addQuantity;
            vm.dbClickAddQuantity= dbClickAddQuantity;
            vm.tab1 = {cid: 'contentTab1'};

            fetchMealWeeklyMenuTemplates();
            vm.aggrValuePromise = vmh.shareService.tmp('T3001/psn-meal', 'name', {tenantId: vm.tenantId, status: 1, stop_flag: false}).then(function (nodes) {
                vm.selectBinding.mealShifts = nodes;
                // console.log('mealShifts nodes :',nodes);
                return nodes;
            });
            vmh.shareService.d('D3040').then(function (nodes) {
                // console.log('yAxisData:',nodes);
                vm.yAxisData = nodes;
            });

            vm.baseWeek = 0;
            var p1 = loadWeek();

        }


        function fetchMealWeeklyMenuTemplates () {
            vmh.shareService.tmp('T3001/psn-mealWeeklyMenuTemplate', 'name', {tenantId: vm.tenantId, status: 1, stop_flag: false}, null, true).then(function (treeNodes) {
                vm.selectBinding.mealWeeklyMenuScheduleTemplates = treeNodes;
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
                console.log('vm.xAxisData :',vm.xAxisData );
                vm.cols = {};
                for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                    var colId = vm.xAxisData[j]._id; //星期
                    vm.cols[colId] = false;//selectedCol control variable
                }
                queryMealWeeklyMenuSchedule();
            }));
        }

        function queryMealWeeklyMenuSchedule() {
            var start = vm.xAxisData[0].value; //value为日期(年月日)
            var end = vm.xAxisData[vm.xAxisData.length-1].value;
            vmh.psnService.mealWeeklyMenuSchedule(vm.tenantId, start, end).then(parseMealWeeklyMenuSchedule);
        }

        function parseMealWeeklyMenuSchedule(weeklyMenuSchedule) {
            console.log("weeklyMenuSchedule ......:",weeklyMenuSchedule);
            var weeklyMenuScheduleItems = weeklyMenuSchedule.items;
            var mealShifts = vm.selectBinding.mealShifts;
            vm.aggrData = {};

            // 确保vm.aggrData[rowId] 存在并初始化
            for (var i=0,len= vm.yAxisData.length;i<len;i++) {
                var rowId = vm.yAxisData[i].value; //rowId ,早中晚夜
                if (!vm.aggrData[rowId]) {
                    vm.aggrData[rowId] = {};
                }
            }

            for(var i=0,len=weeklyMenuScheduleItems.length;i<len;i++) {
                var weeklyMenuScheduleItem = weeklyMenuScheduleItems[i];
                var mealShiftObject = _.find(mealShifts, function(o){
                    return o._id == weeklyMenuScheduleItem.aggr_value.mealId
                });
                // console.log('mealShiftObject :',mealShiftObject);
                if (mealShiftObject) {
                    if (!vm.aggrData[weeklyMenuScheduleItem.y_axis]) {
                        vm.aggrData[weeklyMenuScheduleItem.y_axis] = {};
                    }
                    if (!vm.aggrData[weeklyMenuScheduleItem.y_axis][weeklyMenuScheduleItem.x_axis_value]){
                        vm.aggrData[weeklyMenuScheduleItem.y_axis][weeklyMenuScheduleItem.x_axis_value] = [];
                    }
                    vm.aggrData[weeklyMenuScheduleItem.y_axis][weeklyMenuScheduleItem.x_axis_value].push({
                        _id:mealShiftObject._id,
                        id:mealShiftObject.id,
                        name:mealShiftObject.name,
                        quantity:weeklyMenuScheduleItem.aggr_value.quantity
                    });
                }
            }
            console.log('vm.aggrData......:',vm.aggrData);
            enterGridEditMode();
        }
        function enterGridEditMode () {
            vm.gridEditing = true;
            if (!vm.aggrData) {
                vm.aggrData = {};
            }
            if (!vm.cells) {
                vm.cells = {}; //单元格
            }
            for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                var rowId = vm.yAxisData[i].value; //早中晚夜
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
                    var aggrValue = rowDataObject[colId];//单元格值
                    if(aggrValue === undefined) {
                        rowDataObject[colId] = []; // "" => []
                    }
                    var cell = rowCellsObject[colId];//单元格状态值
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
                var rowId = vm.yAxisData[i].value;
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
                var rowId = vm.yAxisData[i].value;
                selectGridRow(rowId);
            }
        }

        function selectGridCol(colId) {
            if(!vm.gridEditing) return;
            var newColSelected = vm.cols[colId] = !vm.cols[colId];
            for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                var rowId = vm.yAxisData[i].value;
                vm.cells[rowId][colId] = newColSelected;
                vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
            }
        }

        function selectGridRow(rowId) {
            if(!vm.gridEditing) return;
            var newRowSelected = vm.cells[rowId]['row-selected'] = !vm.cells[rowId]['row-selected']; //为true
            for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                var colId = vm.xAxisData[j]._id;
                vm.cells[rowId][colId] = newRowSelected;
                vm.cols[colId] = _checkWholeColIsSelected(colId);
            }
        }

        function selectGridCell (rowId, colId) {
            console.log("vm.gridEditing:",vm.gridEditing);
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
            if (!vm.selectedMealShifts || vm.selectedMealShifts.length == 0) {
                vmh.alertWarning(vm.moduleTranslatePath('MSG-NO-PICK_MEAL_SHIFT'), true);
                return;
            }
            // console.log('vm.selectedMealShifts:', vm.selectedMealShifts);
            var selectedMealShifts = _.map(vm.selectedMealShifts, function (o) {
                return {_id: o._id, id: o.id, name: o.name};
            });
            var toSaveRows = [];
            for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                var rowId = vm.yAxisData[i].value;
                for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                    var colId = vm.xAxisData[j]._id;
                    var date = vm.xAxisData[j].value;
                    if (vm.cells[rowId][colId]) {
                        vm.cells[rowId][colId] = false;
                        vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
                        vm.cols[colId] = _checkWholeColIsSelected(colId);

                        if (isReplace) {
                            vm.aggrData[rowId][colId]=[];
                            _.each(selectedMealShifts, function (o){
                                vm.aggrData[rowId][colId].push({_id:o._id, id:o.id, name:o.name, quantity:1});
                                toSaveRows.push({ x_axis: date, y_axis: rowId, aggr_value:{mealId:o.id} });
                            });
                        } else {
                            // 追加
                            var arr = vm.aggrData[rowId][colId];
                            _.each(selectedMealShifts, function (o) {
                                var findIndex = _.findIndex(arr, function (o2) {
                                    return o.id == o2.id
                                });
                                console.log('findIndex:', findIndex);
                                if (findIndex == -1) {
                                    console.log('o:', o);
                                    arr.push({_id:o._id, id:o.id, name:o.name, quantity:1});
                                }
                            });

                            _.each(arr, function(o){
                                toSaveRows.push({ x_axis: date, y_axis: rowId, aggr_value:{mealId:o.id} });
                            });
                        }
                    }
                }
            }
            if(toSaveRows.length > 0) {
                vmh.psnService.mealWeeklyMenuScheduleSave(vm.tenantId, toSaveRows).then(function(){
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
                    var rowId = vm.yAxisData[i].value;
                    for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                        var colId = vm.xAxisData[j]._id;
                        var date = vm.xAxisData[j].value;
                        if (vm.cells[rowId][colId]) {
                            vm.cells[rowId][colId] = false;
                            vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
                            vm.cols[colId] = _checkWholeColIsSelected(colId);

                            if (vm.aggrData[rowId][colId]) {
                                vm.aggrData[rowId][colId] = [];
                                toRemoveRows.push({ x_axis: date, y_axis: rowId });
                            }
                        }
                    }
                }
                if(toRemoveRows.length > 0) {
                    vmh.psnService.mealWeeklyMenuScheduleRemove(vm.tenantId, toRemoveRows).then(function(){
                        vmh.alertSuccess('notification.REMOVE-SUCCESS', true);
                    });
                }
            });
        }

        function addQuantity() {
            var toAddQuantityRows = [];
            for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                var rowId = vm.yAxisData[i].value;
                var rowName = vm.yAxisData[i].name;
                for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                    var colId = vm.xAxisData[j]._id;
                    var date = vm.xAxisData[j].value;
                    if (vm.cells[rowId][colId]) {
                        vm.cells[rowId][colId] = false;
                        vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
                        vm.cols[colId] = _checkWholeColIsSelected(colId);

                        if (vm.aggrData[rowId][colId]) {
                            console.log('vm.aggrData[rowId][colId] :',vm.aggrData[rowId][colId]);
                            _.each(vm.aggrData[rowId][colId], function (o){
                                toAddQuantityRows.push({ x_axis: date, y_axis: rowId, y_axis_value:rowName,aggr_value:{mealId:o ,quantity:o.quantity} });
                            });
                        }
                    }
                }
            }
            if (toAddQuantityRows.length == 0) {
                vmh.alertWarning(vm.moduleTranslatePath('MSG-NO-PICK_MEAL_SHIFT-TO-SET'), true);
                return;
            }
            openDialog(toAddQuantityRows);
        }

        function dbClickAddQuantity(row,col, cellData) {
            // console.log('row:',row , 'col:',col);
            if(cellData.length <1){
                return;
            }
            var toAddQuantityRows = [];
            _.each(cellData, function (o){
                toAddQuantityRows.push({ x_axis: col.value, y_axis: row.value, y_axis_value:row.name,aggr_value:{mealId:o ,quantity:o.quantity} });
            });
            openDialog(toAddQuantityRows);
        }

        function openDialog(toAddQuantityRows) {
            ngDialog.open({
                template: 'add-meal-quantity.html',
                controller: 'AddMealQuantityController',
                className: 'ngdialog-theme-default ngdialog-meal-weekly-menu-picker',
                data: {
                    vmh: vmh,
                    moduleTranslatePathRoot: vm.moduleTranslatePath(),
                    toAddQuantityRows:toAddQuantityRows,
                    tenantId: vm.tenantId
                }
            }).closePromise.then(function (ret) {
                if(ret.value!='$document' && ret.value!='$closeButton' && ret.value!='$escape' ) {
                    console.log('addQuantity closeDialog ret.value:', ret.value);
                    if (ret.value.length > 0) {
                        vmh.psnService.mealWeeklyMenuScheduleSave(vm.tenantId, ret.value).then(function () {
                            vmh.alertSuccess();
                            loadWeek();
                        });
                    }
                }
            });
        }

        function importTemplate () {
            if (!vm.selectedMealWeeklyMenuTemplate) {
                vmh.alertWarning(vm.moduleTranslatePath('MSG-NO-PICK-MEAL_WEEKLY_SCHEDULE_TEMPLATE'), true);
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
                console.log('toImportXAxisRange:',toImportXAxisRange);//["2017-09-27"]
                vmh.psnService.mealWeeklyMenuTemplateImport(vm.selectedMealWeeklyMenuTemplate._id, toImportXAxisRange).then(function(){
                    vmh.alertSuccess('notification.NORMAL-SUCCESS', true);
                    loadWeek();
                });
            });
        }

        function saveAsTemplate () {
            var toSaveRows = [];
            var findMealsToSaveTemplate = false;
            for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                var rowId = vm.yAxisData[i].value;
                for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                    var colId = vm.xAxisData[j]._id;
                    if(vm.aggrData[rowId][colId]) {
                        var assignedMeals = vm.aggrData[rowId][colId];
                        for(var k=0,zlen = assignedMeals.length;k<zlen;k++) {
                            toSaveRows.push({ x_axis: moment(vm.xAxisData[j].value).day(), y_axis: rowId, aggr_value: {mealId:assignedMeals[k]} });
                            if(!findMealsToSaveTemplate) {
                                findMealsToSaveTemplate = true;
                            }
                        }
                    }
                }
            }

            if(!findMealsToSaveTemplate) {
                vmh.alertWarning(vm.moduleTranslatePath('MSG-SAVE-AS-TEMPLATE-DATA-INVALID'), true);
                return;
            }

            ngDialog.open({
                template: 'nursing-worker-schedule-save-as-template.html',
                controller: 'MealWeeklyMenuSaveAsTemplateController',
                className: 'ngdialog-theme-default ngdialog-nursing-worker-schedule-save-as-template',
                data: {
                    vmh: vmh,
                    moduleTranslatePathRoot: vm.moduleTranslatePath(),
                    tenantId: vm.tenantId,
                    mealWeeklyMenuScheduleTemplates: vm.selectBinding.mealWeeklyMenuScheduleTemplates,
                    toSaveRows: toSaveRows
                }
            }).closePromise.then(function (ret) {
                if(ret.value!='$document' && ret.value!='$closeButton' && ret.value!='$escape' ) {
                    console.log("ret.value",ret.value);
                    if(ret.value === true){
                        fetchMealWeeklyMenuTemplates();
                    }
                }
            });
        }
    }

    MealWeeklyMenuSaveAsTemplateController.$inject = ['$scope', 'ngDialog'];

    function MealWeeklyMenuSaveAsTemplateController($scope, ngDialog) {

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
            // console.log('mealWeeklyMenuScheduleTemplates :',$scope.ngDialogData.mealWeeklyMenuScheduleTemplates);
            vm.fetchMealWeeklyMenuScheduleTemplatesPromise = vmh.promiseWrapper($scope.ngDialogData.mealWeeklyMenuScheduleTemplates);
            console.log('fetchMealWeeklyMenuScheduleTemplatesPromise:',vm.fetchMealWeeklyMenuScheduleTemplatesPromise);
            vm.toSaveRows = $scope.ngDialogData.toSaveRows;

            vm.selectMealWeeklyMenuTemplateToSave = selectMealWeeklyMenuTemplateToSave;
            vm.cancel = cancel;
            vm.doSubmit = doSubmit;
        }

        function selectMealWeeklyMenuTemplateToSave(selectedNode) {
            console.log(selectedNode);
            vmh.timeout(function(){
                vm.mealWeeklyMenuTemplateName = selectedNode.name;
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
                    console.log('mealWeeklyMenuTemplateName :',vm.mealWeeklyMenuTemplateName);
                    console.log('save template vm.toSaveRows...',vm.toSaveRows);
                    vmh.psnService.mealWeeklyMenuSaveAsTemplateWeekly(vm.tenantId, vm.mealWeeklyMenuTemplateName, vm.toSaveRows).then(function (isCreate) {
                        $scope.closeThisDialog(isCreate);
                        vmh.alertSuccess();
                    });
                });
            }
        }
    }

    AddMealQuantityController.$inject = ['$scope', 'ngDialog'];
    function AddMealQuantityController($scope,ngDialog) {
        var vm = $scope.vm = {};
        var vmh = $scope.ngDialogData.vmh;
        $scope.utils = vmh.utils.v;

        init();
        function init() {
            vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
            vm.moduleTranslatePath = function (key) {
                return vm.moduleTranslatePathRoot + '.' + key;
            };
            vm.tenantId = $scope.ngDialogData.tenantId;
            vm.toAddQuantityRows = $scope.ngDialogData.toAddQuantityRows;
            console.log('toAddQuantityRows :',vm.toAddQuantityRows);
            vm.doSubmit = doSubmit;
            vm.removeMeal = removeMeal;

        }
        
        function removeMeal(index) {
            console.log('$index',index);
            vm.toAddQuantityRows.splice(index,1);
        }

        function doSubmit() {
            if ($scope.theForm.$valid){
                // console.log('submit toAddQuantityRows :',vm.toAddQuantityRows);
                $scope.closeThisDialog(vm.toAddQuantityRows);
            }else {
                vmh.alertWarning(vm.alertMessage, true);
            }
        }


    }
})();