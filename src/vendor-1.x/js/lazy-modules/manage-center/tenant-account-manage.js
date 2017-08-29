/**
 * Created by zppro on 16-3-22.
 */

(function() {
    'use strict';

    angular
        .module('subsystem.manage-center')
        .controller('TenantAccountManageDetailsController', TenantAccountManageDetailsController)
    ;

    TenantAccountManageDetailsController.$inject = ['$scope','ngDialog', 'vmh','entityVM'];

    function TenantAccountManageDetailsController($scope, ngDialog, vmh, vm) {


        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;



        init();

        function init() {
            vm.init({removeDialog: ngDialog});

            vmh.shareService.d('D1002').then(function(rows) {
                vm.selectBinding.tenantTypes = _.filter(rows, function (row) {
                    var filterType = vm.selectFilterObject.type;
                    if (_.isString(filterType)) {
                        return filterType == row.value;
                    }
                    else if (_.isArray(filterType)) {
                        return _.contains(filterType, row.value);
                    }
                    return true;
                });
            });

            vmh.shareService.d('D3032').then(function(rows) {
                vm.selectBinding.feeSelection = rows;
            });
            vmh.shareService.d('D3033').then(function(rows) {
                vm.selectBinding.starRange = rows;
            });
            vmh.shareService.d('D3034').then(function(rows) {
                vm.selectBinding.bedsNum = rows;
            });
            vmh.shareService.d('D3035').then(function(rows) {
                vm.selectBinding.tenantProperty = rows;
            });
            vmh.shareService.d('D3036').then(function(rows) {
                vm.selectBinding.tenantType = rows;
            });
            vmh.shareService.d('D3037').then(function(rows) {
                vm.selectBinding.serveTarget = rows;
            });
            vmh.shareService.d('D3038').then(function(rows) {
                vm.selectBinding.tenantImgsNum = rows;
            });



            vm.areaDataPromise = vmh.shareService.t('district').then(function (nodes) {
                console.log("res nodes:",nodes);
                // vm.selectedAreaOfDropDown = '010105';
                return nodes;
            });


            vm.fillSplashArray = fillSplashArray;
            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};
            vm.tab2 = {cid: 'contentTab2'};

            vm.load().then(function () {
                vm.tenant_imgs_num =String(vm.model.imgs ? vm.model.imgs.length : 0);
                vm.tenant_imgs = [].concat(vm.model.imgs);
                fillSplashArray();
            });

        }
        function fillSplashArray () {
            // console.log('vm.tenant_imgs_num:',vm.tenant_imgs_num);
            if(angular.isString(vm.tenant_imgs_num)) {
                if (parseInt(vm.tenant_imgs_num) > vm.tenant_imgs.length) {
                    for(var i=vm.tenant_imgs.length;i<  parseInt(vm.tenant_imgs_num);i++) {
                        vm.tenant_imgs[i] = null
                    }
                } else if (parseInt(vm.tenant_imgs_num) < vm.tenant_imgs.length) {
                    vm.tenant_imgs.splice(parseInt(vm.tenant_imgs_num), vm.tenant_imgs.length - parseInt(vm.tenant_imgs_num))
                }
                // console.log("fillSplashArray vm.tenant_imgs:",vm.tenant_imgs)
            }
        }


        function doSubmit() {

            if ($scope.theForm.$valid) {
                //console.log(vm.model);
                console.log("doSubmit vm.tenant_imgs:",vm.tenant_imgs);
                vm.model.imgs = vm.tenant_imgs;
                vm.save();
            }
            else {
                console.log("submit unvalid");
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
                else if ($scope.utils.vtab(vm.tab2.cid)) {
                    vm.tab2.active = true;
                }
            }
        }
    }

})();
