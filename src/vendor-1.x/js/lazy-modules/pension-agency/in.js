/**
 * in Created by zppro on 17-3-2.
 * Target:老人在院管理  (移植自fsrok)
 */
(function() {
  'use strict';

  angular
    .module('subsystem.pension-agency')
    .controller('InGridController', InGridController)
    .controller('InDetailsController', InDetailsController)
    .controller('InConfigController', InConfigController)
    .controller('InQRCodeController', InQRCodeController)
    .controller('DialogChangeElderlyBoardInfoController', DialogChangeElderlyBoardInfoController)
    .controller('DialogChangeElderlyRoomInfoController', DialogChangeElderlyRoomInfoController)
    .controller('DialogChangeElderlyChargeItemForOtherAndCustomizedController', DialogChangeElderlyChargeItemForOtherAndCustomizedController)
  ;


  InGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function InGridController($scope, ngDialog, vmh, vm) {

    $scope.vm = vm;
    $scope.utils = vmh.utils.g;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});

      vm.readElderlyArchive = readElderlyArchive;
      vm.exportExcelForEldelryPrintQRLabel = exportExcelForEldelryPrintQRLabel;
      vm.query();
    }

    function readElderlyArchive(row) {

    }

    function exportExcelForEldelryPrintQRLabel() {
      vmh.psnService.exportExcelForEldelryPrintQRLabel('老人二维码打印信息表(' + vm.tenant_name + '-' + moment().format('YYYY.MM.DD') + ')', vm.tenantId);
    }
  }

  InDetailsController.$inject = ['$scope', 'ngDialog', 'PENSION_AGENCY_DEFAULT_CHARGE_STANDARD', 'PENSION_AGENCY_CHARGE_ITEM', 'vmh', 'entityVM'];

  function InDetailsController($scope, ngDialog, PENSION_AGENCY_DEFAULT_CHARGE_STANDARD, PENSION_AGENCY_CHARGE_ITEM, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;

    var roomOccupancyChangeHistoryService = vm.modelNode.services['psn-roomOccupancyChangeHistory'];
    var enterService = vm.modelNode.services['psn-enter'];

    init();

    function init() {

      vm.init({removeDialog: ngDialog});

      vm.serverSideCheck = serverSideCheck;
      vm.sumPeriodPrice = sumPeriodPrice;
      vm.addElderlyFamilyMember = addElderlyFamilyMember;
      vm.editElderlyFamilyMember = editElderlyFamilyMember;
      vm.saveElderlyFamilyMember = saveElderlyFamilyMember;
      vm.cancelElderlyFamilyMember = cancelElderlyFamilyMember;
      vm.removeElderlyFamilyMember = removeElderlyFamilyMember;
      vm.checkElderlyFamilyMemberAll = checkElderlyFamilyMemberAll;
      vm.refreshRoomOccupancyChangeHistory = refreshRoomOccupancyChangeHistory;
      vm.refreshJournalAccount = refreshJournalAccount;
      vm.submitApplicationToExit = submitApplicationToExit;
      vm.doSubmit = doSubmit;
      vm.changeBoard = changeBoard;
      vm.changeRoom = changeRoom;
      vm.changeOtherAndCustomized = changeOtherAndCustomized;
      vm.getInitial = getInitial;


      vm.tab1 = {cid: 'contentTab1'};
      vm.tab2 = {cid: 'contentTab2'};

      vmh.parallel([
        vmh.shareService.d('D1006'),
        vmh.shareService.d('D1007'),
        vmh.shareService.d('D1008'),
        vmh.shareService.d('D1009'),
        vmh.shareService.d('D1010'),
        vmh.shareService.d('D1011'),
        vmh.shareService.d('D1012'),
        vmh.shareService.d('D1015'),
        vmh.shareService.d('D3002'),
        vmh.shareService.d('D3016')
      ]).then(function (results) {
        vm.selectBinding.sex = results[0];
        vm.selectBinding.marriages = results[1];
        vm.selectBinding.medical_insurances = results[2];
        vm.selectBinding.politics_statuses = results[3];
        vm.selectBinding.inhabit_statuses = results[4];
        vm.selectBinding.financial_statuses = results[5];
        vm.selectBinding.relationsWithTheElderly = results[6];
        vm.period_map = {};
        _.each(results[7], function (o) {
          vm.period_map[o.value] = o.name;
        });
        vm.selectBinding.revenue_and_expenditure_types = results[8];
        vm.selectBinding.alarm_reasons = results[9]

        var fm_received_alarm_D3016 = {}
        vm.load().then(function () {
          _.each(vm.model.family_members ,function(fm) {
            fm_received_alarm_D3016[fm._id] = _.reduce(vm.selectBinding.alarm_reasons, function(obj, item){
              obj[item.value] = _.contains(fm.received_alarm_D3016, item.value)
              return obj
            }, {})
          });
          vm.fm_received_alarm_D3016 = fm_received_alarm_D3016;

          vm.addSubGrid('journal_account', {
            model: vmh.q.when(vm.model.journal_account)
          }).then(function (grid) {
            grid.query();
          });

          vm.refreshRoomOccupancyChangeHistory();


          var selectedBoard = _.find(vm.model.charge_items, function (item) {
            return item.item_id.indexOf((PENSION_AGENCY_CHARGE_ITEM.BOARD + '-' + vm.model.charge_standard).toLowerCase()) != -1;
          });
          selectedBoard && (vm.selectedBoard = angular.copy(selectedBoard));

          var selectedNursing = _.find(vm.model.charge_items, function (item) {
            return item.item_id.indexOf((PENSION_AGENCY_CHARGE_ITEM.NURSING + '-' + vm.model.charge_standard).toLowerCase()) != -1;
          });
          selectedNursing && (vm.selectedNursing = angular.copy(selectedNursing));

          var selectedRoom = _.find(vm.model.charge_items, function (item) {
            return item.item_id.indexOf((PENSION_AGENCY_CHARGE_ITEM.ROOM + '-' + vm.model.charge_standard).toLowerCase()) != -1;
          });
          selectedRoom && (vm.selectedRoom = angular.copy(selectedRoom));

          vm.selectedRoomInfo = vm.model.room_value.districtId + '$' + vm.model.room_value.roomId + '$' + vm.model.room_value.bed_no;


          //独立成方法单独调用
          vmh.fetch(vmh.extensionService.tenantChargeItemCustomizedAsTree(vm.tenantId, PENSION_AGENCY_DEFAULT_CHARGE_STANDARD, vm._subsystem_)).then(function (ret) {
            var arrCustomized = _.map(ret.children, function (o) {
              return o._id;
            });
            vm.selectedOtherAndCustomized = _.filter(vm.model.charge_items, function (item) {
              return item.item_id.indexOf((PENSION_AGENCY_CHARGE_ITEM.OTHER + '-' + vm.model.charge_standard).toLowerCase()) != -1 ||
                _.contains(arrCustomized, item.item_id);
            });
            console.log('vm.selectedOtherAndCustomized:', vm.selectedOtherAndCustomized);
            setOtherAndCustomized();
          });
        });
      });


      vm.hobbiesPromise = vmh.shareService.d('D1013').then(function (hobbies) {
        vmh.utils.v.changeProperyName(hobbies, [{o: 'value', n: '_id'}]);
        return hobbies;
      });

      vm.medical_historiesPromise = vmh.shareService.d('D1014').then(function (medical_histories) {
        vmh.utils.v.changeProperyName(medical_histories, [{o: 'value', n: '_id'}]);
        return medical_histories;
      });

      vm.selectBinding.periodValues = _.range(1, 7);



      //vm.subGrid.journal_account.order = {};
    }

    function getInitial() {
      var initialArr = slugify(vm.model.name).split('-');
      vm.model.py = _.map(initialArr,function (o) {
        return o[0];
      }).join('');
    }

    function serverSideCheck(id_no) {
      if ((vm._action_ == 'add' && vm._id_ == 'new' && (id_no.length == 18 || id_no.length == 15))
        || vm._action == 'edit' && vm.elderlyModel.id_no != id_no) {
        return vmh.q(function (resolve, reject) {
          return vmh.extensionService.checkBeforeAddEnter(id_no, vm.model.tenantId).then(function (ret) {
            if (ret.elderly) {
              if (vm._action_ == 'add') {
                vm.elderlyModel = ret.elderly;
                vm.model.elderlyId = vm.elderlyModel._id;
              }
              else {
                _.defaults(vm.elderlyModel, ret.elderly);
              }
            }
            resolve();
          }, function (err) {
            vm.CheckBeforeAddEnterError = err;
            reject();
          });
        });
      }
      return true;
    };

    function sumPeriodPrice() {
      var totals = 0;
      if (vm.model.charge_items) {
        for (var i = 0; i < vm.model.charge_items.length; i++) {
          totals += vm.model.charge_items[i].period_price;
        }
      }

      return totals;
    }

    function addElderlyFamilyMember() {
      if (!vm.$gridEditingOfElderlyFamilyMember) {
        vm.model.family_members.push({sex: 'N', isNew: true, $editing: true})
        vm.$gridEditingOfElderlyFamilyMember = true;
      }
    }

    function editElderlyFamilyMember(row) {
      vm.editingRow = angular.copy(row);
      row.$editing = true;
      vm.$gridEditingOfElderlyFamilyMember = true;
    }

    function saveElderlyFamilyMember(row) {
      if (row.isNew) {
        row.isNew = false;
      }
      else {
        vm.editingRow = null;
      }
      row.$editing = false;
      vm.$gridEditingOfElderlyFamilyMember = false;
    }

    function cancelElderlyFamilyMember(row) {
      if (row.isNew) {
        vm.model.family_members.splice(vm.model.family_members.length - 1, 1);
      }
      else {
        _.extend(row, vm.editingRow);
      }
      row.$editing = false;
      vm.$gridEditingOfElderlyFamilyMember = false;
    }

    function removeElderlyFamilyMember() {
      var haveSelected = _.some(vm.model.family_members, function (row) {
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
        for (var i = 0; i < vm.model.family_members.length; i++) {
          var row = vm.model.family_members[i];
          if (row.checked) {
            vm.model.family_members.splice(i, 1);
            i--;
          }
        }
      });
    }

    function checkElderlyFamilyMemberAll($event) {
      var rowCheckState = true;
      if ($event.target.tagName == "INPUT" && $event.target.type == "checkbox") {
        var $checkbox = angular.element($event.target);
        rowCheckState = $checkbox.prop('checked');
      }

      for (var i = 0; i < vm.model.family_members.length; i++) {
        vm.model.family_members[i].checked = rowCheckState;
      }
    }

    function refreshRoomOccupancyChangeHistory() {
      //vm.elderlyRoomOccupancyChangeHistoryRows = roomOccupancyChangeHistoryService.query({
      //    elderlyId: vm.model._id,
      //    tenantId: vm.model.tenantId
      //});
      //vm.elderlyRoomOccupancyChangeHistoryRows.$promise.then(function(rows) {
      //    console.log(rows);
      //});
      roomOccupancyChangeHistoryService.query({
        elderlyId: vm.model._id,
        tenantId: vm.model.tenantId
      }).$promise.then(function (rows) {
        vm.elderlyRoomOccupancyChangeHistoryRows = rows;
      });

    }

    function refreshJournalAccount() {
      vmh.psnService.elderlyInfo(vm.model._id, 'charge_items,subsidiary_ledger,journal_account').then(function (ret) {
        vm.model.charge_items = ret.charge_items;
        vm.model.subsidiary_ledger = ret.subsidiary_ledger;
        vm.model.journal_account = ret.journal_account;
        vm.subGrid['journal_account'].setData(vm.model.journal_account);
        vm.subGrid['journal_account'].query();
      });
    }

    function setOtherAndCustomized() {
      if (vm.selectedOtherAndCustomized.length > 0) {
        var keys = _.map(vm.selectedOtherAndCustomized, function (o) {
          return o.item_id;
        });

        var pairs = {};
        _.each(vm.selectedOtherAndCustomized, function (o) {
          pairs[o.item_id] = o.item_name;
        });

        //合并名称
        vmh.translate(keys).then(function (ret) {
          var vals = [];
          for (var v in ret) {
            if (ret[v] == v) {
              vals.push(pairs[v]);
            }
            else {
              vals.push(ret[v]);
            }
          }
          vm.other_and_customized = vals.join();
        });
      }
      else {
        vmh.translate(["label.NONE"]).then(function (ret) {
          vm.other_and_customized = ret['label.NONE'];
        });
      }

    }

    function submitApplicationToExit() {
      ngDialog.openConfirm({
        template: 'customConfirmDialog.html',
        className: 'ngdialog-theme-default',
        controller: ['$scope', function ($scopeConfirm) {
          $scopeConfirm.message = vm.viewTranslatePath('EXIT-CONFIRM-MESSAGE')
        }]
      }).then(function () {
        vmh.psnService.submitApplicationToExit(vm.model._id, {
          operated_by: vm.operated_by,
          operated_by_name: vm.operated_by_name
        }).then(function (ret) {
          vm.model.begin_exit_flow = ret.begin_exit_flow;
          vmh.alertSuccess();
        });
      });
    }

    function doSubmit() {
      if ($scope.theForm.$valid) {
        _.each(vm.model.family_members ,function(fm) {
          fm.received_alarm_D3016 = _.keys(_.pick(vm.fm_received_alarm_D3016[fm._id || fm.name+'$'+fm.id_no], function(v){ return v}))
        });
        // console.log('save family_members:', vm.model.family_members);
        // return;
        vmh.fetch(enterService.query({elderlyId: vm.model._id})).then(function (ret) {
          var enterModel = ret[0];
          enterModel.elderly_summary = vm.model.name;
          vmh.fetch(enterService.update(enterModel._id, enterModel)).then(function (ret) {
            vm.save();
          })
        });
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

    function changeBoard() {

      ngDialog.open({
        template: 'change-elderly-board-info.html',
        controller: 'DialogChangeElderlyBoardInfoController',
        data: {
          vmh: vmh,
          viewTranslatePathRoot: vm.viewTranslatePath(),
          titleTranslatePath: vm.viewTranslatePath('TAB1-BOARD-INFO'),
          _subsystem_: vm._subsystem_,
          tenantId: vm.model.tenantId,
          elderlyId: vm.model._id,
          charge_item_catalog_id: PENSION_AGENCY_CHARGE_ITEM.BOARD + '-' + vm.model.charge_standard,
          selectedItem: vm.selectedBoard
        }
      }).closePromise.then(function (ret) {
        if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
          console.log(ret.value);
          vm.selectedBoard = ret.value;
          vm.model.board_summary = vm.selectedBoard.item_name;
          vm.refreshJournalAccount();
        }
      });
    }

    function changeRoom() {
      ngDialog.open({
        template: 'change-elderly-room-info.html',
        controller: 'DialogChangeElderlyRoomInfoController',
        className: 'ngdialog-theme-default ngdialog-change-elderly-room-info',
        data: {
          vmh: vmh,
          viewTranslatePathRoot: vm.viewTranslatePath(),
          titleTranslatePath: vm.viewTranslatePath('TAB1-ROOM-INFO'),
          _subsystem_: vm._subsystem_,
          tenantId: vm.model.tenantId,
          elderlyId: vm.model._id,
          charge_item_catalog_id: PENSION_AGENCY_CHARGE_ITEM.ROOM + '-' + vm.model.charge_standard,
          selectedItem: vm.selectedRoom,
          selectedRoomInfo: vm.selectedRoomInfo
        }
      }).closePromise.then(function (ret) {
        console.log(ret);
        if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
          vm.selectedRoom = ret.value.room_charge_item;
          vm.selectedRoomInfo = ret.value.room_info;
          vm.model.room_summary = ret.value.room_summary;
          vm.refreshJournalAccount();
          vm.refreshRoomOccupancyChangeHistory();
        }
      });
    }

    function changeOtherAndCustomized() {
      ngDialog.open({
        template: 'change-elderly-charge-item-for-other-and-customized.html',
        controller: 'DialogChangeElderlyChargeItemForOtherAndCustomizedController',
        className: 'ngdialog-theme-default ngdialog-change-elderly-charge-item-for-other-and-customized',
        data: {
          vmh: vmh,
          viewTranslatePathRoot: vm.viewTranslatePath(),
          titleTranslatePath: vm.viewTranslatePath('TAB1-OTHER-AND-CUSTOMIZED-INFO'),
          _subsystem_: vm._subsystem_,
          tenantId: vm.model.tenantId,
          elderlyId: vm.model._id,
          charge_item_catalog_id: PENSION_AGENCY_CHARGE_ITEM.OTHER + '-' + vm.model.charge_standard
        }
      }).closePromise.then(function (ret) {
        console.log(ret);
        if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {

          vm.selectedOtherAndCustomized = ret.value.otherAndCustomized;
          setOtherAndCustomized();
          vm.refreshJournalAccount();
        }
      });
    }
  }

  InConfigController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function InConfigController($scope, ngDialog, vmh, vm) {
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

  InQRCodeController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function InQRCodeController($scope, ngDialog, vmh, vm) {
    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;


    init();

    function init() {

      vm.init({removeDialog: ngDialog});
      vm.tab1 = {cid: 'contentTab1'};
      vm.embededElderlyAvatarFlag = true;

      vm.buildQR = buildQR;

      vm.load().then(function () {
        buildQR();
      });
    }

    function buildQR() {
      var defaultEI = 'https://wx.qlogo.cn/mmhead/Q3auHgzwzM4bMub0HlUQejcYdLia8LORibXLl4vyot9SoLxNATehqUEQ/0';
      vm.paste_in_bed = 'http://tools.okertrip.com/qr/?text={"tenantId":"' + vm.model.tenantId + '","roomId":"' + vm.model.room_value.roomId + '","bed_no":' + vm.model.room_value.bed_no + ',"name":"' + encodeURIComponent(vm.model.room_summary) + '"}&ei=' + defaultEI;
      var ei_paste_in_pill_box = vm.embededElderlyAvatarFlag ? vm.model.avatar || defaultEI : null;
      vm.paste_in_pill_box_qrcode = 'http://tools.okertrip.com/qr/?text={"tenantId":"' + vm.model.tenantId + '","elderlyId":"' + vm.model.id + '","name":"' + encodeURIComponent(vm.model.name) + '","avatar":"' + vm.model.avatar + '"}';
      if (ei_paste_in_pill_box) {
        vm.paste_in_pill_box_qrcode += '&ei=' + ei_paste_in_pill_box;
      }
    }
  }

  DialogChangeElderlyBoardInfoController.$inject = ['$scope', 'ngDialog', 'PENSION_AGENCY_DEFAULT_CHARGE_STANDARD'];

  function DialogChangeElderlyBoardInfoController($scope, ngDialog, PENSION_AGENCY_DEFAULT_CHARGE_STANDARD) {

    var vm = $scope.vm = {selectBinding: {}};
    var vmh = $scope.ngDialogData.vmh;

    $scope.utils = vmh.utils.v;

    init();

    function init() {
      vm.viewTranslatePathRoot = $scope.ngDialogData.viewTranslatePathRoot;
      vm.viewTranslatePath = function (key) {
        return vm.viewTranslatePathRoot + '.' + key;
      };
      vm.title = $scope.ngDialogData.titleTranslatePath;
      vm._subsystem_ = $scope.ngDialogData._subsystem_;
      vm.tenantId = $scope.ngDialogData.tenantId;
      vm.elderlyId = $scope.ngDialogData.elderlyId;
      vm.charge_item_catalog_id = $scope.ngDialogData.charge_item_catalog_id;
      vm.charge_item_id = $scope.ngDialogData.selectedItem.item_id;
      vm.selected_charge_item = $scope.ngDialogData.selectedItem;


      vm.setChargeItem = setChargeItem;
      vm.doSubmit = doSubmit;

      vmh.parallel([
        vmh.extensionService.tenantInfo(vm.tenantId, 'charge_standards'),
        vmh.clientData.getJson('charge-standards-pension-agency')
      ]).then(function (results) {

        var charge_standard_standand = results[1][0], charge_items; //charge_standard_standand硬编码
        vm.selectedStandard = _.find(results[0].charge_standards, function (o) {
            return o.subsystem == vm._subsystem_;
          }) || {};
        if (vm.selectedStandard.charge_items) {
          charge_items = vm.selectedStandard.charge_items;
          //将预订义收费标准模板替换为当前租户的收费标准
          _.each(charge_standard_standand.children, function (item) {
            item.children = _.chain(item.children).map(function (o) {
              var theChargeItem = _.findWhere(charge_items, {item_id: o._id});
              if (o.data) {
                theChargeItem = _.defaults(theChargeItem, {data: o.data});
              }
              return theChargeItem;
            }).compact().value();
          });
        }
        console.log('老人收费项目分类: ', vm.charge_item_catalog_id);
        //老人收费项目分类
        var elderly_charge_item_catalog = _.findWhere(charge_standard_standand.children, {_id: vm.charge_item_catalog_id});
        if (elderly_charge_item_catalog) {
          vm.selectBinding.elderly_charge_items = elderly_charge_item_catalog.children;
        }

      });
    }

    function setChargeItem(charge_item) {
      vm.new_charge_item = charge_item;
    }

    function doSubmit() {
      vm.authMsg = null;
      if ($scope.theForm.$valid) {
        if ($scope.ngDialogData.selectedItem.item_id != vm.charge_item_id) {
          var promise = ngDialog.openConfirm({
            template: 'normalConfirmDialog.html',
            className: 'ngdialog-theme-default'
          }).then(function () {

            vmh.extensionService.changeElderlyChargeItem(vm.tenantId, vm.elderlyId, vm.charge_item_catalog_id, vm.selected_charge_item.item_id, vm.new_charge_item).then(function () {
              //修改elderly.charge_items中饮食套餐的收费项及饮食套餐描述
              console.log('invoked changeElderlyChargeItem');
              $scope.closeThisDialog(vm.new_charge_item);
            }, function (err) {
              vm.authMsg = err;
            });
          });
        }
        else {
          console.log('NO-CHANGE');

          return vmh.translate('notification.NO-CHANGE').then(function (ret) {
            vm.authMsg = ret;
          });
        }
      }
    }
  }

  DialogChangeElderlyRoomInfoController.$inject = ['$scope', 'ngDialog'];

  function DialogChangeElderlyRoomInfoController($scope, ngDialog) {

    var vm = $scope.vm = {selectBinding: {}};
    var vmh = $scope.ngDialogData.vmh;

    $scope.utils = vmh.utils.v;

    init();

    function init() {
      vm.viewTranslatePathRoot = $scope.ngDialogData.viewTranslatePathRoot;
      vm.viewTranslatePath = function (key) {
        return vm.viewTranslatePathRoot + '.' + key;
      };
      vm.title = $scope.ngDialogData.titleTranslatePath;
      vm._subsystem_ = $scope.ngDialogData._subsystem_;
      vm.tenantId = $scope.ngDialogData.tenantId;
      vm.elderlyId = $scope.ngDialogData.elderlyId;
      vm.charge_item_catalog_id = $scope.ngDialogData.charge_item_catalog_id;
      vm.selected_charge_item = $scope.ngDialogData.selectedItem;
      vm.room_info = angular.copy($scope.ngDialogData.selectedRoomInfo);


      vm.isDisabled = isDisabled;
      vm.getOccupyElderlyName = getOccupyElderlyName;
      vm.doSubmit = doSubmit;

      vmh.parallel([
        vmh.extensionService.tenantInfo(vm.tenantId, 'charge_standards'),
        vmh.clientData.getJson('charge-standards-pension-agency'),
        vmh.shareService.tmp('T3003', 'name', {
          tenantId: vm.tenantId,
          floorSuffix: 'F',
          bedNoSuffix: '#床'
        }),
        vmh.psnService.roomStatusInfo(vm.tenantId)
      ]).then(function (results) {
        var charge_standard_standand = results[1][0], charge_items; //charge_standard_standand硬编码
        vm.selectedStandard = _.find(results[0].charge_standards, function (o) {
            return o.subsystem == vm._subsystem_;
          }) || {};
        if (vm.selectedStandard.charge_items) {
          charge_items = vm.selectedStandard.charge_items;
          //将预订义收费标准模板替换为当前租户的收费标准
          _.each(charge_standard_standand.children, function (item) {
            item.children = _.chain(item.children).map(function (o) {
              var theChargeItem = _.findWhere(charge_items, {item_id: o._id});
              if (o.data) {
                theChargeItem = _.defaults(theChargeItem, {data: o.data});
              }
              return theChargeItem;
            }).compact().value();
          });
        }

        //老人收费项目分类
        console.log('老人收费项目分类: ', vm.charge_item_catalog_id);
        var elderly_charge_item_catalog = _.findWhere(charge_standard_standand.children, {_id: vm.charge_item_catalog_id});
        if (elderly_charge_item_catalog) {
          vm.elderly_charge_items = elderly_charge_item_catalog.children;
        }

        vm.treeData = results[2];
        vm.roomStatusInfo = {};
        _.each(results[3], function (roomStatus) {
          _.each(roomStatus.occupied, function (occupy) {
            if (occupy.elderlyId) {
              vm.roomStatusInfo[roomStatus.roomId + '$' + occupy.bed_no] = {
                elderly_name: occupy.elderlyId.name,
                bed_status: occupy.bed_status
              };
            }
          });
        });

      });

      $scope.$on('tree:node:select', function ($event, node, treeObject) {
        if (node.capacity) {
          var arrIndex = node.attrs.index.split(treeObject.levelSplitChar);
          var data = treeObject.treeData;
          vm.room_summary = '';
          for (var i = 0; i < arrIndex.length; i++) {
            var currentNode = data[arrIndex[i]];
            if (currentNode) {
              vm.room_summary += currentNode.name;
              if (currentNode.children) {
                vm.room_summary += treeObject.levelSplitChar;
                data = currentNode.children;
              }
            }
          }

          vm.roomCapacity = node.capacity;//房间类型选择
          for (var i = 0; i < vm.elderly_charge_items.length; i++) {
            var charge_item = vm.elderly_charge_items[i];
            var selected = false;
            //房间类型
            if (angular.isArray(charge_item.data.capacity)) {
              selected = _.contains(_.range(charge_item.data.capacity[0], charge_item.data.capacity[1]), vm.roomCapacity);
            }
            else {
              selected = charge_item.data.capacity == vm.roomCapacity;
            }

            if (selected) {
              vm.new_charge_item = charge_item;
              break;
            }
          }

        }
      });
    }

    function isDisabled(node) {
      var key = node._id.split('$').slice(1).join('$');
      var bed_status = vm.roomStatusInfo[key] && vm.roomStatusInfo[key].bed_status;
      if (!bed_status)
        bed_status = 'A0001';//空闲
      return bed_status != 'A0001';
    }

    function getOccupyElderlyName(node) {
      var key = node._id.split('$').slice(1).join('$');
      var elderlyName = vm.roomStatusInfo[key] && vm.roomStatusInfo[key].elderly_name;
      return elderlyName;
    }


    function doSubmit() {
      vm.authMsg = null;
      if ($scope.theForm.$valid) {


        if ($scope.ngDialogData.selectedRoomInfo != vm.room_info) {

          var promise = ngDialog.openConfirm({
            template: 'normalConfirmDialog.html',
            className: 'ngdialog-theme-default'
          }).then(function () {

            var arrRoomInfo = vm.room_info.split('$');

            vmh.psnService.changeElderlyRoomBed(vm.tenantId, vm.elderlyId, arrRoomInfo[1], arrRoomInfo[2]).then(function () {
              console.log('invoked changeElderlyRoomBed');
              return vmh.psnService.changeElderlyChargeItem(vm.tenantId, vm.elderlyId, vm.charge_item_catalog_id, vm.selected_charge_item.item_id, vm.new_charge_item).then(function () {
                console.log('invoked changeElderlyChargeItem');
              }).catch(function (err) {
                vm.authMsg = err;
                vmh.notify.alert('<div class="text-center"><em class="fa fa-warning"></em> ' + err + '</div>', 'warning');
              });
            }).then(function () {
              $scope.closeThisDialog({
                room_charge_item: vm.new_charge_item,
                room_info: vm.room_info,
                room_summary: vm.room_summary
              });
            }).catch(function (err) {
              vm.authMsg = err;
            });

          });


        }
        else {
          console.log('NO-CHANGE');
          return vmh.translate('notification.NO-CHANGE').then(function (ret) {
            vm.authMsg = ret;
          });
        }
      }
    }
  }

  DialogChangeElderlyChargeItemForOtherAndCustomizedController.$inject = ['$scope', 'ngDialog', 'PENSION_AGENCY_DEFAULT_CHARGE_STANDARD'];

  function DialogChangeElderlyChargeItemForOtherAndCustomizedController($scope, ngDialog, PENSION_AGENCY_DEFAULT_CHARGE_STANDARD) {

    var vm = $scope.vm = {selectBinding: {}};
    var vmh = $scope.ngDialogData.vmh;

    $scope.utils = vmh.utils.v;

    init();

    function init() {
      vm.viewTranslatePathRoot = $scope.ngDialogData.viewTranslatePathRoot;
      vm.viewTranslatePath = function (key) {
        return vm.viewTranslatePathRoot + '.' + key;
      };
      vm.title = $scope.ngDialogData.titleTranslatePath;
      vm._subsystem_ = $scope.ngDialogData._subsystem_;
      vm.tenantId = $scope.ngDialogData.tenantId;
      vm.elderlyId = $scope.ngDialogData.elderlyId;
      vm.charge_item_catalog_id = $scope.ngDialogData.charge_item_catalog_id;//other

      vm.isChanged = isChanged;
      vm.sumPeriodPrice = sumPeriodPrice;
      vm.isSelected = isSelected;
      vm.doSubmit = doSubmit;

      vmh.parallel([
        vmh.psnService.elderlyInfo(vm.elderlyId, 'charge_standard,charge_items'),
        vmh.extensionService.tenantInfo(vm.tenantId, 'charge_standards'),
        vmh.clientData.getJson('charge-standards-pension-agency'),
        vmh.extensionService.tenantChargeItemCustomizedAsTree(vm.tenantId, PENSION_AGENCY_DEFAULT_CHARGE_STANDARD, vm._subsystem_),
        vmh.shareService.d('D1015')
      ]).then(function (results) {
        var charge_items_of_elderly = results[0].charge_items;
        var tenantSelectedStandard = _.find(results[1].charge_standards, function (o) {
            return o.subsystem == vm._subsystem_;
          }) || {};
        var charge_items_of_tenant = tenantSelectedStandard.charge_items;
        var charge_standard_standand = results[2][0]; //charge_standard_standand硬编码
        if (charge_standard_standand) {
          //将预订义收费标准模板替换为当前租户的收费标准
          var selectedChargeItemCatalogs = _.where(charge_standard_standand.children, {_id: vm.charge_item_catalog_id});
          //增加特色服务
          if (results[3].children.length > 0) {
            selectedChargeItemCatalogs.push(results[3]);
          }
          var selectionOfManualSelectable = {};
          var rawSumedPeriodPrice = 0;
          _.each(selectedChargeItemCatalogs, function (item) {
            item.children = _.chain(item.children).map(function (o) {
              var theChargeItem = _.findWhere(charge_items_of_elderly, {item_id: o._id});
              var selected = true;
              if (!theChargeItem) {
                theChargeItem = _.findWhere(charge_items_of_tenant, {item_id: o._id});
                selected = false;
              }
              if (o.data) {
                theChargeItem = _.defaults(theChargeItem, {data: o.data});
              }


              if (theChargeItem.data.manual_seletable) {
                selectionOfManualSelectable[theChargeItem.item_id] = selected;
              }

              if (selected) {
                rawSumedPeriodPrice += theChargeItem.period_price;
              }

              return theChargeItem;
            }).compact().value();

          });


          vm.selectedChargeItemCatalogs = selectedChargeItemCatalogs;
          vm.selectionOfManualSelectable = selectionOfManualSelectable;
          vm.rawSumedPeriodPrice = rawSumedPeriodPrice;

          vm.raw_selectionOfManualSelectable = _.extend({}, selectionOfManualSelectable);

          vm.period_map = {};
          _.each(results[4], function (o) {
            vm.period_map[o.value] = o.name;
          });
        }
      });

      vm.selected_charge_item_object = {};
      vm.selectedChargeItem = {};
    }

    function isChanged() {
      var notChanged = true;
      for (var key in vm.selectionOfManualSelectable) {
        notChanged = notChanged && (vm.selectionOfManualSelectable[key] == vm.raw_selectionOfManualSelectable[key]);
      }
      return !notChanged;
    }

    function sumPeriodPrice() {
      var totals = 0;
      for (var item_id in vm.selectedChargeItem) {
        totals += vm.selectedChargeItem[item_id];
      }
      return totals;
    }

    function isSelected(charge_item) {
      var selected = vm.selectionOfManualSelectable[charge_item.item_id];
      if (selected) {
        vm.selectedChargeItem[charge_item.item_id] = charge_item.period_price;
        vm.selected_charge_item_object[charge_item.item_id] = charge_item;
      }
      else {
        delete vm.selectedChargeItem[charge_item.item_id];
        delete vm.selected_charge_item_object[charge_item.item_id];
      }
      return selected;
    }

    function doSubmit() {
      vm.authMsg = null;
      if ($scope.theForm.$valid) {
        if (isChanged()) {
          var promise = ngDialog.openConfirm({
            template: 'normalConfirmDialog.html',
            className: 'ngdialog-theme-default'
          }).then(function () {

            //var selectedOtherAndCustomized = _.values(vm.selected_charge_item_object);
            //$scope.closeThisDialog({otherAndCustomized:selectedOtherAndCustomized});

            vmh.psnService.changeElderlyChargeItemForOtherAndCustomized(
              vm.tenantId,
              vm.elderlyId,
              vm.charge_item_catalog_id,
              _.keys(vm.selected_charge_item_object)
            ).then(function () {
              console.log('invoked changeElderlyChargeItemForOtherAndCustomized');
              $scope.closeThisDialog({otherAndCustomized: _.values(vm.selected_charge_item_object)});
            }, function (err) {
              vm.authMsg = err;
            });
          });
        }
        else {
          console.log('NO-CHANGE');

          return vmh.translate('notification.NO-CHANGE').then(function (ret) {
            vm.authMsg = ret;
          });
        }
      }
    }
  }

})();