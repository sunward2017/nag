/**
 * room Created by zppro on 17-2-22.
 * Target:养老机构房间 (移植自fsrok)
 */

(function() {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('RoomGridController', RoomGridController)
        .controller('RoomDetailsController', RoomDetailsController)
        .controller('RoomDetailsBatchAddController',RoomDetailsBatchAddController)
        .controller('RoomDetailsBatchEditController',RoomDetailsBatchEditController)
        .controller('RoomConfigController',RoomConfigController)
    ;


    RoomGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function RoomGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});

            vm.exportExcelForRoomBedPrintQRLabel = exportExcelForRoomBedPrintQRLabel;

            if (vm.switches.leftTree) {
                vmh.shareService.tmp('T3001/psn-district', 'name', vm.treeFilterObject).then(function (treeNodes) {
                    vm.trees = [new vmh.treeFactory.sTree('tree1', treeNodes, {mode: 'grid'})];
                    vm.trees[0].selectedNode = vm.trees[0].findNodeById($scope.$stateParams.districtId);
                });

                $scope.$on('tree:node:select', function ($event, node) {
                    //console.log(tree.selectedNode);
                    var selectNodeId = node._id;
                    if ($scope.$stateParams.districtId != selectNodeId) {
                        $scope.$state.go(vm.viewRoute(), {districtId: selectNodeId});

                    }
                });
            }

            vm.query();
        }

        function exportExcelForRoomBedPrintQRLabel() {
            vmh.psnService.exportExcelForRoomBedPrintQRLabel('房间床位二维码打印信息表(' + vm.tenant_name +'-' + moment().format('YYYY.MM.DD') + ')', vm.tenantId);
        }
    }

    RoomDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function RoomDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});

            vm.selectBinding.districts = vm.modelNode.services['psn-district'].query(_.defaults(vm.selectFilterObject.districts, vm.selectFilterObject.common), '_id name');

            vm.maxFloors = 98;
            vm.maxNumbersInFloor = 98;

            vm.selectBinding.floors = _.range(1, vm.maxFloors + 1);
            vm.selectBinding.numbers_in_floor = _.range(1, vm.maxNumbersInFloor + 1);

            vm.switchDistrict = switchDistrict;
            vm.switchFloor = switchFloor;
            vm.diableFloor = diableFloor;
            vm.diableNumberInFloor = diableNumberInFloor;
            vm.genRoomName = genRoomName;
            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};

            vm.load().then(function () {
                if(vm._action_ == 'edit' && vm.model.forbiddens.length) vm.forbiddens = vm.model.forbiddens;
                switchDistrict();
                switchFloor();
                vm.old_name = vm.model.name;
            });

        }

        function genRoomName() {
            console.log('genRoomName');
            if(!vm.model.floor || !vm.model.number_in_floor || $scope.theForm['floor'].disabled|| $scope.theForm['number_in_floor'].disabled)
                return;

            if (vm.model.number_in_floor > 9) {
                vm.model.name = '' + vm.model.floor + vm.model.number_in_floor;
            }
            else {
                vm.model.name = '' + vm.model.floor + '0' + vm.model.number_in_floor;
            }
        }

        function switchDistrict() {
            if (!vm.model.districtId) {
                if ($scope.theForm['districtId'])
                    $scope.theForm['districtId'].$dirty = true;
                return;
            }

            vmh.fetch(vm.modelService.query({
                districtId: vm.model.districtId,
                status: 1
            }, 'name')).then(function (rooms) {

                if (rooms.length > 0) {
                    vm.existsRooms = rooms;

                    vm.floorRooms = _.groupBy(vm.existsRooms, function (o) {
                        var roomName = o.name;
                        return Number(roomName.substr(0, (roomName.length == 3 ? 1 : 2)));
                    });
                    //
                    //vm.existsFloors =_.groupBy(_.map(vm.existsRooms, function (o) {
                    //    var roomName = o.name;
                    //    return Number(roomName.substr(0, (roomName.length == 3 ? 1 : 2)));
                    //}),function(){
                    //
                    //});

                    console.log(vm.floorRooms);
                }
                else{
                    vm.existsRooms = [];
                    vm.floorRooms = [];
                }
            });
        }


        function switchFloor(){

        }


        function diableFloor(floor){
            if(vm._action_ == 'edit') {
                return vm.model.floor != floor;
            }

            if(!vm.floorRooms || !vm.floorRooms[floor])
                return false;
            return vm.floorRooms[floor].length >=  vm.maxNumbersInFloor;
        }

        function diableNumberInFloor(number) {
            if(vm._action_ == 'edit') {
                return vm.model.number_in_floor != number;
            }
            if (!vm.floorRooms)
                return false;
            if (vm.model.floor) {
                return !!_.find(vm.floorRooms[vm.model.floor], function (o) {
                    return Number(o.name.substr(o.name.length - 2, 2)) == number;
                });
            }
            return true;
        }

        function doSubmit() {

            //if(vm.model.name) {
            //    if (!vm.model.floor)
            //        vm.model.floor = Number(vm.model.name.substr(0, (vm.model.name.length == 3 ? 1 : 2)));
            //
            //    if (!vm.model.number_in_floor)
            //        vm.model.number_in_floor = Number(vm.model.name.substr(vm.model.name.length - 2, 2));
            //    console.log(vm.model);
            //
            //}

            if ($scope.theForm.$valid) {
                console.log(vm.forbiddens);
                if(vm.forbiddens) vm.model.forbiddens = vm.forbiddens.split(',');
                vm.save().then(function (ret) {
                    if (vm.old_name != vm.model.name && vm._action_ == 'edit') {
                        vmh.shareService.notifyDataChange('psn$room$name', vm.model._id);
                    }
                });
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }
    }

    RoomDetailsBatchAddController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function RoomDetailsBatchAddController($scope,ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;

        init();


        function init() {

            vm.init({removeDialog: ngDialog});

            vm.maxFloors = 98;
            vm.maxNumbersInFloor = 98;

            vm.selectBinding.districts = vm.modelNode.services['psn-district'].query(_.defaults(vm.selectFilterObject.districts, vm.selectFilterObject.common), '_id name');


            vm.switchDistrict = switchDistrict;
            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};

            vm.slider = {
                floor_options: {
                    floor: 1,
                    ceil: vm.maxFloors,
                    showTicksValues: !vmh.browser.msie
                },
                number_in_floor_options: {
                    floor: 1,
                    ceil: vm.maxNumbersInFloor,
                    showTicksValues: !vmh.browser.msie
                }
            };

            vm.loadWhenBatchAdd().then(function(){

                vm.model.floor_from = 1;
                vm.model.floor_to = vm.maxFloors;

                vm.model.number_in_floor_from = 1;
                vm.model.number_in_floor_to = vm.maxNumbersInFloor;
            });

            vmh.timeout(function () {
                $scope.$broadcast('rzSliderForceRender');
            });


            vmh.promiseWrapper(switchDistrict);

        }

        function switchDistrict() {
            if (!vm.model.districtId) {
                if ($scope.theForm['districtId'])
                    $scope.theForm['districtId'].$dirty = true;
                return;
            }
            vmh.fetch(vm.modelService.query({
                districtId: vm.model.districtId,
                status: 1
            }, 'name')).then(function (rooms) {
                console.log(rooms);
                if (rooms.length > 0) {
                    vm.existsRooms = rooms;
                }
                else{
                    vm.existsRooms = [];
                }
            });
        }

        function doSubmit() {


            if ($scope.theForm.$valid) {

                //将已存在的数据过滤
                var rooms = [];
                for(var floor =vm.model.floor_from;floor<=vm.model.floor_to;floor++) {
                    for (var number_in_floor = vm.model.number_in_floor_from; number_in_floor <= vm.model.number_in_floor_to; number_in_floor++) {
                        var roomName = '' + floor + (number_in_floor > 9 ? '' : '0') + number_in_floor;
                        if(_.where(vm.existsRooms,{name:roomName}).length>0) {
                            //查找到已经添加
                            continue;
                        }

                        var room = _.pick(vm.model, 'tenantId', 'districtId', 'capacity', 'stop_flag');
                        room.floor = floor;
                        room.number_in_floor = number_in_floor;
                        room.name = roomName;
                        rooms.push(room);
                    }
                }

                vm.saveWhenBatchAdd(rooms);

            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }

    }

    RoomDetailsBatchEditController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function RoomDetailsBatchEditController($scope,ngDialog, vmh, vm) {
        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;

        init();


        function init() {

            vm.init({removeDialog: ngDialog});
            vm.selectBinding.districts = vm.modelNode.services['psn-district'].query(_.defaults(vm.selectFilterObject.districts, vm.selectFilterObject.common), '_id name');


            vm.switchDistrict = switchDistrict;
            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};

            vm.loadWhenBatchEdit();

        }

        function switchDistrict() {
            if (!vm.model.districtId) {
                if ($scope.theForm['districtId'])
                    $scope.theForm['districtId'].$dirty = true;
                return;
            }
            vmh.fetch(vm.modelService.query({
                districtId: vm.model.districtId,
                status: 1
            }, 'name')).then(function (rooms) {
                console.log(rooms);
                if (rooms.length > 0) {
                    vm.existsRooms = rooms;
                }
                else{
                    vm.existsRooms = [];
                }
            });
        }

        function doSubmit() {

            if ($scope.theForm.$valid) {
                var conditions = {"_id": {"$in": vm.getParam('selectedIds')}};
                //console.log(conditions); 
                var batchModel = {districtId:vm.model.districtId,capacity: vm.model.capacity, stop_flag: !!vm.model.stop_flag};
                console.log(batchModel);
                vm.saveWhenBatchEdit(conditions, batchModel);
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }
    }

    RoomConfigController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function RoomConfigController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});
            vm.doSubmit = doSubmit;
            vm.onBedMonitorCheckChange = onBedMonitorCheckChange;
            vm.checkForbidden = checkForbidden;
            vm.tab1 = {cid: 'contentTab1'};

            vm.treeDataPromiseOfRobots = vmh.shareService.tmp('T3005', 'name', {tenantId:vm.tenantId, roomId: vm.getParam('_id')}, null, true).then(function(nodes){
                return nodes;
            });

            vm.treeDataPromiseOfBedMonitors = vmh.shareService.tmp('T3007', 'code name', {tenantId:vm.tenantId, roomId: vm.getParam('_id')},null, true).then(function(nodes){
                console.log(nodes);
                return nodes;
            });

            vm.load().then(function(){
                var bedMonitors = vm.model.bedMonitors;
                var bedNos = {}, bedMonitor;
                for(var i=0,len=bedMonitors.length;i<len;i++) {
                    bedMonitor = bedMonitors[i];
                    bedNos[bedMonitor._id] = bedMonitor.bed_no;
                }
                vm.bedNos = bedNos;
                console.log('vm.bedNos:', vm.bedNos);
                console.log('vm.model.bedMonitors:',vm.model.bedMonitors);
            });
        }

        function onBedMonitorCheckChange(checkedNodes) {
            var bedMonitors = vm.model.bedMonitors, bedMonitorId;
            for(var i=0,len=checkedNodes.length;i<len;i++) {
                var index = _.findIndex(bedMonitors, function (bedMonitor) {
                    return bedMonitor.bedMonitorId == checkedNodes[i].bedMonitorId;
                });
                if (index != -1) {
                    bedMonitorId = checkedNodes[i]._id;
                    bedMonitors[index].name = checkedNodes[i].name;
                    if (vm.bedNos[bedMonitorId]){
                        bedMonitors[index].bed_no =  vm.bedNos[bedMonitorId];
                    }
                }
            }

        }

        function checkForbidden(bed_no){
            console.log("bed_no is:"+bed_no);
            console.log("forbiddens is:"+vm.model.forbiddens);

            return !_.contains(vm.model.forbiddens,bed_no);
        }

        function doSubmit() {

            //if(vm.model.name) {
            //    if (!vm.model.floor)
            //        vm.model.floor = Number(vm.model.name.substr(0, (vm.model.name.length == 3 ? 1 : 2)));
            //
            //    if (!vm.model.number_in_floor)
            //        vm.model.number_in_floor = Number(vm.model.name.substr(vm.model.name.length - 2, 2));
            //    console.log(vm.model);
            //
            //}
            var bedMonitors = vm.model.bedMonitors, bedMonitor;
            for(var i=0,len=bedMonitors.length;i<len;i++) {
                bedMonitor = bedMonitors[i];
                bedMonitor.bed_no = vm.bedNos[bedMonitor._id];
                bedMonitor.bedMonitorName = bedMonitor.name;
            }
            
            console.log(vm.model.bedMonitors); 

            if ($scope.theForm.$valid) {
                if (vm.model.bedMonitors.length > vm.model.capacity) {
                    vmh.alertWarning(vm.viewTranslatePath('MSG-OVER-CAPACITY'), true);
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