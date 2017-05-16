/**
 * district Created by zppro on 17-5-12.
 * Target: 管理平台 数据管理 药品
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.manage-center')
        .controller('DrugGridController',DrugGridController)
        .controller('DrugDetailsController',DrugDetailsController)
        .controller('DrugImportDialogController', DrugImportDialogController)
    ;

    DrugGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function  DrugGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});

            vm.openImportDialog = openImportDialog;

            vm.query();
        }

        function openImportDialog() {

            ngDialog.open({
                template: 'dlg-drug-import-file-pick.html',
                controller: 'DrugImportDialogController',
                className: 'ngdialog-theme-default dialog-drug-import',
                resolve:{
                    vmh: function () {
                        return vmh;
                    },
                    translatePath: function () {
                        return function (key) {
                            return 'dlg-drug-import-file-pick.html.' + key;
                        }
                    }
                },
                preCloseCallback: function (isImporting) {
                    console.log('isImporting:', arguments)
                    if(isImporting) {
                        // if (confirm('Are you sure you want to close without saving your changes?')) {
                        //     return true;
                        // }
                        return ngDialog.openConfirm({
                            template: 'customConfirmDialog.html',
                            className: 'ngdialog-theme-default',
                            controller: ['$scope', function ($scopeConfirm) {
                                $scopeConfirm.message = '正在导入药品,如果此时关闭将导致不可预料的后果,继续关闭么?'
                            }]
                        }).then(function () {
                            return true;
                        });
                    } else {
                        return true;
                    }
                }
            }).closePromise.then(function (ret) {
                if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
                    vmh.alertSuccess('notification.IMPORT-SUCCESS', true);
                    vm.query();
                }
            });
        }
    }


    DrugDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

    function  DrugDetailsController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;


        init();

        function init() {

            vm.init({removeDialog: ngDialog});


            vm.doSubmit = doSubmit;
            vm.tab1 = {cid: 'contentTab1'};

            vm.load();

        }


        function doSubmit() {

            if ($scope.theForm.$valid) {
                vm.save();
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }
    }

    DrugImportDialogController.$inject = ['$scope', 'vmh', 'translatePath', 'ngDialog', 'blockUI'];

    function DrugImportDialogController($scope, vmh, translatePath, ngDialog, blockUI) {
        var vm = $scope.vm = {};
        vm.translatePath = translatePath;
        init();

        function init() {
            vm.dir = 'drug';

            vm.importSelected = importSelected;
            vm.importDrugBlocker = blockUI.instances.get('import-drug');
            vm.drugImportExcelsPromise = vmh.shareService.tmp('T0200', 'name', {
                dir: vm.dir,
                exts: ['.xls', '.xlsx']
            });

        }

        function importSelected () {
            if(!vm.toImport){
                vmh.alertWarning(vm.translatePath('MSG-NO-FILE-SELECTED'), true);
                return;
            }

            ngDialog.openConfirm({
                template: 'normalConfirmDialog.html',
                className: 'ngdialog-theme-default'
            }).then(function () {

                console.log('-----------import selected file:', vm.toImport);
                
                vmh.translate(vm.translatePath('LOADING-TEXT-IMPORTING-DRUG')).then(function(translatedText){
                    vm.importDrugBlocker.start({
                        message: translatedText,
                    });
                    vm.isImporting = true;
                    
                    vmh.extensionService.importDrug(vm.dir + vm.toImport).then(function (ret) {
                        vm.isImporting = false;
                        $scope.closeThisDialog();
                    }, function (err) {
                        console.log(err);
                    }).finally(function(){
                        vm.importDrugBlocker.stop();
                    })
                })
                

            });
        }
    }

})();