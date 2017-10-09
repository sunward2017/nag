/**
 * Created by hcl on 17-9-22.
 */
(function() {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('MealWeeklyMenuTemplateGridController', MealWeeklyMenuTemplateGridController)
        .controller('MealWeeklyMenuTemplateDetailsController', MealWeeklyMenuTemplateDetailsController)
    ;


    MealWeeklyMenuTemplateGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function MealWeeklyMenuTemplateGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.query();
            // console.log('vm.rows :',vm.rows);
        }
    }

    MealWeeklyMenuTemplateDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function MealWeeklyMenuTemplateDetailsController($scope, ngDialog, vmh, vm) {

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


            vm.aggrValuePromise = vmh.shareService.tmp('T3001/psn-meal', 'name', {tenantId: vm.tenantId, status: 1, stop_flag: false}).then(function (treeNodes) {
                vm.selectBinding.meals = treeNodes;
                return treeNodes;
            });

            vmh.shareService.d('D3040').then(function (nodes) {
                console.log('vm.yAxisData nodes :',nodes);
                vm.yAxisData = nodes;
            });

            vm.load().then(function(){
                vm.raw$stop_flag = !!vm.model.stop_flag;
                //构造类型表格
                var x_axis = 'weekAxis' ;//周模板
                vmh.clientData.getJson(x_axis).then(function (data) {
                    vm.xAxisData = data;
                    console.log('vm.xAxisData :',data );
                    vm.cols = {};
                    for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                        var colId = vm.xAxisData[j]._id;//星期
                        vm.cols[colId] = false;//selectedCol control variable
                    }
                });

                if (vm.model.content) {
                    parseTemplateContent();
                }
            });

        }

        function parseTemplateContent() {
            console.log('parse content...');
            var meals = vm.selectBinding.meals;
            vm.aggrData = {};
            for(var i=0,len=vm.model.content.length;i<len;i++) {
                var aggrPoint = vm.model.content[i];
                var mealObject = _.find(meals, function(o){
                    return o._id == aggrPoint.aggr_value.mealId
                });
                if(mealObject){
                    var aggrY = vm.aggrData[aggrPoint.y_axis];
                    if (!aggrY){
                        aggrY = vm.aggrData[aggrPoint.y_axis] = {};
                    }

                    if(!aggrY[aggrPoint.x_axis]){
                        aggrY[aggrPoint.x_axis] = []; //单元格中菜品数组
                    }
                    aggrY[aggrPoint.x_axis].push(mealObject);
                }

            }
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
                var rowId = vm.yAxisData[i].value;
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
                var rowId = vm.yAxisData[i].value;
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
            var newColSelected = vm.cols[colId] = !vm.cols[colId]
            for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                var rowId = vm.yAxisData[i].value;
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
            if (!vm.selectedMeals || vm.selectedMeals.length == 0) {
                vmh.alertWarning(vm.viewTranslatePath('MSG-NO-PICK-MEAL'), true);
                return;
            }
            var selectedMeals = _.map(vm.selectedMeals, function (o) {
                return {_id: o._id, id: o.id, name: o.name};
            });
            for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                var rowId = vm.yAxisData[i].value;
                for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                    var colId = vm.xAxisData[j]._id;
                    if (vm.cells[rowId][colId]) {
                        vm.cells[rowId][colId] = false;
                        vm.cells[rowId]['row-selected'] = _checkWholeRowIsSelected(rowId);
                        vm.cols[colId] = _checkWholeColIsSelected(colId);

                        if (isReplace) {
                            vm.aggrData[rowId][colId] = selectedMeals;
                        } else {
                            // 追加
                            var arr = vm.aggrData[rowId][colId];
                            _.each(selectedMeals, function (o) {
                                var findIndex = _.findIndex(arr, function (o2) {
                                    return o.id == o2.id
                                });
                                console.log('findIndex:', findIndex);
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
                for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++){
                    var rowId = vm.yAxisData[i].value;
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
                var findMealToSaveTemplate = false;
                vm.model.content = [];
                if(vm.aggrData) {
                    for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                        var rowId = vm.yAxisData[i].value;
                        if(vm.aggrData[rowId]) {
                            for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                                var colId = vm.xAxisData[j]._id;
                                if(vm.aggrData[rowId][colId]) {
                                    var assignedMeals = vm.aggrData[rowId][colId];
                                    for(var k=0,zlen = assignedMeals.length;k<zlen;k++) {
                                        vm.model.content.push({x_axis: colId, y_axis: rowId, aggr_value: {mealId:assignedMeals[k]}});
                                        if(!findMealToSaveTemplate) {
                                            findMealToSaveTemplate = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if(!findMealToSaveTemplate) {
                    vmh.alertWarning(vm.viewTranslatePath('MSG-NO-MEAL-FOR-TEMPLE'), true);
                    return;
                }

                var p = vmh.promiseWrapper();
                p.then(function(){
                    // console.log('save meal-weekly-menu-template:',vm.model);
                    vm.save();
                });
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }


    }

})();