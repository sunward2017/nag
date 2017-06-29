/**
 * Created by zppro on 17-4-26.
 */
var co = require('co');
var DIC = require('../pre-defined/dictionary-constants.json');
var D3016 = require('../pre-defined/dictionary.json')['D3016'];
var socketServerEvents = require('../pre-defined/socket-server-events.json');

module.exports = {
    init: function (ctx) {
        console.log('init member service... ');
        var self = this;
        this.file = __filename;
        this.filename = this.file.substr(this.file.lastIndexOf('/') + 1);
        this.log_name = 'bc_' + this.filename;
        this.ctx = ctx;
        this.logger = require('log4js').getLogger(this.log_name);
        if (!this.logger) {
            console.error('logger not loaded in ' + this.file);
        }
        else {
            this.logger.info(this.file + " loaded!");
        }

        console.log(this.filename + ' ready... ');

        return this;
    },
    fetchBedMonitorAlarmsByRobot: function (robot_code) {
        var self = this;
        return co(function*() {
            try {
                var alarms = [], bedMonitors = [], robot, tenantId, rooms;
                robot = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_robot'], {
                    where: {
                        status: 1,
                        code: robot_code
                    }
                });
                if (!robot) {
                    return self.ctx.wrapper.res.error({message: '无效的机器人编号'});
                }

                // 通过机器人->房间->睡眠带
                tenantId = robot.tenantId;

                rooms = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_room'], {
                    select: '_id bedMonitors',
                    where: {
                        // robots: {$elemMatch: {_id: robot._id}},
                        robots: {$in: [robot._id]},
                        tenantId: tenantId
                    }
                });
                self.ctx._.each(rooms, (o)=> {
                    if (o.bedMonitors && o.bedMonitors.length > 0) {
                        bedMonitors = bedMonitors.concat(self.ctx._.map(o.bedMonitors, (item)=> {
                            return item.bedMonitorId.toString();
                        }));
                    }
                });

                console.log('bedMonitors:', bedMonitors);
                if(bedMonitors.length > 0) {
                    alarms = yield self.ctx.modelFactory().model_query(self.ctx.models['pub_alarm'], {
                        select: 'content',
                        where: {
                            subjectId: {$in: bedMonitors},
                            process_flag: false,
                            modes: {$elemMatch: {value: DIC.D3030.ROBOT}},
                            tenantId: tenantId
                        },
                        sort: 'check_in_time'
                    });
                }
                
                console.log('alarms:', alarms);
                return self.ctx.wrapper.res.rows(alarms);
            } catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    closeBedMonitorAlarm: function (alarm, operated_by, operated_by_name) {
        var self = this;
        var channelName = 'psn$bed_monitor_status';
        return co(function* () {
            try {

                self.ctx.clog.log(self.logger, 'closeBedMonitorAlarm 关闭报警并更新到数据库');

                alarm.process_flag = true;
                alarm.processed_on = self.ctx.moment();
                
                if(operated_by) {
                    alarm.processed_by = operated_by;
                }
                if (operated_by_name) {
                    alarm.processed_by_name = operated_by_name;
                }


                yield alarm.save();
                var bedMonitorName = alarm.subject_name;
                var key = bedMonitorName;
                self.ctx.cache.del(key);
                self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR_STATUS.COME, {bedMonitorName: bedMonitorName});
            } catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    saveBedMonitorAlarmForElderly2: function (bedMonitorId, elderlyId) {
        var self = this;
        return co(function *() {
            try {
                // && order.order_status == DIC.MWS01.WAITING_SHIP
                var bedMonitor, elderly;
                bedMonitor = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_bedMonitor'], bedMonitorId);
                elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
                return yield self.saveBedMonitorAlarmForElderly(bedMonitor, elderly);
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    saveBedMonitorAlarmForElderly: function (bedMonitor, elderly) {
        var self = this;
        return co(function *() {
            try {
                // && order.order_status == DIC.MWS01.WAITING_SHIP
                var tenant;
                if (!bedMonitor || bedMonitor.status == 0) {
                    self.ctx.clog.log(self.logger, 'saveBedMonitorAlarmForElderly: 无法找到睡眠带');
                    return;
                }
                if (!elderly || elderly.status == 0) {
                    self.ctx.clog.log(self.logger, 'saveBedMonitorAlarmForElderly: 无法找到老人');
                    return;
                }

                if(bedMonitor.tenantId.toString() != elderly.tenantId.toString()) {
                    self.ctx.clog.log(self.logger, 'saveBedMonitorAlarmForElderly: tenantId 不一致');
                    return;
                }
                tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], bedMonitor.tenantId);

                //获取该类告警配置
                var pub_alarm_D3016_A1000_setting = self.ctx._.find(tenant.other_config.pub_alarm_D3016_settings, (o)=>{
                    return o.reason == DIC.D3016.LEAVE_BED_TIMEOUT
                }) || {reason: DIC.D3016.LEAVE_BED_TIMEOUT, content_template: '${发生时间}${房间床位}${老人姓名}离床未归!', level: DIC.D3029.RED, modes:[DIC.D3030.ROBOT, DIC.D3030.PHONE, DIC.D3030.SMS, DIC.D3030.PHONE]};
                
                // 替换模版内容
                var content = pub_alarm_D3016_A1000_setting.content_template;
                var reg = /\${([^}]+)}/, result;
                while ((result = reg.exec(content)) != null) {
                    if (RegExp.$1 == "发生时间") {
                        content = content.replace(reg, self.ctx.moment().format('YYYY年MM月DD日HH点mm分'));
                    } else if (RegExp.$1 == "房间床位") {
                        var arr = elderly.room_summary.split('-');
                        if(arr.length == 4) {
                            arr[0] = arr[0].replace(/#/g, '号');
                            arr[1] = arr[1].replace(/F/g, '层');
                            arr[2] = arr[2] + '室';
                            arr[3] = arr[3].replace(/#/g, '号');
                        }
                        content = content.replace(reg, arr.join(''));
                    } else if (RegExp.$1 == "老人姓名") {
                        content = content.replace(reg, elderly.name);
                    }
                }
                
                // 设置报警等级和报警方式

                var alarm_modes = yield self._getAlarmModesByD3016SettingForElderly(pub_alarm_D3016_A1000_setting.modes, tenant, elderly);
                console.log('alarm_modes:>>>>>>>>>>>>>>>>>', alarm_modes);
                 
                var result = yield self.ctx.modelFactory().model_create(self.ctx.models['pub_alarm'], {
                    subject: 'pub_bedMonitor',
                    subjectId: bedMonitor._id,
                    subject_name: bedMonitor.name,
                    object: 'psn_elderly',
                    objectId: elderly._id,
                    object_name: elderly.name,
                    reason: DIC.D3016.LEAVE_BED_TIMEOUT,
                    content: content,
                    level: pub_alarm_D3016_A1000_setting.level,
                    modes: alarm_modes,
                    tenantId: bedMonitor.tenantId
                });

                return result.id;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    _getAlarmModesByD3016SettingForElderly: function (settingModes, tenant, elderly) {
        var self = this;
        return co(function*() {
            try {
                var mode, alarm_modes = [], receiver, alarm_mode, mode_send_tos;
                var start = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD')), end = self.ctx.moment(start).add(1, 'days');
                for(var i=0,len=settingModes.length;i<len;i++ ){
                    mode = settingModes[i];
                    alarm_mode = {value: mode.value};
                    if(mode.value == DIC.D3030.PHONE || mode.value == DIC.D3030.SMS) {
                        mode_send_tos = [];
                        for(var j=0,jLen=mode.receivers.length;j<jLen;j++ ){
                            receiver = mode.receivers[j];

                            if(receiver.type == DIC.D3031.MOBILE_DEFINED){
                                receiver.value && (mode_send_tos = mode_send_tos.concat(receiver.value.split(',')));
                            } else if(receiver.type == DIC.D3031.RELATIVES_AND_FRIENDS){
                                // 查找老人亲友
                                elderly.family_members.length > 0 && (mode_send_tos = mode_send_tos.concat(self.ctx._.map(elderly.family_members, member=> member.phone)));
                            } else if(receiver.type == DIC.D3031.NURSING_WORKER_SERVED){
                                // 查找当班护工
                                var nursingWorkerScheduleItems = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_nursingSchedule'], {
                                    select: 'aggr_value',
                                    where: {
                                        status: 1,
                                        x_axis: {'$gte': start, '$lt': end},
                                        y_axis: elderly.room_value.roomId,
                                        tenantId: tenant._id
                                    }
                                }).populate('aggr_value', 'phone', 'psn_nursingWorker');

                                nursingWorkerScheduleItems.length > 0 && (mode_send_tos = mode_send_tos.concat(self.ctx._.map(nursingWorkerScheduleItems, item=>item.aggr_value.phone)));

                            } else if(receiver.type == DIC.D3031.NURSE_IN_CHARGE){
                                // 暂时先不实现,可能已值班手机来设置
                            } else if(receiver.type == DIC.D3031.HEAD_OF_AGENCY){
                                tenant.head_of_agency && tenant.head_of_agency.phone && (mode_send_tos.concat(tenant.head_of_agency.phone.split(',')));
                            }
                        }
                        alarm_mode.send_tos = mode_send_tos;
                    }
                    alarm_modes.push(alarm_mode);

                }
                return alarm_modes;
            } catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    sendAlarmLast24HoursCircle: function () {
        var self = this;
        return co(function*() {
            try {
                // 过去24小时需要发送的通知报警信息
                var now = self.ctx.moment(), before = self.ctx.moment(now).add(-1, 'days');
                var alarms = yield self.ctx.modelFactory().model_query(self.ctx.models['pub_alarm'], {
                    select: 'reason content level modes tenantId',
                    where: {
                        sended_flag: {$in: [undefined, false]},
                        level: {$in: [DIC.D3029.ORANGE, DIC.D3029.RED]},
                        modes: {$elemMatch: {value: {$in: [DIC.D3030.PHONE, DIC.D3030.SMS]}}},
                        check_in_time: {'$gte': before, '$lt': now}
                    },
                    sort: 'check_in_time'
                });

                console.log('sendAlarmLast24HoursCircle alarms:', alarms);
                yield self._sendAlarms(alarms);
            } catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    sendAlarmLast24HoursAtMoment: function () {
        var self = this;
        return co(function*() {
            try {
                // 过去24小时需要发送的通知报警信息
                var now = self.ctx.moment(), before = self.ctx.moment(now).add(-1, 'days');
                var alarms = yield self.ctx.modelFactory().model_query(self.ctx.models['pub_alarm'], {
                    select: 'reason content level modes tenantId',
                    where: {
                        sended_flag: {$in: [undefined, false]},
                        level: {$in: [DIC.D3029.BLUE, DIC.D3029.YELLOW]},
                        modes: {$elemMatch: {value: {$in: [DIC.D3030.PHONE, DIC.D3030.SMS]}}},
                        check_in_time: {'$gte': before, '$lt': now}
                    },
                    sort: 'check_in_time'
                });

                console.log('sendAlarmLast24HoursAtMoment  alarms:', alarms);
                yield self._sendAlarms(alarms);
            } catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    _sendAlarms: function (alarms) {
        var self = this;
        return co(function*() {
            try {
                var alarm, repeat_count, sendTitle, sendContent, mode, sendResult;
                for(var i=0,len = alarms.length;i<len;i++) {
                    alarm = alarms[i];
                    if (alarm.modes.length > 0) {
                        sendContent = alarm.content
                        if (alarm.level == DIC.D3029.ORANGE) {
                            sendContent = sendContent + '，' + sendContent;
                        } else if (alarm.level == DIC.D3029.RED) {
                            sendContent = sendContent + '，' + sendContent + '，' + sendContent;
                        }
                        console.log('>>>>>>>>>>>>>>>>>>>>>alarm:', alarm);
                        for (var j = 0, jLen = alarm.modes.length; j < jLen; j++) {
                            mode = alarm.modes[j];
                            console.log('>>>>>>>>>>>>>>>>>>>>>mode:', mode);
                            if (mode.send_tos.length > 0) {
                                sendResult = undefined;
                                if (mode.value == DIC.D3030.PHONE) {
                                    sendTitle = D3016[alarm.reason].name;
                                    sendResult = yield self.ctx.send_wodong_service.vms(mode.send_tos, sendTitle, sendContent);
                                } else if (mode.value == DIC.D3030.SMS) {
                                    // sendResult = yield self.ctx.send_wodong_service.sms(mode.send_tos, sendContent);
                                }
                                if (sendResult) {
                                    //保存发送记录的流水
                                    var result = yield self.ctx.modelFactory().model_create(self.ctx.models['pub_sendRecord'], {
                                        service_provider: 'wodong',
                                        send_content: sendContent,
                                        send_to: mode.send_tos.join(),
                                        send_result: JSON.stringify(sendResult),
                                        alarmId: alarm._id,
                                        tenantId: alarm.tenantId
                                    });
                                }
                            }
                        }

                        alarm.sended_on = self.ctx.moment();
                        alarm.sended_flag = true;
                        yield alarm.save();
                    }
                }
            } catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    }
};