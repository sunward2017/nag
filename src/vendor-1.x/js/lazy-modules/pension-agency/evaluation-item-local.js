/**
 * Created by hcl on 17-12-26.
 */
(function() {
  'use strict';

  angular
      .module('subsystem.pension-agency')
      .controller('EvaluationItemLocalGridController', EvaluationItemLocalGridController)
      .controller('EvaluationItemLocalDetailsController', EvaluationItemLocalDetailsController)
  ;


  EvaluationItemLocalGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function EvaluationItemLocalGridController($scope, ngDialog, vmh, vm) {

    $scope.vm = vm;
    $scope.utils = vmh.utils.g;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});
      vm.query();
    }


  }

  EvaluationItemLocalDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function EvaluationItemLocalDetailsController($scope, ngDialog, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;

    init();

    function init() {

      vm.init({removeDialog: ngDialog});

      vm.doSubmit = doSubmit;
      vm.checkOptionMemberAll=checkOptionMemberAll;
      vm.addOptionMember = addOptionMember;
      vm.removeOptionMember = removeOptionMember;
      vm.editOptionMember = editOptionMember;
      vm.saveOptionMember = saveOptionMember;
      vm.cancelOptionMember = cancelOptionMember;

      vm.tab1 = {cid: 'contentTab1'};
      vmh.shareService.d('D3044').then(function(rows) {
        vm.selectBinding.type = rows;
      });
      vmh.shareService.d('D3045').then(function(rows) {
        vm.selectBinding.mode = rows;
      });
      vm.load().then(function () {
        if(!vm.model.options){
          vm.model.options=[];
        }
      });

    }

    function checkOptionMemberAll($event) {
      var rowCheckState = true;
      if ($event.target.tagName == "INPUT" && $event.target.type == "checkbox") {
        var $checkbox = angular.element($event.target);
        rowCheckState = $checkbox.prop('checked');
      }
      for (var i = 0; i < vm.model.options.length; i++) {
        vm.model.options[i].checked = rowCheckState;
      }
    }

    function addOptionMember() {
      if (!vm.$gridEditingOfOptionMember) {
        vm.model.options.push({isNew: true,$editing: true});
        vm.$gridEditingOfOptionMember = true;
      }
    }

    function removeOptionMember() {
      var haveSelected = _.some(vm.model.options, function (row) {
        return row.checked
      });
      if (!haveSelected) {
        return vmh.translate('notification.SELECT-NONE-WARNING').then(function (ret) {
          vmh.notify.alert('<div class="text-center"><em class="fa fa-warning"></em> ' + ret + '</div>', 'warning');
        });
      }
      ngDialog.openConfirm({
        template: 'removeConfirmDialog.html',
        className: 'ngdialog-theme-default'
      }).then(function () {
        for (var i = 0; i < vm.model.options.length; i++) {
          var row = vm.model.options[i];
          if (row.checked) {
            vm.model.options.splice(i, 1);
            i--;
          }
        }
      });
    }

    function editOptionMember(row) {
      vm.editingRow = angular.copy(row);
      row.$editing = true;
      vm.$gridEditingOfOptionMember = true;
    }

    function saveOptionMember(row) {
      if(!row.name || !row.value ||!(row.score>=0)){
        if(!row.name){
          row.nameFlag = true;
        }
        if(!row.value){
          row.valueFlag =true;
        }
        if(!row.score){
          row.scoreFlag = true;
        }
        return;
      }else {
        row.nameFlag = undefined;
        row.valueFlag = undefined;
        row.scoreFlag = undefined;
      }
      if (row.isNew) {
        row.isNew = false;
      }
      else {
        vm.editingRow = null;
      }
      row.$editing = false;
      vm.$gridEditingOfOptionMember = false;
    }

    function cancelOptionMember(row) {
      if (row.isNew) {
        vm.model.options.splice(vm.model.options.length - 1, 1);
      } else {
        _.extend(row, vm.editingRow);
      }
      row.$editing = false;
      vm.$gridEditingOfOptionMember = false;
    }

    function doSubmit() {
      if ($scope.theForm.$valid) {
        console.log('vm.model:', vm.model);
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