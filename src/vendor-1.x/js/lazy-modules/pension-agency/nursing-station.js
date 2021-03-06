/**
 * district Created by zppro on 17-3-29.
 * Target:养老机构 护士台
 */

(function() {
  'use strict';

  angular
    .module('subsystem.pension-agency')
    .controller('NursingStationController', NursingStationController)
    .controller('NursingStationAlarmDialogController', NursingStationAlarmDialogController)
    .controller('NursingStationElderlyDialogController', NursingStationElderlyDialogController)
  ;

  NursingStationController.$inject = ['$scope', 'ngDialog', 'blockUI', 'SOCKET_EVENTS', 'SocketManager', '$echarts', 'vmh', 'instanceVM'];

  function NursingStationController($scope, ngDialog, blockUI, SOCKET_EVENTS, SocketManager, $echarts, vmh, vm) {

    var vm = $scope.vm = vm;
    $scope.utils = vmh.utils.v;

    init();

    function init() {

      vm.init({removeDialog: ngDialog});

      vm.onFloorChange = onFloorChange;
      vm.toggleAlarmQueue = toggleAlarmQueue;
      vm.openAlarmDialogByAlarm = openAlarmDialogByAlarm;
      vm.openAlarmDialogByMonitorObject = openAlarmDialogByMonitorObject;
      vm.openElderlyDialog = openElderlyDialog;

      vm.elderlyStatusMonitor = {};
      vm.bedMonitorStatusMappingElderly = {};// bedMonitorName做key
      vm.bedMonitorStatusMonitor = {};
      vm.alarmQueue = [];
      vm.IoC = {}; // 控制弹出窗口的容器
      vm.defaultElderlyAvatar = 'app/img/user/avatar-in-nursing-station.png';
      vm.nursingStationBlocker = blockUI.instances.get('nursing-station');
      vm.toggleAlarmButton = vm.moduleTranslatePath('EXPAND-ALARM-QUEUE');

      vmh.shareService.d2('D3016').then(function (data) {
        vm.D3016 = data;
      });
      vm.floorDataPromise = vmh.shareService.tmp('T3008', null, {tenantId: vm.tenantId}).then(function (nodes) {
        console.log(nodes);
        return nodes;
      });

      // vm.realtime_wave_id = $echarts.generateInstanceIdentity();
      // vm.realtime_wave_config = {
      //     title: {
      //         text: '动态数据 + 时间坐标轴'
      //     },
      //     xAxis: {
      //         type: 'time',
      //         splitLine: {
      //             show: false
      //         }
      //     },
      //     yAxis: {
      //         type: 'value',
      //         boundaryGap: [0, '100%'],
      //         splitLine: {
      //             show: false
      //         }
      //     },
      //     series: [{
      //         name: '模拟数据',
      //         type: 'line',
      //         showSymbol: false,
      //         hoverAnimation: false,
      //         data: []
      //     }]
      // };

      subscribeBedMonitorStatus();
      processAlarmQueue();
    }

    function subscribeBedMonitorStatus() {
      var channelOfStatus = SocketManager.registerChannel(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.$SOCKET_URL);
      channelOfStatus.on(SOCKET_EVENTS.SHARED.CONNECT, function () {
        console.log('nursing-station bed_monitor_status socket connected');
      });
      channelOfStatus.on(SOCKET_EVENTS.SHARED.DISCONNECT, function () {
        console.log('nursing-station bed_monitor_status socket disconnected');
      });
      channelOfStatus.off(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.ON_LINE).on(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.ON_LINE, function (data) {
        // console.log('nursing-station socket ON_LINE =>', data);
        // var bedMonitorStatus = vm.monitorStatus[data.bedMonitorName];
        var elderlyId = vm.bedMonitorStatusMappingElderly[data.bedMonitorName];
        var bedMonitorStatus = vm.elderlyStatusMonitor[elderlyId];
        if (bedMonitorStatus) {
          vmh.timeout(function () {
            bedMonitorStatus.status = 'online';
            console.log('bedMonitorStatus:', bedMonitorStatus);
          });
        }
      });
      channelOfStatus.off(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.OFF_LINE).on(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.OFF_LINE, function (data) {
        // console.log('nursing-station socket OFF_LINE =>', data);
        var elderlyId = vm.bedMonitorStatusMappingElderly[data.bedMonitorName];
        var bedMonitorStatus = vm.elderlyStatusMonitor[elderlyId];
        if (bedMonitorStatus) {
          vmh.timeout(function () {
            bedMonitorStatus.status = 'offline';
            console.log('bedMonitorStatus:', bedMonitorStatus);
          });
        }
      });
      channelOfStatus.off(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.COME).on(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.COME, function (data) {
        // console.log('nursing-station socket COME =>', data);
        var elderlyId = vm.bedMonitorStatusMappingElderly[data.bedMonitorName];
        var bedMonitorStatus = vm.elderlyStatusMonitor[elderlyId];
        if (bedMonitorStatus) {
          vmh.timeout(function () {
            bedMonitorStatus.status = 'normal';
            console.log('bedMonitorStatus:', bedMonitorStatus);
          });
        }
      });
      channelOfStatus.off(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.LEAVE).on(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.LEAVE, function (data) {
        // console.log('nursing-station socket LEAVE =>', data);
        var elderlyId = vm.bedMonitorStatusMappingElderly[data.bedMonitorName];
        var bedMonitorStatus = vm.elderlyStatusMonitor[elderlyId];
        if (bedMonitorStatus) {
          vmh.timeout(function () {
            bedMonitorStatus.status = 'warning';
            console.log('bedMonitorStatus:', bedMonitorStatus);
          })
        }
      });
      channelOfStatus.off(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.NO_MAN_IN_BED).on(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.NO_MAN_IN_BED, function (data) {
        // console.log('nursing-station socket NO_MAN_IN_BED =>', data);
        var elderlyId = vm.bedMonitorStatusMappingElderly[data.bedMonitorName];
        var bedMonitorStatus = vm.elderlyStatusMonitor[elderlyId];
        if (bedMonitorStatus) {
          vmh.timeout(function () {
            bedMonitorStatus.status = 'no-man-in-bed';
            console.log('bedMonitorStatus:', bedMonitorStatus);
          })
        }
      });
      channelOfStatus.off(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.ALARM_LEAVE_TIMEOUT).on(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.S2C.ALARM_LEAVE_TIMEOUT, function (data) {
        // console.log('nursing-station socket ALARM_LEAVE_TIMEOUT =>', data);
        var elderlyId = vm.bedMonitorStatusMappingElderly[data.bedMonitorName];
        console.log('on alarm elderlyId=>', elderlyId);
        if (data.alarmId && _.findIndex(vm.alarmQueue, function (alarmObject) {
            return alarmObject.elderlyId == elderlyId && alarmObject.reason == data.reason;
          }) == -1) {
          var elderly = _.find(vm.elderlys, function (elderly) {
            return elderly._id == elderlyId;
          });
          var alarm = _.extend({elderly: elderly, processed: false}, data);
          vm.alarmQueue.push(alarm);
          console.log('vm.alarmQueue:', vm.alarmQueue);
        }

        var bedMonitorStatus = vm.elderlyStatusMonitor[elderlyId];
        if (bedMonitorStatus) {
          vmh.timeout(function () {
            bedMonitorStatus.status = 'alarm';
            console.log('bedMonitorStatus:', bedMonitorStatus);
          })
        }
      });
    }

    function unsubscribeBedMonitorListen(bedMonitorName, tenantId) {
      var channelOfListen = SocketManager.getChannel(SOCKET_EVENTS.PSN.BED_MONITOR_LISTEN.$SOCKET_URL);
      if (channelOfListen) {
        channelOfListen.emit(SOCKET_EVENTS.PSN.BED_MONITOR_LISTEN.C2S.UNSUBSCRIBE, {
          tenantId: tenantId,
          bedMonitorName: bedMonitorName
        });
        SocketManager.unregisterChannel(SOCKET_EVENTS.PSN.BED_MONITOR_LISTEN.$SOCKET_URL);
      }
    }


    function onFloorChange() {
      console.log('onFloorChange:', vm.floorData);
      if (vm.floorData.length > 0) {
        vm.nursingStationBlocker.start();
        vmh.psnService.elderlysByDistrictFloors(vm.tenantId, _.map(vm.floorData, function (o) {
          return o._id;
        })).then(function (data) {
          vm.elderlys = data;
          var bedMonitorNames = [], bedMonitor;
          _.each(vm.elderlys, function (elderly) {
            bedMonitor = _.find(elderly.room_value.roomId.bedMonitors, function (o) {
              // console.log('o.bed_no ', o.bed_no);
              // console.log('elderly.room_value.bed_no ', elderly.room_value.bed_no);
              return o.bed_no == elderly.room_value.bed_no
            });
            if (bedMonitor) {
              if (!vm.elderlyStatusMonitor[elderly.id]) {
                console.log('elderly.id=>', elderly.id);
                vm.bedMonitorStatusMappingElderly[bedMonitor.bedMonitorName] = elderly.id;
                vm.elderlyStatusMonitor[elderly.id] = {bedMonitorName: bedMonitor.bedMonitorName, status: 'offline'};
                bedMonitorNames.push(bedMonitor.bedMonitorName);
              }
            }
          });
          if (bedMonitorNames.length > 0) {
            console.log('SUBSCRIBE>', bedMonitorNames);
            var channel = SocketManager.getChannel(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.$SOCKET_URL);
            channel && channel.emit(SOCKET_EVENTS.PSN.BED_MONITOR_STATUS.C2S.SUBSCRIBE, {
              tenantId: vm.tenantId,
              bedMonitorNames: bedMonitorNames
            });
          }
        }).finally(function () {
          vm.nursingStationBlocker.stop();
          console.log('vm.elderlyStatusMonitor', vm.elderlyStatusMonitor);
        });
      } else {
        vm.elderlys = [];
      }
    }

    function toggleAlarmQueue() {
      console.log('toggleAlarmQueue');
      vm.alarmQueueVisible = !vm.alarmQueueVisible;
      vm.toggleAlarmButton = vm.alarmQueueVisible ? vm.moduleTranslatePath('COLLAPSE-ALARM-QUEUE') : vm.moduleTranslatePath('EXPAND-ALARM-QUEUE');
    }

    function processAlarmQueue() {
      console.log('processAlarmQueue:', vm.alarmQueue.length);
      if (vm.alarmQueue.length > 0) {
        openAlarmDialog(vm.alarmQueue[0]);
      } else {
        vmh.timeout(function () {
          processAlarmQueue();
        }, 1000);
      }
    }

    function openAlarmDialogByAlarm(index) {
      console.log('openAlarmDialogByAlarm:', index);
      if (index >= 0 && index < vm.alarmQueue.length) {
        var alarm = vm.alarmQueue[index];
        if (!alarm.processed) {
          openAlarmDialog(alarm)
        }
      }
    }

    function openAlarmDialogByMonitorObject(elderlyId) {
      console.log('openAlarmDialogByMonitorObject elderly:', elderlyId);
      for (var i = 0, len = vm.alarmQueue.length, alarmObject; i < len; i++) {
        alarmObject = vm.alarmQueue[i];
        console.log('alarmObject:', alarmObject);
        if (alarmObject.elderly.id == elderlyId && alarmObject.processed == false) {
          openAlarmDialog(alarmObject);
          break;
        }
      }
    }

    function openAlarmDialog(alarm) {
      if(!vm.larmAudio ) vm.larmAudio =document.getElementById("alarm-audio") ;
      vm.larmAudio.play();
      ngDialog.open({
        template: 'nursing-station-alarm.html',
        controller: 'NursingStationAlarmDialogController',
        className: 'ngdialog-theme-default ngdialog-nursing-station-alarm',
        data: {
          vmh: vmh,
          moduleTranslatePathRoot: vm.moduleTranslatePath(),
          defaultElderlyAvatar: vm.defaultElderlyAvatar,
          title: vm.D3016[alarm.reason].name,
          alarm: alarm,
          tenantId: vm.tenantId,
          operated_by: vm.operated_by,
          operated_by_name: vm.operated_by_name
        }
      }).closePromise.then(function (ret) {
        if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
          console.log(ret);
          var index = _.findIndex(vm.alarmQueue, function (o) {
            return o === alarm;
          });
          if (index != -1) {
            vm.alarmQueue.splice(index, 1);
            vmh.alertSuccess('button.CLOSE', true);
          }
        }
        vm.larmAudio.pause();
        vmh.timeout(function () {
          processAlarmQueue();
        }, 1000);
      });
    }

    function openElderlyDialog(elderly) {
      ngDialog.open({
        template: 'nursing-station-elderly.html',
        controller: 'NursingStationElderlyDialogController',
        className: 'ngdialog-theme-default ngdialog-nursing-station-elderly',
        data: {
          vmh: vmh,
          moduleTranslatePathRoot: vm.moduleTranslatePath(),
          defaultElderlyAvatar: vm.defaultElderlyAvatar,
          elderly: elderly,
          tenantId: vm.tenantId,
          operated_by: vm.operated_by,
          operated_by_name: vm.operated_by_name,
          haveBindingRobot: false,
          bindingBedMonitor: vm.elderlyStatusMonitor[elderly.id],
          subscribeBedMonitorListen: vm.subscribeBedMonitorListen,
          IoC: vm.IoC
        }
      }).closePromise.then(function (ret) {
        if (vm.elderlyStatusMonitor[elderly.id]) {
          unsubscribeBedMonitorListen(vm.elderlyStatusMonitor[elderly.id].bedMonitorName, vm.tenantId)
        }
        if (vm.IoC.intervalIdOfRealWave) {
          clearInterval(vm.IoC.intervalIdOfHeartRate);
        }
        if (vm.IoC.intervalIdOfRealWave) {
          clearInterval(vm.IoC.intervalIdOfRealWave);
        }

        if (ret.value != '$document' && ret.value != '$closeButton' && ret.value != '$escape') {
          console.log('openElderlyDialog close')
        }
      });
    }

  }

  NursingStationAlarmDialogController.$inject = ['$scope', 'ngDialog'];

  function NursingStationAlarmDialogController($scope, ngDialog) {

    var vm = $scope.vm = {};
    var vmh = $scope.ngDialogData.vmh;

    $scope.utils = vmh.utils.v;

    init();

    function init() {
      vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
      vm.moduleTranslatePath = function (key) {
        return vm.moduleTranslatePathRoot + '.' + key;
      };
      vm.defaultElderlyAvatar = $scope.ngDialogData.defaultElderlyAvatar;
      vm.title = $scope.ngDialogData.title;
      vm.alarm = $scope.ngDialogData.alarm;
      vm.tenantId = $scope.ngDialogData.tenantId;
      vm.operated_by = $scope.ngDialogData.operated_by;
      vm.operated_by_name = $scope.ngDialogData.operated_by_name;
      vm.reasonMap = {};
      vm.closeAlarm = closeAlarm;
    }


    function closeAlarm() {
      var promise = ngDialog.openConfirm({
        template: 'customConfirmDialog.html',
        className: 'ngdialog-theme-default',
        controller: ['$scope', function ($scopeConfirm) {
          $scopeConfirm.message = vm.moduleTranslatePath('DLG-ALARM-TO-CONFIRM-CLOSE')
        }]
      }).then(function () {
        $scope.closeThisDialog({alarmClosed: true});
        vmh.psnService.nursingStationCloseBedMonitorAlarm(vm.alarm.alarmId, {
          operated_by: vm.operated_by,
          operated_by_name: vm.operated_by_name
        }).then(function (ret) {
          $scope.closeThisDialog({alarmClosed: true});
        }, function (err) {
          console.log(err);
        });
      });
    }
  }

  NursingStationElderlyDialogController.$inject = ['$scope', 'ngDialog', 'SOCKET_EVENTS', 'SocketManager', '$echarts'];

  function NursingStationElderlyDialogController($scope, ngDialog, SOCKET_EVENTS, SocketManager, $echarts) {

    var vm = $scope.vm = {};
    var vmh = $scope.ngDialogData.vmh;

    $scope.utils = vmh.utils.v;
    var moment = $scope.moment = vmh.utils.m;

    var minute_hr_x_data = [], minute_hr_y_data = [], wave_raw_data = [], wave_x_data = [], wave_y_data = [];


    // var now = moment().unix();
    // var oneDay = 24 * 3600 * 1000;
    // var oneMinute = 60 * 1000;
    // var value = Math.random() * 1000;
    // for (var i = 0; i < 60; i++) {
    //     var ts = now;
    //     xData.push(ts);
    //     wave_data.push(randomData(ts));
    // }
    // function randomData(ts) {
    //     value = value + Math.random() * 21 - 10;
    //     return {
    //         value: [
    //             ts,
    //             Math.round(value)
    //         ]
    //     }
    // }
    // setInterval(function () {
    //     var ts = moment().unix();
    //     xData.shift();
    //     xData.push(ts);
    //     wave_data.shift();
    //     wave_data.push(randomData(ts));
    //     $echarts.updateEchartsInstance(vm.realtime_wave_id, {
    //         xAxis: {
    //             data: xData
    //         },
    //         series: [{
    //             data: wave_data
    //         }]
    //     });
    // }, 1000);

    init();


    function init() {
      vm.moduleTranslatePathRoot = $scope.ngDialogData.moduleTranslatePathRoot;
      vm.moduleTranslatePath = function (key) {
        return vm.moduleTranslatePathRoot + '.' + key;
      };
      vm.defaultElderlyAvatar = $scope.ngDialogData.defaultElderlyAvatar;
      vm.elderly = $scope.ngDialogData.elderly;
      vm.tenantId = $scope.ngDialogData.tenantId;
      vm.operated_by = $scope.ngDialogData.operated_by;
      vm.operated_by_name = $scope.ngDialogData.operated_by_name;
      vm.bindingBedMonitor = $scope.ngDialogData.bindingBedMonitor;
      vm.haveBindingRobot = $scope.ngDialogData.haveBindingRobot;
      vm.haveBindingBedMonitor = !!vm.bindingBedMonitor;
      vm.IoC = $scope.ngDialogData.IoC;

      vm.onAvatarUploaded = onAvatarUploaded;
      // vm.tab1 = {cid: 'contentTab1', active: true};
      vm.tab1 = {cid: 'content-nursing_records_today', active: !vm.haveBindingBedMonitor};
      vm.tab2 = {cid: 'content-life_integration', active: vm.haveBindingBedMonitor};
      vm.tab3 = {cid: 'content-hardware_robot'};


      vmh.parallel([
        vmh.shareService.d2('D1012'),
        vmh.getModelService('psn-elderly').single({_id: vm.elderly._id}, 'nursing_assessment_grade family_members'),
        vmh.psnService.nursingScheduleByElderlyDaily(vm.tenantId, vm.elderly._id),
        vmh.psnService.nursingRecordsByElderlyToday(vm.tenantId, vm.elderly._id),
        vmh.psnService.elderlyStockObject(vm.tenantId, vm.elderly._id)
        // vmh.getModelService('het-member').single({tenantId: vm.tenantId},'session_id_hzfanweng')
      ]).then(function (results) {
        vm.nursing_assessment_grade_name = results[1].nursing_assessment_grade_name;
        vm.family_members = _.map(results[1].family_members, function (o) {
          return (results[0][o.relation_with] || {}).name + ':' + o.name + '(' + o.phone + ')'
        }).join();
        vm.nursingWorkerNames = _.map(results[2], function (o) {
          return (o.aggr_value || {}).name;
        }).join();
        vm.nursingRecords = results[3];
        var elderlyStockObject = results[4];
        _.each(_.filter(vm.nursingRecords, function(o){ return o.type === 'A0003'}), function (o) {
          o.drugStock = elderlyStockObject[o.workItemId.drugId]
          console.log('o.workItemId.drugId:', o)
        })
      });

      // 获取睡眠带生命体征及实时数据
      if (vm.haveBindingBedMonitor) {

        vmh.psnService.getLatestSmbPerMinuteRecord(vm.bindingBedMonitor.bedMonitorName, vm.tenantId).then(function (result) {
          console.log('result is >>>>>>>>>>>>>>>>>>>>>>>>>>>>');
          console.log(result);
          if (result.msg == 'success') {
            vm.occurTime = result.res.occurTime;
            vm.heartRateCount = result.res.heartRateCount;
            vm.breathRateCount = result.res.breathRateCount;
            vm.turnOverCount = result.res.turnOverCount;
            vm.bodyMoveCount = result.res.bodyMoveCount;
            vm.inBed = result.res.inBed;
            for (var i = 0; i < 15; i++) {
              minute_hr_x_data.push(i);
              if (i == 14) {
                minute_hr_y_data.push({
                  value: [
                    i,
                    result.res.heartRateCount
                  ]
                });
              } else {
                minute_hr_y_data.push({
                  value: [
                    i,
                    0
                  ]
                });
              }

            }
            $echarts.updateEchartsInstance(vm.miniute_hr_bar_id, {
              xAxis: {
                data: minute_hr_x_data
              },
              series: [{
                data: minute_hr_y_data
              }]
            });
          } else {
            vm.inBed = 'offline';
          }
        });
        var dataCount = 15;
        vm.IoC.intervalIdOfHeartRate = setInterval(function () {
          vmh.psnService.getLatestSmbPerMinuteRecord(vm.bindingBedMonitor.bedMonitorName, vm.tenantId).then(function (result) {
            if (result.msg == 'success') {
              vm.occurTime = result.res.occurTime;
              vm.heartRateCount = result.res.heartRateCount;
              vm.breathRateCount = result.res.breathRateCount;
              vm.turnOverCount = result.res.turnOverCount;
              vm.bodyMoveCount = result.res.bodyMoveCount;
              vm.inBed = result.res.inBed;
              minute_hr_x_data.shift();
              minute_hr_x_data.push(dataCount);
              minute_hr_y_data.shift();
              minute_hr_y_data.push({
                value: [
                  dataCount,
                  result.res.heartRateCount
                ]
              });
              console.log(minute_hr_x_data);
              // minute_hr_y_data.push(result.res.heartRateCount);
              $echarts.updateEchartsInstance(vm.miniute_hr_bar_id, {
                xAxis: {
                  data: minute_hr_x_data
                },
                series: [{
                  data: minute_hr_y_data
                }]
              });
              dataCount++;
            } else {
              vm.inBed = 'offline';
            }
          });
        }, 1000 * 60);

        vm.miniute_hr_bar_id = $echarts.generateInstanceIdentity();
        vm.miniute_hr_bar_config = {
          title: {
            text: '心率'
          },
          xAxis: {
            type: 'category',
            splitLine: {
              show: false
            },
            axisLabel: {
              show: false
            },
            axisTick: {
              show: false
            },
            data: minute_hr_x_data
          },
          yAxis: {
            min: 0,
            max: 160,
            type: 'value',
            // boundaryGap: [0, '100%'],
            boundaryGap: false,
            splitLine: {
              show: false
            }
          },
          series: [{
            // name: '心律(波形)',
            type: 'bar',
            showSymbol: false,
            hoverAnimation: false,
            data: minute_hr_y_data,
            label: {
              normal: {
                show: true,
                position: 'insideTop',
                formatter: function (params) {
                  return params.value[1];
                }
              }
            },
          }]
        };

        vm.realtime_wave_id = $echarts.generateInstanceIdentity();
        vm.realtime_wave_config = {
          title: {
            text: '实时波形'
          },
          xAxis: {
            show: false,
            type: 'category',
            splitLine: {
              show: false
            },
            boundaryGap: false,
            data: wave_x_data
          },
          yAxis: {
            show: false,
            type: 'value',
            // boundaryGap: [0, '100%'],
            boundaryGap: false,
            splitLine: {
              show: false
            },
            min: -100,
            max: 100
          },
          series: [{
            // name: '心律(波形)',
            type: 'line',
            showSymbol: false,
            hoverAnimation: false,
            data: wave_y_data
          }]
        };
        subscribeBedMonitorListen(vm.bindingBedMonitor.bedMonitorName, vm.tenantId);

        var renderMax = 200, radio = 4000 / 200;
        var ts = 0;
        // vm.IoC.intervalIdOfRealWave = setInterval(function () {
        //     var value = wave_raw_data.shift();
        //     console.log('wave_raw_data -length:', wave_raw_data.length);
        //     console.log('value:', value);
        //     if (!value) {
        //         value = 0;
        //     } else {
        //         value =  (value / radio).toFixed(2) - 100;
        //     }
        //
        //     if(wave_x_data.length == 0) {
        //         // wave_x_data.shift();
        //         wave_x_data = _.range(renderMax);
        //         if(wave_raw_data.length>0){
        //             wave_y_data = wave_raw_data.slice(0, renderMax);
        //         } else {
        //             wave_y_data = _.map(wave_x_data, function (o) {
        //                 return {value: [o, 0]}
        //             });
        //         }
        //         ts = renderMax;
        //     } else {
        //         wave_x_data.shift();
        //         wave_x_data.push(ts);
        //         wave_y_data.shift();
        //         wave_y_data.push({
        //             value: [
        //                 ts++,
        //                 value
        //             ]
        //         });
        //     }
        //
        //     $echarts.updateEchartsInstance(vm.realtime_wave_id, {
        //         xAxis: {
        //             data: wave_x_data
        //         },
        //         series: [{
        //             data: wave_y_data
        //         }]
        //     });
        //
        // }, 15);
        vm.IoC.intervalIdOfRealWave = setInterval(function () {
          var values = wave_raw_data.splice(0, 4);//一次取5个点
          console.log('wave_raw_data -length:', wave_raw_data.length);
          // console.log('values:', values);
          var value0 = 0;
          if (values.length > 0) {
            values = _.map(values, function (v) {
              return (v / radio).toFixed() - 100;
            })
          }

          if (wave_x_data.length == 0) {
            // wave_x_data.shift();
            wave_x_data = _.range(renderMax);

            wave_y_data = _.map(wave_x_data, function (o) {
              return {value: [o, value0]}
            });
            ts = renderMax;
          } else {
            _.each(values, function (value) {
              wave_x_data.shift();
              wave_x_data.push(ts);
              wave_y_data.shift();
              wave_y_data.push({
                value: [
                  ts++,
                  value
                ]
              });
            });
          }

          $echarts.updateEchartsInstance(vm.realtime_wave_id, {
            xAxis: {
              data: wave_x_data
            },
            series: [{
              data: wave_y_data
            }]
          });

        }, 20);
      }

      // 获取睡眠带生命体征及实时数据
      if (vm.haveBindingRobot) {

      }
    }

    function subscribeBedMonitorListen(bedMonitorName, tenantId) {

      var channelOfListen = SocketManager.registerChannel(SOCKET_EVENTS.PSN.BED_MONITOR_LISTEN.$SOCKET_URL);
      channelOfListen.on(SOCKET_EVENTS.SHARED.CONNECT, function () {
        console.log('nursing-station bed_monitor_listen socket connected');
      });
      channelOfListen.on(SOCKET_EVENTS.SHARED.DISCONNECT, function () {
        console.log('nursing-station bed_monitor_listen socket disconnected');
      });
      channelOfListen.off(SOCKET_EVENTS.PSN.BED_MONITOR_LISTEN.S2C.WAVE_DATA).on(SOCKET_EVENTS.PSN.BED_MONITOR_LISTEN.S2C.WAVE_DATA, function (data) {
        console.log('nursing-station bed_monitor_listen socket WAVE_DATA =>', moment().format('HH:mm:ss'), data);
        wave_raw_data = wave_raw_data.concat(data.values);
      });
      channelOfListen.emit(SOCKET_EVENTS.PSN.BED_MONITOR_LISTEN.C2S.SUBSCRIBE, {
        tenantId: tenantId,
        bedMonitorName: bedMonitorName
      });
    }

    function onAvatarUploaded(uploadedUrl) {
      if (uploadedUrl) {
        vmh.fetch(vmh.getModelService('psn-elderly').update(vm.elderly._id, {avatar: uploadedUrl}));
      }
    }
  }
})();