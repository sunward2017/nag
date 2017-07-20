/**
 * district Created by zppro on 17-5-27.
 * Target:养老机构 护工排班模版
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.pension-agency')
        .controller('NursingWorkerScheduleTemplateGridController', NursingWorkerScheduleTemplateGridController)
        .controller('NursingWorkerScheduleTemplateDetailsController', NursingWorkerScheduleTemplateDetailsController)
    ;


    NursingWorkerScheduleTemplateGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function NursingWorkerScheduleTemplateGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.query();
        }
    }

    NursingWorkerScheduleTemplateDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function NursingWorkerScheduleTemplateDetailsController($scope, ngDialog, vmh, vm) {

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
                vm.selectBinding.nursingWorkers = treeNodes;
                return treeNodes;
            });

            vm.yAxisDataPromise = vmh.shareService.tmp('T3001/psn-nursingWorker', 'name', {tenantId:vm.tenantId, status: 1, stop_flag: false});
            
            
            vm.load().then(function(){
                vm.raw$stop_flag = !!vm.model.stop_flag;
                //构造类型表格
                var x_axis = vm.model.type == 'A0001' ? 'weekAxis' :'monthAxis';
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
            var nursingWorkers = vm.selectBinding.nursingWorkers
            var yAxisData = [];
            vm.aggrData = {};
            for(var i=0,len=vm.model.content.length;i<len;i++) {
                var aggrPoint = vm.model.content[i];
                var aggrY = vm.aggrData[aggrPoint.y_axis];
                if (!aggrY){
                    aggrY = vm.aggrData[aggrPoint.y_axis] = {};

                    yAxisData.push({_id: aggrPoint.y_axis});
                }
                var nursingWorkerObject = _.find(nursingWorkers, function(o){
                    return o._id == aggrPoint.aggr_value
                })

                if(!aggrY[aggrPoint.x_axis]){
                    aggrY[aggrPoint.x_axis] = [];
                }
                aggrY[aggrPoint.x_axis].push(nursingWorkerObject);
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

            if (!vm.selectedNursingWorkers || vm.selectedNursingWorkers.length == 0) {
                vmh.alertWarning(vm.viewTranslatePath('MSG-NO-PICK-NURSING_SHIFT'), true);
                return;
            }
            var selectedNursingWorkers = _.map(vm.selectedNursingWorkers, function (o) {
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
                            vm.aggrData[rowId][colId] = selectedNursingWorkers;
                        } else {
                            // 追加
                            var arr = vm.aggrData[rowId][colId];
                            // if (!_.contains(arr, function(o){
                            //         return _.findIndex(selectedNursingWorkers,function(o2) {o.id == o2.id }) !=-1;
                            //     })) {
                            //     vm.aggrData[rowId][colId].push(vm.selectedNursingWorker);
                            // };
                            _.each(selectedNursingWorkers, function (o) {
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
                var findNursingWorkerToSaveTemplate = false;
                vm.model.content = [];
                if(vm.aggrData) {
                    for(var i=0, ylen = vm.yAxisData.length;i< ylen;i++) {
                        var rowId = vm.yAxisData[i]._id;
                        if(vm.aggrData[rowId]) {
                            for (var j=0, xlen = vm.xAxisData.length;j<xlen;j++) {
                                var colId = vm.xAxisData[j]._id;
                                if(vm.aggrData[rowId][colId]) {
                                    var assignedWorkers = vm.aggrData[rowId][colId];
                                    for(var k=0,zlen = assignedWorkers.length;k<zlen;k++) {
                                        vm.model.content.push({x_axis: colId, y_axis: rowId, aggr_value: assignedWorkers[k]});
                                        if(!findNursingWorkerToSaveTemplate) {
                                            findNursingWorkerToSaveTemplate = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }


                if(!findNursingWorkerToSaveTemplate) {
                    vmh.alertWarning(vm.viewTranslatePath('MSG-NO-NURSING_SHIFT-FOR-NURSING_WORKER'), true);
                    return;
                }

                var p;
                if(vm.raw$stop_flag === false && vm.model.stop_flag === true) {
                    p = vmh.fetch(vmh.psnService.nursingRobotRemoveRoomConfig(vm.tenantId, vm.model.id));
                } else {
                    p = vmh.promiseWrapper();
                }
                p.then(function(){
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