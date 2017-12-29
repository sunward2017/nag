/**
 * Created by hcl on 17-12-26.
 */
(function() {
  'use strict';

  angular
      .module('subsystem.pension-agency')
      .controller('EvaluationTemplateLocalGridController', EvaluationTemplateLocalGridController)
      .controller('EvaluationTemplateLocalDetailsController', EvaluationTemplateLocalDetailsController)
      .controller('topicItemChooseController',topicItemChooseController)
      .controller('topicItemSortController',topicItemSortController)
      .controller('importEvaluationTemplateController',importEvaluationTemplateController)
      .filter('topicsArrayMemberFilter',topicsArrayMemberFilter)
  ;


  EvaluationTemplateLocalGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function EvaluationTemplateLocalGridController($scope, ngDialog, vmh, vm) {

    $scope.vm = vm;
    $scope.utils = vmh.utils.g;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});
      vm.query();
    }


  }

  EvaluationTemplateLocalDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function EvaluationTemplateLocalDetailsController($scope, ngDialog, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;

    init();

    function init() {

      vm.init({removeDialog: ngDialog});
      vm.doSubmit = doSubmit;
      vm.tab1 = {cid: 'contentTab1'};
      vm.addSectionMember = addSectionMember;
      vm.removeSectionMember = removeSectionMember;
      vm.editSectionMember = editSectionMember;
      vm.saveSectionMember = saveSectionMember;
      vm.cancelSectionMember = cancelSectionMember;
      vm.sortTopicItem = sortTopicItem;
      vm.chooseTopicItem = chooseTopicItem;
      vm.importTemplate = importTemplate;

      vm.load();
    }
    
    function importTemplate() {
      vmh.fetch(vm.modelNode.services['pub-evaluationTemplate'].query({status:1,stop_flag:false,tenantId:{$in: [null, undefined,vm.tenantId]}}, 'name sections tenantId')).then(function (ret) {
        ngDialog.open({
          template: 'topic-item-sort.html',
          controller: 'importEvaluationTemplateController',
          className: 'ngdialog-theme-default ngdialog-backfiller-default-picker ngdialog-meal-weekly-menu-picker',
          data: {
            vmh: vmh,
            moduleTranslatePathRoot: vm.viewTranslatePath(),
            templates: ret
          }
        }).closePromise.then(function (ret) {
          console.log('importTemplate ret:', ret);
          if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
            vm.model.name=ret.value.name;
            if(ret.value.remoteTemp){//从远程模板导入
              vm.hasRemoteTopics=ret.value.sections;
              _.each(ret.value.sections,function (o) {
                o.remote = true;//标记此section是从远程拷贝
              });
            }
            vm.model.sections=ret.value.sections;
            console.log('vm.model.sections:',vm.model.sections);
          }
        });
      });
    }

    function addSectionMember() {
      if (!vm.$gridEditingOfSectionMember) {
        if(!vm.model.sections){
          vm.model.sections=[];
        }
        vm.model.sections.push({isNew: true,$editing: true});
        vm.$gridEditingOfSectionMember = true;
      }
    }

    function removeSectionMember() {
      var haveSelected = _.some(vm.model.sections, function (row) {
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
        var selected = [];
        for (var i = 0; i < vm.model.sections.length; i++) {
          var row = vm.model.sections[i];
          if (row.checked) {
            vm.model.sections.splice(i, 1);
            selected.push(row);
            i--;
          }
        }
        var selectedRemote = _.filter(selected,function (row) {
          return row.remote;
        });
        if(selectedRemote.length>0){//存在从远程拷贝的section
          _.each(selectedRemote,function (selected) {
            var idx = _.findIndex(vm.hasRemoteTopics,function (o) {
              return selected._id == o._id;
            });
            vm.hasRemoteTopics.splice(idx,1);
          });
        }
      });
    }

    function editSectionMember(row) {
      vm.editingRow = angular.copy(row);
      row.$editing = true;
      vm.$gridEditingOfSectionMember = true;
    }

    function saveSectionMember(row) {
      if(!row.title || !row.rank){
        if(!row.rank){
          row.rankFlag = true;
        }
        if(!row.title){
          row.titleFlag =true;
        }
        return;
      }else {
        row.rankFlag = undefined;
        row.titleFlag = undefined;
      }
      if (row.isNew) {
        row.isNew = false;
      }
      else {
        vm.editingRow = null;
      }
      row.$editing = false;
      vm.$gridEditingOfSectionMember = false;
    }

    function cancelSectionMember(row) {
      if (row.isNew) {
        vm.model.sections.splice(vm.model.sections.length - 1, 1);
      } else {
        _.extend(row, vm.editingRow);
      }
      row.$editing = false;
      vm.$gridEditingOfSectionMember = false;
    }

    function sortTopicItem(row) {
      var rowTopics = row.topics;
      console.log('sort rowTopics---:',rowTopics);
      var sortedTopicIds = _.map(rowTopics,function (o) {
        return o.topicId
      });
      console.log('sortedTopicIds :',sortedTopicIds );
      vmh.fetch(vm.modelNode.services['pub-evaluationItem'].query({status:1,stop_flag:false,_id:{$in:sortedTopicIds}}, '_id name type')).then(function (ret) {
        _.each(rowTopics,function (o) {
          var idx = _.findIndex(ret,function (r) {
            return o.topicId == r._id
          });
          o['topic'] = ret[idx];
        });
        ngDialog.open({
          template: 'topic-item-sort.html',
          controller: 'topicItemSortController',
          className: 'ngdialog-theme-default ngdialog-meal-weekly-menu-picker',
          data: {
            vmh: vmh,
            moduleTranslatePathRoot: vm.viewTranslatePath(),
            sortedTopics: angular.copy(rowTopics)
          }
        }).closePromise.then(function (ret) {
          console.log('close sort Promise ret:',ret);
          if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
            row.topics = ret.value.ret;
            if(row.remote&& ret.value.rm  &&ret.value.rm.length>0){
              var idx = _.findIndex(vm.hasRemoteTopics,function (o) {
                return o._id == row._id;
              });
              console.log('vm.hasRemoteTopics[idx]:',vm.hasRemoteTopics[idx]);
              _.each(ret.value.rm,function (o) {
                var i = _.findIndex(vm.hasRemoteTopics[idx].topics,function (ele) {
                  return ele.topicId==o.topicId
                });
                vm.hasRemoteTopics[idx].topics.splice(i,1);
              });
            }
          }
        });
      });
    }

    function chooseTopicItem(row) {
      console.log('choose item`````row:',row);
      vmh.parallel([vm.modelNode.services['pub-evaluationItem'].query({status:1,stop_flag:false,tenantId:{$in: [null, undefined]}}, 'name type'),
        vm.modelNode.services['pub-evaluationItem'].query({status:1,stop_flag:false,tenantId:vm.tenantId}, 'name type')]).then(function (ret) {
        console.log('ret:',ret);
        ngDialog.open({
          template: 'topic-item-choose.html',
          controller: 'topicItemChooseController',
          className: 'ngdialog-theme-default ngdialog-backfiller-default-picker ngdialog-meal-weekly-menu-picker',
          data: {
            vmh: vmh,
            moduleTranslatePathRoot: vm.viewTranslatePath(),
            topicData:ret[0],
            topicLocalData:ret[1],
            rowData:row
          }
        }).closePromise.then(function (ret) {
          console.log('closePromise ret:',ret);
          if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
            row.topics =[];
            _.each(ret.value.ret,function (o,idx) {
              row.topics.push({topicId:o._id,order:idx+1});
            });
            console.log('row.topics:',row.topics);
            if(row.remote){
              var idx = _.findIndex(vm.hasRemoteTopics,function (o) {
                return o._id == row._id;
              });
              // console.log('vm.hasRemoteTopics[idx]:',vm.hasRemoteTopics[idx]);
              var remoteRet = _.map(ret.value.remoteRet,function (o) {
                return {topicId:o._id}
              });
              // console.log('remoteRet:',remoteRet);
              vm.hasRemoteTopics[idx].topics=remoteRet;
            }
          }
        });
      });
    }

    function doSubmit() {
      if ($scope.theForm.$valid) {
        console.log('vm.model:', vm.model);
        if(vm.hasRemoteTopics && vm.hasRemoteTopics.length>0){
          console.log('vm.hasRemoteTopics:',vm.hasRemoteTopics);
          vmh.psnService.copyRemoteTempTopics(vm.tenantId,vm.hasRemoteTopics).then(function (ret) {
            //修改section中topics的topicId为指向本地题库_id
            // vm.save();
          });
        }else {
          vm.save();
        }
      } else {
        if ($scope.utils.vtab(vm.tab1.cid)) {
          vm.tab1.active = true;
        }
      }
    }
  }

  topicItemChooseController.$inject = ['$scope', 'ngDialog'];
  function topicItemChooseController($scope,ngDialog) {
    var vm = $scope.vm = {};
    var vmh = $scope.ngDialogData.vmh;
    $scope.utils = vmh.utils.g;
    init();

    function init() {
      vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
      vm.viewTranslatePath = function (key) {
        return vm.moduleTranslatePathRoot + '.' + key;
      };
      vm.topics = $scope.ngDialogData.topicData;
      vm.filterTopics=vm.topics;
      vm.topicsLocal = $scope.ngDialogData.topicLocalData;
      vm.filterLocalTopics=vm.topicsLocal;
      vm.selectedTopics = $scope.ngDialogData.rowData.topics;
      _.each(vm.selectedTopics,function (o) {
        var index = _.findIndex(vm.topics,function (topic) {
          return topic._id == o.topicId;
        });
        var idx = _.findIndex(vm.topicsLocal,function (topic) {
          return topic._id == o.topicId;
        });
        if(index!=-1){
          vm.topics[index].checked = true;
        }else if(idx!=-1){
          vm.topicsLocal[idx].checked = true;
        }
      });
      vm.doSubmit = doSubmit;
      vm.search = search;
      vm.selectAll = selectAll;
      vm.selectAllLocal = selectAllLocal;
    }

    function search(keyword) {
      console.log('keyword:',keyword);
      if(keyword){
        var reg = new RegExp(keyword);
        var fNodes= _.filter(vm.topics,function (o) {
          return o.name.match(reg)
        });//浅复制，过滤后数组的变化会反应到原始数组的变化
        var fNodesLocal= _.filter(vm.topicsLocal,function (o) {
          return o.name.match(reg)
        });
        vm.filterTopics=fNodes;
        vm.filterLocalTopics=fNodesLocal;
      }else {
        vm.filterTopics=vm.topics;
        vm.filterLocalTopics =vm.topicsLocal;
      }
      console.log('vm.topics:',vm.topics);
    }

    function selectAll() {
      for (var i = 0, len = vm.topics.length; i < len; i++) {
        vm.topics[i].checked = vm.all;
      }
    }

    function selectAllLocal() {
      for (var i = 0, len = vm.topicsLocal.length; i < len; i++) {
        vm.topicsLocal[i].checked = vm.allLocal;
      }
    }

    function selectedTopics() {
      var selected=  _.filter(vm.topics, function (o) {
        return o.checked;
      });
      var selectedLocal =  _.filter(vm.topicsLocal, function (o) {
        return o.checked;
      });
      vm.selectedTopics = selected.concat(selectedLocal);
      return selected;
    }

    function doSubmit() {
      var remote=selectedTopics();
      if (vm.selectedTopics.length == 0) {
        vmh.alertWarning('notification.SELECT-NONE-WARNING', true);
        return;
      }
      $scope.closeThisDialog({ret:vm.selectedTopics,remoteRet:remote});
    }
  }

  topicItemSortController.$inject = ['$scope', 'ngDialog'];
  function topicItemSortController($scope,ngDialog) {
    var vm = $scope.vm = {};
    var vmh = $scope.ngDialogData.vmh;
    $scope.utils = vmh.utils.g;
    init();

    function init() {
      vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
      vm.viewTranslatePath = function (key) {
        return vm.moduleTranslatePathRoot + '.' + key;
      };
      vm.sortedTopics = $scope.ngDialogData.sortedTopics;
      console.log('vm.sortedTopics:',vm.sortedTopics);


      vm.doSubmit = doSubmit;
      vm.removeTopic = removeTopic;
    }

    function removeTopic(index) {
      console.log('$index', index);
      var rm=vm.sortedTopics.splice(index, 1);
      if(!vm.rmTopics){
        vm.rmTopics = [];
      }
      vm.rmTopics.push(rm);
    }

    function doSubmit() {
      if ($scope.theForm.$valid) {
        console.log('vm.rmTopics:',vm.rmTopics);
        $scope.closeThisDialog({ret:vm.sortedTopics,rm:vm.rmTopics});
      }
    }
  }

  importEvaluationTemplateController.$inject = ['$scope', 'ngDialog'];
  function importEvaluationTemplateController($scope,ngDialog) {
    var vm = $scope.vm = {};
    var vmh = $scope.ngDialogData.vmh;
    $scope.utils = vmh.utils.g;
    init();

    function init() {
      vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
      vm.viewTranslatePath = function (key) {
        return vm.moduleTranslatePathRoot + '.' + key;
      };
      vm.templates = $scope.ngDialogData.templates;
      vm.$template = true;
      vm.isLocalTemplate = true;
      vm.sortedTopics =vm.localTemps= getNeededTemplate();

      vm.select = select;
      vm.search = search;
      vm.showLocalTemplate = showLocalTemplate;
      vm.showRemoteTemplate = showRemoteTemplate;
    }

    function search(keyword) {
      console.log('keyword:',keyword);
      if(keyword){
        var reg = new RegExp(keyword);
        if(vm.isLocalTemplate){
          vm.sortedTopics=_.filter(vm.localTemps,function (o) {
            return o.name.match(reg)
          });
        }else{
          vm.sortedTopics=_.filter(vm.remoteTemps,function (o) {
            return o.name.match(reg)
          });
        }
      }else {
        if(vm.isLocalTemplate){
          vm.sortedTopics=vm.localTemps;
        }else{
          vm.sortedTopics=vm.remoteTemps;
        }
      }
    }
    function showLocalTemplate() {
      vm.isLocalTemplate = true;
      vm.sortedTopics = vm.localTemps;
    }
    function showRemoteTemplate() {
      vm.isLocalTemplate = false;
      if(!vm.remoteTemps){
        vm.remoteTemps = getNeededTemplate();
      }
      vm.sortedTopics=vm.remoteTemps;
    }
    function getNeededTemplate() {
      if(vm.isLocalTemplate){
        return _.filter(vm.templates ,function (o) {
          return o.tenantId;
        });
      }else {
        return _.filter(vm.templates ,function (o) {
          return !o.tenantId;
        });
      }
    }
    
    function select(row) {
      if(!vm.isLocalTemplate){
        row.remoteTemp = true;
      }
      console.log('select...row:',row);
      $scope.closeThisDialog(row);
    }
  }





  function topicsArrayMemberFilter() {
    return topicsArrayMember;
  }
  function topicsArrayMember(cellObject, key) {
    if (!cellObject || !angular.isArray(cellObject) || cellObject.length === 0)
      return '';
    return cellObject.map(function (o) {
      return o[key].slice(0,6);
    }).join()
  }

})();