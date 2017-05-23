/**
 * district Created by zsx on 17-3-28.
 * Target:养老机构片区  (移植自fsrok)
 */

(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('DrugInstockGridController', DrugInstockGridController)
        .controller('DrugInstockDetailsController', DrugInstockDetailsController)
        .directive('abc', abc)
        ;

    DrugInstockGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function DrugInstockGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;
        vm.abolish = abolish;

        init();

        function init() {
            vm.init({ removeDialog: ngDialog });
            vm.query();
        }

        function abolish(row) {
            if (!row.valid_flag) return;
            vm.removeDialog.openConfirm({
                template: 'normalConfirmDialog.html',
                className: 'ngdialog-theme-default'
            }).then(function () {

                vmh.psnService.instockAbolish(row._id)
                    .then(function (ret) {
                        vmh.alertSuccess(vm.viewTranslatePath('SYNC_FAMILY_MEMBERS_SUCCESS'), true);
                        vm.query();
                    });
            })
        }
    }
    DrugInstockDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function DrugInstockDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;

        init();

        function init() {

            vm.init({ removeDialog: ngDialog });
            vm.doSubmit = doSubmit;
            vm.showDrug = showDrug;
            vm.queryElderlyPromise = queryElderly();
            vm.fetchElderlyColumnsPromise = [{ label: '入院登记号', name: 'enter_code', width: 100 }, { label: '姓名', name: 'name', width: 100 }];

            vm.selectElerlyForBackFiller = selectElerlyForBackFiller;


            vm.tab1 = { cid: 'contentTab1' };

            vmh.parallel([
                vmh.shareService.d('D3013'),
            ]).then(function (results) {
                vm.selectBinding.unit = results[0];
            })

            vm.typePromise = vmh.shareService.d('D3014').then(function (hobbies) {
                vmh.utils.v.changeProperyName(hobbies, [{ o: 'value', n: '_id' }]);
                return hobbies;
            });

            vm.load().then(function () {
                if (vm.model.elderlyId) {
                    vm.selectedElderly = { _id: vm.model.elderlyId, name: vm.model.elderly_name };
                }
            });

        }

        function queryElderly(keyword) {
            return vmh.fetch(vmh.psnService.queryElderly(vm.tenantId, keyword, {
                live_in_flag: true,
                // sbegin_exit_flow: {'$in':[false,undefined]}
            }, 'name enter_code'));
        }



        function showDrug() {
           vmh.fetch(vmh.psnService.drugQueryAll(vm.tenantId,vm.model.barcode))
           .then(function(ret){
                // console.log(ret);
                if(!_.isEmpty(ret)){
                     vm.model.barcode = ret.barcode;
                     vm.model.drug_full_name = ret.full_name;
                     vm.model.vender= ret.vender;
                     vm.model.sourceId = ret.sourceId;
                }else{
                     vmh.alertWarning(vm.viewTranslatePath('TOOLTIP_MANUAL'), true);
                     return;
                }
               
           })
             
        }


        function selectElerlyForBackFiller(row) {
            if (row) {
                vm.model.enter_code = row.enter_code;
                vm.model.elderlyId = row.id;
                vm.model.elderly_name = row.name;
            }
        }

        function doSubmit() {

            if ($scope.theForm.$valid) {
                vm.model.in_out_no = "IN-" + new Date().valueOf();
                 vm.model.in_out_type =1;
                vm.save(true).then(function (ret) {
                    vmh.psnService.drugInStock(vm.model).then(function (ret) {
                        vmh.alertSuccess(vm.viewTranslatePath('SYNC_FAMILY_MEMBERS_SUCCESS'), true);
                        vm.returnBack();
                    });
                })
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }


    }
    // abc.$inject = ['entityVM'];
    function abc() {
        return {
            restrict: 'AE',
            // template:'<div>hello angularJS</div>',
            replace: true,
            link: link,
            scope: { onChange: '&', model: '=ngModel', }
        }
        function link(scope, element, attrs) {
            element.on("keyup", function () {
                var vilid_flag = RegExp(/^\d{13}$/).test(scope.model)
                if (vilid_flag) {
                    scope.onChange();
                }
            })
        }
    }

})();