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
              vm.hasRemoteTopics=angular.copy(ret.value.sections);//存放远程导入的section
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
        if(selectedRemote.length>0){//存在从远程拷贝topic的section
          _.each(selectedRemote,function (selected) {
            var idx = _.findIndex(vm.hasRemoteTopics,function (o) {
              return selected._id == o._id;
            });
            if(idx!=-1){
              vm.hasRemoteTopics.splice(idx,1);
            }
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
      // console.log('sortedTopicIds :',sortedTopicIds );
      // console.log('vm.hasRemoteTopics:',vm.hasRemoteTopics);
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
              if(row._id){
                var idx = _.findIndex(vm.hasRemoteTopics,function (o) {
                  return o._id == row._id;
                });
                console.log('vm.hasRemoteTopics[idx]:',vm.hasRemoteTopics[idx]);
                _.each(ret.value.rm,function (o) {
                  var i = _.findIndex(vm.hasRemoteTopics[idx].topics,function (ele) {
                    return ele.topicId==o.topicId
                  });
                  console.log('i:',i);
                  if(i!=-1){
                    vm.hasRemoteTopics[idx].topics.splice(i,1);
                  }
                });
              }else {//row._id不存在
                _.each(ret.value.rm,function (o) {
                  var i = _.findIndex(row.newRemote,function (ele) {
                    return ele.topicId==o.topicId
                  });
                  if(i!=-1){
                    row.newRemote.splice(i,1);
                  }
                });
              }
              console.log('row:',row);
            }
          }
        });
      });
    }

    function chooseTopicItem(row) {
      console.log('choose item`````row:',row);
      var selectedTopicIds = _.map(row.topics,function (o) {
        return o.topicId
      });
      vmh.parallel([vm.modelNode.services['pub-evaluationItem'].query({status:1,stop_flag:false,tenantId:{$in: [null, undefined]},_id:{$nin:selectedTopicIds}}, 'name type tenantId'),
        vm.modelNode.services['pub-evaluationItem'].query({status:1,stop_flag:false,tenantId:vm.tenantId,_id:{$nin:selectedTopicIds}}, 'name type tenantId')]).then(function (ret) {
        ngDialog.open({
          template: 'topic-item-choose.html',
          controller: 'topicItemChooseController',
          className: 'ngdialog-theme-default ngdialog-backfiller-default-picker ngdialog-meal-weekly-menu-picker',
          data: {
            vmh: vmh,
            tenantId : vm.tenantId,
            moduleTranslatePathRoot: vm.viewTranslatePath(),
            selectedTopicIds:selectedTopicIds,
            remoteTopics:ret[0],
            localTopics:ret[1]
          }
        }).closePromise.then(function (ret) {
          console.log('closePromise ret:',ret);
          if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
            if(!row.topics){
              row.topics =[];
            }
            var len = row.topics.length;
            _.each(ret.value,function (o,idx) {
              row.topics.push({topicId:o._id,order:len+idx+1});
            });
            console.log('row.topics:',row.topics);
            if(!ret.value[0].tenantId){//tenantId不存在时，新增题来自中央库
              //具体情况包括：新增section(row._id不存在),修改section(包括row.remote新增和修改)
              var remoteRet = _.map(ret.value,function (o) {
                return {topicId:o._id}
              });
              // console.log('remoteRet:',remoteRet);
              if(row._id){
                var idx = _.findIndex(vm.hasRemoteTopics,function (o) {
                  return o._id == row._id;
                });
                if(idx==-1){
                  row.remote = true; //此section存在从远程拷贝的topic
                  vm.hasRemoteTopics.push({_id:row._id,topics:remoteRet});
                }else {
                  // console.log('vm.hasRemoteTopics[idx]:',vm.hasRemoteTopics[idx]);
                  vm.hasRemoteTopics[idx].topics=vm.hasRemoteTopics[idx].topics.concat(remoteRet);
                }
              }else {//row._id不存在
                if(!row.newRemote){
                  row.remote = true;
                  row.newRemote = [];
                }
                row.newRemote=row.newRemote.concat(remoteRet);
              }
              console.log('row:',row);
            }
          }
        });
      });
    }

    function doSubmit() {
      if ($scope.theForm.$valid) {
        console.log('vm.model:', vm.model);
        _.each(vm.model.sections,function (o) {
          if(o.newRemote){
            if(!vm.newSectionTopics){
              vm.newSectionTopics=[];
            }
            vm.newSectionTopics=vm.newSectionTopics.concat(o.newRemote);
          }
        });
        if((vm.hasRemoteTopics && vm.hasRemoteTopics.length>0) || (vm.newSectionTopics && vm.newSectionTopics.length>0)){
          console.log('vm.hasRemoteTopics:',vm.hasRemoteTopics);
          vmh.psnService.copyRemoteTempTopics(vm.tenantId,{section:vm.hasRemoteTopics,newSectionTopics:vm.newSectionTopics},vm.model.sections).then(function (ret) {
            console.log('copy finish...ret:',ret);
            vm.model.sections = ret;
            console.log('mode:',vm.model);
            vm.save();
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
      vm.isLocalTemplate = true;
      vm.tenantId = $scope.ngDialogData.tenantId;
      vm.selectedTopicIds = $scope.ngDialogData.selectedTopicIds;
      vm.localTopics = $scope.ngDialogData.localTopics;
      vm.remoteTopics = $scope.ngDialogData.remoteTopics;

      // vm.treeDataPromise = vmh.shareService.tmp('T3001/pub-evaluationTemplate', 'name sections', {tenantId: vm.tenantId, status: 1, stop_flag: false}).then(function (results) {
      //   console.log('results:',results);
      //   results.push({name:'其余非模板内题目'});
      //   return results;
      // });
      vm.localTempsPromise=vmh.shareService.tmp('T3015', 'name sections', {tenantId: vm.tenantId, status: 1, stop_flag: false}).then(function (nodes) {
        // console.log('localTemps nodes :',nodes);
        return nodes;
      });

      $scope.$on('tree:node:select', function ($event, node) {
        console.log('select node:',node);
        if(vm.all){
          vm.all=false;
        }
        if(node._id != '模板'){
          if(node._id == '题库'){
            if(vm.isLocalTemplate){
              vm.filterTopics=vm.topics=angular.copy(vm.localTopics);
            }else {
              vm.filterTopics=vm.topics=angular.copy(vm.remoteTopics);
            }
            return;
          }
          var topicsArr=[],topicIds;
          _.each(node.sections,function (o) {
            if(o.topics){
              topicsArr=topicsArr.concat(o.topics);
            }
          });
          topicIds=_.map(topicsArr,function (o) {
            var idx = vm.selectedTopicIds.indexOf(o.topicId);
            if(idx==-1){
              return o.topicId;
            }
          });
          console.log('topicIds:',topicIds);
          var where={status: 1, stop_flag: false,_id:{$in:topicIds}};
          if(vm.isLocalTemplate){
            where.tenantId=vm.tenantId;
          }else {
            where.tenantId={$in: [null, undefined]}
          }
          vmh.shareService.tmp('T3001/pub-evaluationItem', 'name type tenantId', where).then(function (results) {
            console.log('item nodes:',results);
            vm.filterTopics=vm.topics=angular.copy(results);
          });
        }
      });
      vm.showLocalTemplate = showLocalTemplate;
      vm.showRemoteTemplate = showRemoteTemplate;
      vm.doSubmit = doSubmit;
      vm.search = search;
      vm.selectAll = selectAll;
    }

    function showLocalTemplate() {
      vm.isLocalTemplate = true;
    }
    function showRemoteTemplate() {
      vm.isLocalTemplate = false;
      if(!vm.remoteTempsPromise){
        vm.remoteTempsPromise= vmh.shareService.tmp('T3015', 'name sections', {tenantId: {$in: [null, undefined]}, status: 1, stop_flag: false}).then(function (nodes) {
          console.log('nodes :',nodes);
          return nodes;
        });
      }
    }

    function search(keyword) {
      console.log('keyword:',keyword);
      if(keyword){
        var reg = new RegExp(keyword);
        var fNodes= _.filter(vm.topics,function (o) {
          return o.name.match(reg)
        });//浅复制，过滤后数组的变化会反应到原始数组的变化
        vm.filterTopics=fNodes;
      }else {
        vm.filterTopics=vm.topics;
      }
      console.log('vm.topics:',vm.topics);
    }

    function selectAll() {
      for (var i = 0, len = vm.topics.length; i < len; i++) {
        vm.topics[i].checked = vm.all;
      }
    }

    function selectedTopics() {
      var selected=  _.filter(vm.topics, function (o) {
        return o.checked;
      });
      vm.selectedTopics = selected;
    }

    function doSubmit() {
      selectedTopics();
      if (vm.selectedTopics.length == 0) {
        vmh.alertWarning('notification.SELECT-NONE-WARNING', true);
        return;
      }
      $scope.closeThisDialog(vm.selectedTopics);
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
      // console.log('vm.sortedTopics:',vm.sortedTopics);
      vm.doSubmit = doSubmit;
      vm.removeTopic = removeTopic;
    }

    function removeTopic(index) {
      console.log('$index', index);
      var rm=vm.sortedTopics.splice(index, 1);
      if(!vm.rmTopics){
        vm.rmTopics = [];
      }
      vm.rmTopics.push(rm[0]);//包含被删的本地或中央库的topic
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