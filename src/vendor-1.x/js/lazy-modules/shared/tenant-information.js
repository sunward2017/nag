/**
 * Created by hcl on 17-8-22.
 */
(function() {
    'use strict';

    angular
        .module('subsystem.shared')
        .controller('TenantInformationController', TenantInformationController)
    ;
    TenantInformationController.$inject = ['$scope', 'ngDialog', 'vmh', 'instanceVM'];

    function TenantInformationController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.v;
        var tenantService = vm.modelNode.services['pub-tenant'];

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.doSubmit = doSubmit;
            vm.fillSplashArray = fillSplashArray;

            vmh.parallel([
                vmh.fetch(tenantService.query({_id: vm.tenantId})),
                vmh.shareService.d('D3032'),
                vmh.shareService.d('D3033'),
                vmh.shareService.d('D3034'),
                vmh.shareService.d('D3035'),
                vmh.shareService.d('D3036'),
                vmh.shareService.d('D3037'),
                vmh.shareService.d('D3038')
            ]).then(function (results) {
                // console.log('results:',results);
                vm.model.other_config = results[0][0].other_config;
                vm.model.nature = results[0][0].nature;
                vm.model.type2 = results[0][0].type2;
                vm.model.service_object = results[0][0].service_object;
                vm.model.published_on = results[0][0].published_on;
                vm.model.area = results[0][0].area;
                vm.model.address = results[0][0].address;
                vm.tenant_imgs_num =String(results[0][0].imgs ? results[0][0].imgs.length : 0);
                vm.tenant_imgs = [].concat(results[0][0].imgs );


                vm.selectBinding.feeSelection = results[1];
                vm.selectBinding.starRange = results[2];
                vm.selectBinding.bedsNum = results[3];
                vm.selectBinding.nature = results[4];
                vm.selectBinding.type2 = results[5];
                vm.selectBinding.serviceObject = results[6];
                vm.selectBinding.tenantImgsNum = results[7];

                fillSplashArray();
            });

            vm.areaDataPromise = vmh.shareService.t('district').then(function (nodes) {
                return nodes;
            });


        }

        function fillSplashArray () {
            if(angular.isString(vm.tenant_imgs_num)) {
                if (parseInt(vm.tenant_imgs_num) > vm.tenant_imgs.length) {
                    for(var i=vm.tenant_imgs.length;i<  parseInt(vm.tenant_imgs_num);i++) {
                        vm.tenant_imgs[i] = null
                    }
                } else if (parseInt(vm.tenant_imgs_num) < vm.tenant_imgs.length) {
                    vm.tenant_imgs.splice(parseInt(vm.tenant_imgs_num), vm.tenant_imgs.length - parseInt(vm.tenant_imgs_num))
                }
            }
            console.log('vm.tenant_imgs:',vm.tenant_imgs);
        }

        function doSubmit(){
            if ($scope.theForm.$valid) {
                vm.model.imgs=vm.tenant_imgs ;
                tenantService.update(vm.tenantId,vm.model);
                vmh.alertSuccess();
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }

    }

})();