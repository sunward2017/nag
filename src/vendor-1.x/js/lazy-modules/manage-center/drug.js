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
        .controller('DrugSyncToTenantDialogController', DrugSyncToTenantDialogController)
    ;

    DrugGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function  DrugGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});

            vm.openImportDialog = openImportDialog;
            vm.openExportToTenantDialog = openExportToTenantDialog;

            vm.query();
        }

        function openImportDialog() {
            vm.dialogData = {
                isImporting: false
            };

            ngDialog.open({
                template: 'dlg-drug-import-file-pick.html',
                controller: 'DrugImportDialogController',
                className: 'ngdialog-theme-default dialog-drug-import',
                data: vm.dialogData,
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
                preCloseCallback: function () {
                    console.log('dialog:', vm.dialogData)
                    if(vm.dialogData.isImporting) {
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
        
        function openExportToTenantDialog () {
            if (vm.selectedRows.length == 0) {
                vmh.alertWarning('notification.SELECT-NONE-WARNING', true);
                return;
            }

            var drugIds = _.map(vm.selectedRows, function(row) {return row.id});
            vm.dialogData = {
                drugIds: drugIds,
                isSync: false
            };

            ngDialog.open({
                template: 'dlg-drug-sync-to-tenant-pick.html',
                controller: 'DrugSyncToTenantDialogController',
                className: 'ngdialog-theme-default dialog-drug-sync-to-tenant',
                data: vm.dialogData,
                resolve:{
                    vmh: function () {
                        return vmh;
                    },
                    translatePath: function () {
                        return function (key) {
                            return 'dlg-drug-sync-to-tenant-pick.html.' + key;
                        }
                    }
                },
                preCloseCallback: function () {
                    console.log('dialog:', vm.dialogData)
                    if(vm.dialogData.isSync) {
                        // if (confirm('Are you sure you want to close without saving your changes?')) {
                        //     return true;
                        // }
                        return ngDialog.openConfirm({
                            template: 'customConfirmDialog.html',
                            className: 'ngdialog-theme-default',
                            controller: ['$scope', function ($scopeConfirm) {
                                $scopeConfirm.message = '正在同步药品到指定的机构,如果此时关闭将导致不可预料的后果,继续关闭么?'
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
                    vmh.alertSuccess('notification.SYNC-SUCCESS', true);
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

                    $scope.ngDialogData.isImporting = true;

                    vmh.extensionService.importDrug(vm.dir + vm.toImport).then(function (ret) {
                        $scope.ngDialogData.isImporting = false;
                        $scope.closeThisDialog();
                    }, function (err) {
                        console.log(err);
                    }).finally(function(){
                        if($scope.ngDialogData.isImporting){
                            $scope.ngDialogData.isImporting = false;
                        }
                        vm.importDrugBlocker.stop();
                    })
                })
                

            });
        }
    }

    DrugSyncToTenantDialogController.$inject = ['$scope', 'vmh', 'translatePath', 'ngDialog', 'blockUI'];

    function DrugSyncToTenantDialogController($scope, vmh, translatePath, ngDialog, blockUI) {
        var vm = $scope.vm = {};
        vm.translatePath = translatePath;
        init();

        function init() {
            vm.syncSelected = syncSelected;

            vm.drugIds = $scope.ngDialogData.drugIds;

            vm.syncToTenantBlocker = blockUI.instances.get('sync-to-tenant');
            vm.drugSyncToTenantPromise = vmh.shareService.tmp('T3001/pub-tenant', 'name type', {status: 1, type: {$in:['A0001', 'A0002', 'A0003']}});
        }

        function syncSelected () {
            if(!vm.toSyncTenant){
                vmh.alertWarning(vm.translatePath('MSG-NO-TENANT-SELECTED'), true);
                return;
            }

            ngDialog.openConfirm({
                template: 'normalConfirmDialog.html',
                className: 'ngdialog-theme-default'
            }).then(function () {

                console.log('-----------sync to selected tenant:', vm.toSyncTenant);

                vmh.translate(vm.translatePath('LOADING-TEXT-SYNC-TO-TENANT')).then(function(translatedText){
                    vm.syncToTenantBlocker.start({
                        message: translatedText,
                    });

                    $scope.ngDialogData.isSync = true;

                    vmh.extensionService.syncDrugToTenants([vm.toSyncTenant], vm.drugIds).then(function (ret) {
                        $scope.ngDialogData.isSync = false;
                        $scope.closeThisDialog();
                    }, function (err) {
                        console.log(err);
                    }).finally(function(){
                        if($scope.ngDialogData.isSync){
                            $scope.ngDialogData.isSync = false;
                        }
                        vm.syncToTenantBlocker.stop();
                    })
                });
            });
        }
    }

})();