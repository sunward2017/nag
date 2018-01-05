/**
 * Created by hcl on 17-12-19.
 */
(function() {
  'use strict';

  angular
      .module('subsystem.pension-agency')
      .controller('EvaluationTemplateGridController', EvaluationTemplateGridController)
      .controller('EvaluationTemplateDetailsController', EvaluationTemplateDetailsController)
      .controller('topicItemChooseController',topicItemChooseController)
      .controller('topicItemSortController',topicItemSortController)
      .filter('topicsArrayMemberFilter',topicsArrayMemberFilter)
  ;


  EvaluationTemplateGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

  function EvaluationTemplateGridController($scope, ngDialog, vmh, vm) {

    $scope.vm = vm;
    $scope.utils = vmh.utils.g;

    init();

    function init() {
      vm.init({removeDialog: ngDialog});
      vm.query();
    }


  }

  EvaluationTemplateDetailsController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

  function EvaluationTemplateDetailsController($scope, ngDialog, vmh, vm) {

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
      vm.showBubble = showBubble;

      vm.load();
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
        for (var i = 0; i < vm.model.sections.length; i++) {
          var row = vm.model.sections[i];
          if (row.checked) {
            vm.model.sections.splice(i, 1);
            i--;
          }
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
            row.topics = ret.value;
          }
        });
      });
    }

    function chooseTopicItem(row) {
      console.log('choose item`````row:',row);
      vmh.fetch(vm.modelNode.services['pub-evaluationItem'].query({status:1,stop_flag:false,"tenantId":{$in: [null, undefined]}}, '_id name type')).then(function (ret) {
        console.log('ret:',ret);
        ngDialog.open({
          template: 'topic-item-choose.html',
          controller: 'topicItemChooseController',
          className: 'ngdialog-theme-default ngdialog-backfiller-default-picker ngdialog-meal-weekly-menu-picker',
          data: {
            vmh: vmh,
            moduleTranslatePathRoot: vm.viewTranslatePath(),
            topicData:ret,
            rowData:row
          }
        }).closePromise.then(function (ret) {
          console.log('closePromise ret:',ret);
          if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
            row.topics =[];
            _.each(ret.value,function (o,idx) {
              row.topics.push({topicId:o._id,order:idx+1});
            });
            console.log('row.topics:',row.topics);
          }
        });
      });
    }
    
    function showBubble(e,data) {
      console.log('e:',e);
      vm.bubbleUp = true;
      vm.bubbleX = e.pageX-220-80+'px';
      vm.bubbleY=e.pageY-45+'px';
      vmh.fetch(vm.modelNode.services['pub-evaluationItem'].query({_id:data.topicId}, 'name type')).then(function (ret) {
        // console.log('bubble ret:',ret);
        vm.bubble = ret[0];
        vm.bubble.order=data.order;
        vm.bubble.shortId = e.currentTarget.innerText;
      })
    }

    function doSubmit() {
      if ($scope.theForm.$valid) {
        console.log('vm.model:', vm.model);
        vm.save();
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
    console.log('vm:',vm);
    init();

    function init() {
      vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
      vm.viewTranslatePath = function (key) {
        return vm.moduleTranslatePathRoot + '.' + key;
      };
      vm.topics = $scope.ngDialogData.topicData;
      vm.filterTopics=vm.topics;
      vm.selectedTopics = $scope.ngDialogData.rowData.topics;
      _.each(vm.selectedTopics,function (o) {
        var index = _.findIndex(vm.topics,function (topic) {
          return topic._id == o.topicId;
        });
        if(index!=-1){
          vm.topics[index].checked = true;
        }
      });
      vm.doSubmit = doSubmit;
      vm.search = search;
      vm.selectAll = selectAll;
    }
    
    function search(keyword) {
      console.log('keyword:',keyword);
      if(keyword){
        vm.filterTopics = [];
        var reg = new RegExp(keyword);
        var fNodes= _.filter(vm.topics,function (o) {
          return o.name.match(reg)
        });//浅复制，过滤后数组的变化会反应到原始数组的变化
        _.each(fNodes, function (o){
          vm.filterTopics.push(o);
        });
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
      console.log('vm.sortedTopics:',vm.sortedTopics);


      vm.doSubmit = doSubmit;
      vm.removeTopic = removeTopic;
    }

    function removeTopic(index) {
      console.log('$index', index);
      vm.sortedTopics.splice(index, 1);
    }

    function doSubmit() {
      if ($scope.theForm.$valid) {
        vm.sortedTopics=_.sortBy(vm.sortedTopics,'order');
        $scope.closeThisDialog(vm.sortedTopics);
      }
    }
  }





  function topicsArrayMemberFilter() {
    return topicsArrayMember;
  }
  function topicsArrayMember(cellObject, key) {
    if (!cellObject || !angular.isObject(cellObject))
      return '';
    return cellObject[key].slice(-6);
  }

})();