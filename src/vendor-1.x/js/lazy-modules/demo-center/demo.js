/**=========================================================
 * Module: demo.controller.js
 * Handle demo elements
 =========================================================*/

(function() {
    'use strict';

    angular
        .module('subsystem.demo-center')
        .controller('DemoGridBasicController', DemoGridBasicController)
        .controller('DemoGridBasicDetailsController', DemoGridBasicDetailsController)
        .controller('DemoTreeBasicController', DemoTreeBasicController)
        .controller('DemoTreeExtendController', DemoTreeExtendController)
        .controller('DemoTreeSearchController',DemoTreeSearchController)
        .controller('DemoTreeDirectiveController', DemoTreeDirectiveController)
        .controller('DemoTreeNavController', DemoTreeNavController)
        .controller('DemoTreeTileController', DemoTreeTileController)
        .controller('DemoIMGProcessQiNiuController',DemoIMGProcessQiNiuController)
        .controller('DemoDropdownController', DemoDropdownController)
        .controller('DemoBackfillerController', DemoBackfillerController)
        .controller('BackfillerDemoPickDialogController', BackfillerDemoPickDialogController)
        .controller('DemoBoxInputController', DemoBoxInputController)
        .controller('DemoPromiseController',DemoPromiseController)
    ;

    DemoGridBasicController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function DemoGridBasicController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();


        function init() {

            //console.log(vm._subsystem_);
            //console.log(vm._module_);
            //console.log(vm._view_);
            //console.log(vm._action_);
            vm.init({removeDialog: ngDialog});
            vm.query();

        }

    }

    DemoGridBasicDetailsController.$inject = ['$scope', 'vmh', 'entityVM'];

    function DemoGridBasicDetailsController($scope, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;
        //$scope.utils.vinput.$inject = ['$scope'];

        init();

        function init() {
            //console.log(entity._subsystem_);
            //console.log(entity._module_);
            //console.log(entity._view_);
            //console.log(entity._action_);
            //console.log(entity._id_);
            vm.doSubmit = doSubmit;

            vm.tab1 = {cid: 'contentTab1'};
            vm.tab2 = {cid: 'contentTab2'};

            if (vm._id_ != 'new') {


                var defered = vmh.q.defer();
                var promise = defered.promise;

                vmh.timeout(function () {

                    defered.resolve({success: true, error: null});
                    //defered.reject({success: false, error: 'test error'});
                }, 1000);

                promise.then(function (ret) {
                    vm.load();
                }).catch(function (err) {
                    console.log('load error:');
                    console.log(err);
                }).finally(function () {
                    vmh.loadingBar.complete(); // End loading.
                    vmh.blocker.stop();
                });

                console.log('load...');
                vmh.loadingBar.start();
                vmh.blocker.start();
            }

        }


        function doSubmit() {

            if ($scope.demoForm.$valid) {
                //console.log(vm.model);
                //var defered = vmh.q.defer();
                //var promise = defered.promise;
                //
                //vmh.timeout(function () {
                //
                //    vm.save();
                //    defered.resolve({success: true, error: null});
                //    //defered.reject({success: false, error: 'test error'});
                //}, 2000);
                //
                //promise.then(function (ret) {
                //    $scope.$state.go(vm.moduleRoute('list'));
                //}).catch(function (err) {
                //}).finally(function () {
                //    vmh.loadingBar.complete(); // End loading.
                //    vmh.blocker.stop();
                //});
                //
                //vmh.loadingBar.start();
                //vmh.blocker.start();
                vm.save();
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
                else if ($scope.utils.vtab(vm.tab2.cid)) {
                    vm.tab2.active = true;
                }
            }
        }
    }

    DemoTreeBasicController.$inject = ['$scope','vmh', 'instanceVM'];

    function DemoTreeBasicController($scope,vmh, vm) {

        $scope.vm = vm;

        init();


        function init() {
            vm.init();

            var subsystemURL = 'server/district.json' + '?v=' + (new Date().getTime()); // jumps cache

            vmh.http
                .get(subsystemURL)
                .success(function (treeNodes) {
                    //##import tip##
                    //单棵树
                    //vm.tree1 = new tree.sTree('tree1', treeNodes);
                    //过滤
                    //vmh.treeFactory.filter(treeNodes,function(node) {
                    //    console.log(node._id);
                    //    return node._id.indexOf('120502') != 0;
                    //});
                    //##import tip##
                    //多棵树

                    vm.trees = [new vmh.treeFactory.sTree('tree1', treeNodes), new vmh.treeFactory.sTree('tree2', treeNodes, {mode: 'check'})];
                    console.log('vm.trees:', vm.trees);
                });


            $scope.$on('tree:node:select', function ($event,node) {
                console.log(node);
            });
        }

    }

    DemoTreeExtendController.$inject = ['$scope','vmh', 'instanceVM'];

    function DemoTreeExtendController($scope, vmh, vm) {

        $scope.vm = vm;

        init();


        function init() {
            vm.init();

            var subsystemURL = 'server/district.json' + '?v=' + (new Date().getTime()); // jumps cache

            vmh.http
                .get(subsystemURL)
                .success(function (treeNodes) {

                    vm.trees = [new vmh.treeFactory.sTree('tree1', treeNodes),
                        new vmh.treeFactory.sTree('tree2', treeNodes, {mode: 'check', checkCascade: false})
                        ];//{expandLevel: 2}
                    //new vmh.treeFactory.sTree('tree3', angular.copy(treeNodes),{layout: 'dropdown',ngModel:'vm.field'})

                    //vm.trees[0].selectedNode = vm.trees[0].findNode('0-2-1'); //by $index
                    vm.trees[0].selectedNode = vm.trees[0].findNodeById('120404');//by _id
                    //vm.trees[0].setNodeChecked([vm.trees[0].findNodeById('120103'),vm.trees[0].findNodeById('120304')]);
                    vm.trees[1].checkedNodes = [vm.trees[1].findNodeById('1201'), vm.trees[1].findNodeById('120304'), vm.trees[1].findNodeById('120305')];



                });



            $scope.$on('tree:node:select', function ($event, node) {
                //console.log(node);
            });
        }

    }

    DemoTreeSearchController.$inject = ['$scope','vmh', 'instanceVM'];

    function DemoTreeSearchController($scope, vmh, vm) {

      $scope.vm = vm;
      vm.searchBox = searchBox;
      var tNodes =[];

      init();
      function init() {
        vm.init();

        var subsystemURL = 'server/district.json' + '?v=' + (new Date().getTime()); // jumps cache

        vmh.http
            .get(subsystemURL)
            .success(function (treeNodes) {
              tNodes = treeNodes;
              console.log('tNodes:',tNodes);
              vm.trees = [new vmh.treeFactory.sTree('tree1', treeNodes),
                new vmh.treeFactory.sTree('tree2', treeNodes, {mode: 'check', checkCascade: false})
              ];
              console.log('vm.trees:',vm.trees);

              //vm.trees[0].selectedNode = vm.trees[0].findNode('0-2-1'); //by $index
              vm.trees[0].selectedNode = vm.trees[0].findNodeById('120404');//by _id
              //vm.trees[0].setNodeChecked([vm.trees[0].findNodeById('120103'),vm.trees[0].findNodeById('120304')]);
              vm.checkedNodes=vm.trees[1].checkedNodes = [vm.trees[1].findNodeById('1201'), vm.trees[1].findNodeById('120304'), vm.trees[1].findNodeById('120305')];
              vm.lastChecked = vm.checkedNodes.slice(0);
              console.log('initial vm.lastChecked:',vm.lastChecked);

            });

        $scope.$on('tree:node:select', function ($event, node) {
          //console.log(node);
        });

        $scope.$on('tree:node:checkChange', function ($event, checkedNodes,$index){
          console.log('checkedNodes:',checkedNodes);
          console.log('vm.lastChecked:',vm.lastChecked);
          if(checkedNodes.length <vm.lastChecked.length){
            _.each(vm.lastChecked,function (o) {
              var isChecked = _.findIndex(checkedNodes,function (checked) {
                return checked._id == o._id;
              });
              if(isChecked == -1){
                var unCheckedIdx = _.findIndex(vm.checkedNodes,function (one) {
                  return one._id == o._id;
                });
                vm.checkedNodes.splice(unCheckedIdx,1);
              }
            });
          }else{
            _.each(checkedNodes,function (o) {
              var isChecked = _.findIndex(vm.checkedNodes,function (checked) {
                return checked._id == o._id;
              });
              if(isChecked == -1){
                vm.checkedNodes.push(o);
              }
            });
          }
          console.log('vm.checkedNodes:',vm.checkedNodes);
          vm.lastChecked = checkedNodes;
        });
      }

      function searchBox(value,idx) {
        var tree = idx==0 ? 'tree1' :'tree2';
        var nodes =[];
        if(value){
          var reg = new RegExp('^'+value);
          console.log('reg:',reg);
          var filterNodes = regMatch(reg);
          console.log('filterNodes:',filterNodes);
          nodes = filterNodes;
        }else {
          nodes =tNodes;
          console.log('nodes:',nodes);
        }
        vm.trees[idx] = idx==0 ? new vmh.treeFactory.sTree(tree, nodes) : new vmh.treeFactory.sTree(tree, nodes, {mode: 'check', checkCascade: false});
        if(idx==1){
          showCheckedNodes(idx);
        }
      }

      function regMatch(reg) {
        var filterNodes=[], fNodes;
        for(var i=0,pLen= tNodes.length; i<pLen; i++) {
          var province = tNodes[i];
          if(province.name.match(reg)){
            fNodes = angular.copy(province);
            filterNodes.push(fNodes);
            continue;
          }
          if(province.children ){
            for(var j=0,cLen = province.children.length; j<cLen; j++) {
              var city = province.children[j];
              if(city.name.match(reg)){
                fNodes = angular.copy(city);
                filterNodes.push(fNodes);
                continue;
              }
              if(city.children){
                for(var k=0,dLen=city.children.length;k<dLen;k++) {
                  var district =city.children[k];
                  if(district.name.match(reg)){
                    fNodes = angular.copy(district);
                    filterNodes.push(fNodes);
                    continue;
                  }
                }
              }
            }
          }
        }
        return filterNodes;
      }
      
      function showCheckedNodes(idx) {
        _.each(vm.checkedNodes,function (o) {
          if(vm.trees[idx].findNodeById(o._id)){
            vm.trees[idx].checkedNodes.push(vm.trees[idx].findNodeById(o._id));
          }
        });
        vm.lastChecked = vm.trees[idx].checkedNodes;
      }
    }

    DemoTreeDirectiveController.$inject = ['$scope','vmh', 'instanceVM'];

    function DemoTreeDirectiveController($scope, vmh, vm) {

        $scope.vm = vm;

        init();


        function init() {
            vm.init();

            var subsystemURL = 'server/district.json' + '?v=' + (new Date().getTime()); // jumps cache

            vm.treeDataPromise = vmh.http.get(subsystemURL).then(function(res){
                vm.selectedDistrict = '120101';

                vm.checkedDistricts = ['120201','120203'];

                vm.selectedDistrictOfDropDown = ['120301','120304'];

                return res.data;
            });



            $scope.$on('tree:node:select', function ($event,node) {
                console.log(node);
            });
        }

    }

    DemoTreeNavController.$inject = ['$scope','vmh', 'instanceVM'];

    function DemoTreeNavController($scope, vmh, vm) {

        $scope.vm = vm;

        init();


        function init() {
            vm.init();

            var subsystemURL = 'server/district.json' + '?v=' + (new Date().getTime()); // jumps cache

            vm.treeDataPromise = vmh.http.get(subsystemURL).then(function(res){
                vm.selectedDistrict = '120101';

                return res.data;
            });



            $scope.$on('tree:node:select', function ($event,node) {
                console.log(node);
            });
        }

    }

    DemoTreeTileController.$inject = ['$scope','vmh', 'instanceVM'];

    function DemoTreeTileController($scope, vmh, vm) {

        $scope.vm = vm;

        init();


        function init() {
            vm.init();

            var subsystemURL = 'server/district.json' + '?v=' + (new Date().getTime()); // jumps cache

            vm.treeDataPromise = vmh.http.get(subsystemURL).then(function(res){
                vm.selectedDistrict = '120101';

                return res.data;
            });



            $scope.$on('tree:node:select', function ($event,node) {
                console.log(node);
            });
        }

    }

    DemoIMGProcessQiNiuController.$inject = ['$scope','vmh', 'instanceVM','Auth', 'qiniuNode'];
    function DemoIMGProcessQiNiuController($scope, vmh, vm, Auth, qiniuNode) {
        $scope.vm = vm;

        init();

        function init() {
            vm.init();
            vm.user_code = Auth.getUser().code;
            vm.testNodeJSUploadImage = function () {
                return qiniuNode.upload().then(function (ret) {
                    console.log(ret.data)
                });
            }


        }
    }

    DemoDropdownController.$inject = ['$scope','vmh', 'instanceVM'];

    function DemoDropdownController($scope, vmh, vm) {

        $scope.vm = vm;

        init();


        function init() {
            vm.init();
            vm.dropdownDataPromise = vmh.shareService.d('D1015').then(function(items){
                //vm.period = items[2].value;
                return items;
            });

            vm.onSelect = onSelect;

            vm.makeEmpty = makeEmpty;
        }

        function onSelect(item){
            vm.selected = 'callback received ' + angular.toJson(item);
        }

        function makeEmpty(){
            vm.period = '';
        }
    }

    DemoBackfillerController.$inject = ['$scope','vmh', 'instanceVM'];

    function DemoBackfillerController($scope, vmh, vm) {

        $scope.vm = vm;

        init();

        function init() {
            vm.init();
            vm.page = {size: 2, no: 1};
            vm.searchForBackFiller = searchForBackFiller;
            vm.fetchRowsPromise = fetchRows();
            vm.fetchColumnsPromise = [{label: '序号',name: 'order',width: 80},{label: '名称',name: 'name',width: 620},{label: '值',name: 'value',width: 80}];
            vm.period = 'A0005' // for string

            // vm.period = {value:'A0001'}; // for object customCompareEqual


            // vm.page2 = {size: 5, no: 1};
            vm.searchForBackFiller2 = searchForBackFiller2;
            vm.fetchRowsPromise2 = fetchRows2();
            vm.fetchColumnsPromise2 = [{label: '序号',name: 'order',width: 80},{label: '名称',name: 'name',width: 620},{label: '值',name: 'value',width: 80}];
            vm.period2 = 'A1003' // for string

            // vm.period2 = {value:'A1001'}; // for object customCompareEqual

            vm.onSelect = onSelect;
            vm.onSelect2 = onSelect2;
            vm.makeEmpty = makeEmpty;
            vm.makeEmpty2 = makeEmpty2;
            vm.onCompareEqual = onCompareEqual;

        }

        function fetchRows(keyword) {
            return vmh.shareService.d('D1013');
        }

        function fetchRows2(keyword) {
            return vmh.shareService.d('D1005');
        }

        function searchForBackFiller (keyword) {
            console.log('keyword:', keyword);
            vm.fetchRowsPromise = fetchRows(keyword);
        }

        function searchForBackFiller2 (keyword) {
            console.log('keyword:', keyword);
            vm.fetchRowsPromise2 = fetchRows2(keyword);
        }

        function onCompareEqual(one, other) {
            return one.value === other.value;
        }

        function onSelect(row){
            vm.selected = 'callback received ' + angular.toJson(row);
        }
        function onSelect2(row){
            vm.selected2 = 'callback received ' + angular.toJson(row);
        }

        function makeEmpty(){
            vm.period = '';
        }

        function makeEmpty2(){
            vm.period2 = '';
        }
    }

    BackfillerDemoPickDialogController.$inject = ['$scope', 'vmh'];

    function BackfillerDemoPickDialogController ($scope, vmh) {
        var vm = $scope.vm = {};

        init();

        function init() {
            vm.pickOne = pickOne;

            vm.search = $scope.ngDialogData.search;
            vm.translatePath = $scope.ngDialogData.translatePath;
            vm.title = $scope.ngDialogData.title;
            vm.rows = $scope.ngDialogData.rows;
            vm.columns = $scope.ngDialogData.columns;
            vm.page = $scope.ngDialogData.page || {size: 10, no: 1};
            $scope.ngDialogData.notify.reloadData = reloadData;

            $scope.ngDialogData.notify.reloadRows = reloadRows;
        }

        function pickOne(row) {
            $scope.closeThisDialog(row);
        }

        function reloadRows(rows) {
            vm.rows = rows;
        }
    }

    DemoBoxInputController.$inject = ['$scope','vmh', 'instanceVM'];

    function DemoBoxInputController($scope, vmh, vm) {

        $scope.vm = vm;

        init();


        function init() {
            vm.init();


            vmh.shareService.d('D1006').then(function(sexes){
                vm.selectBinding.sex = sexes;
            });

        }

    }

    DemoPromiseController.$inject = ['$scope','vmh', 'instanceVM'];
    function DemoPromiseController($scope, vmh, vm) {

        $scope.vm = vm;

        init();


        function init() {
            vm.init();

            var p1 = vmh.q.when(true);
            var p2 = vmh.q.when(false).then(function (ret) {
                return vmh.q.when(true);
            });

            var f = function () {
                return vmh.debugService.tenantInfo('56cedebf7768e0eb161e1787','name');
            };

            var p3 = f();
            vmh.q.all([p1, p2,p3]).then(function (ret) {
                console.log(ret);
            });
        }

    }

})();
