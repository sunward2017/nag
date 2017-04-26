/**
 * Created by zppro on 17-4-26.
 */
var co = require('co');
var DIC = require('../pre-defined/dictionary-constants.json');
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
    closeBedMonitorAlarm: function (alarm, operated_by, operated_by_name) {
        var self = this;
        var channelName = 'psn$bed_monitor';
        return co(function* () {
            try {

                self.ctx.clog.log(self.logger, 'closeBedMonitorAlarm 关闭报警并更新到数据库');

                alarm.process_flag = true;
                alarm.processed_on = self.ctx.moment();
                alarm.processed_by = operated_by;
                alarm.processed_by_name = operated_by_name;

                yield alarm.save();
                var bedMonitorName = alarm.subject_name;
                var key = bedMonitorName;
                self.ctx.cache.del(key);
                self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR.COME, {bedMonitorName: bedMonitorName});
            } catch (e) {
                console.log(e);
                self.logger.error(e.message);
                self.isExecuting = false;
            }
        }).catch(self.ctx.coOnError);
    },
    saveBedMonitorAlarmForElderly: function (bedMonitorId, elderlyId) {
        var self = this;
        return co(function *() {
            try {
                // && order.order_status == DIC.MWS01.WAITING_SHIP
                var bedMonitor, elderly, tenant;

                bedMonitor = yield app.modelFactory().model_read(app.models['pub_bedMonitor'], bedMonitorId);
                if (!bedMonitor) {
                    self.ctx.clog.log(self.logger, 'saveBedMonitorAlarmForElderly: 无法找到睡眠带');
                    return;
                }

                elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
                if (!elderly || elderly.status == 0) {
                    self.ctx.clog.log(self.logger, 'saveBedMonitorAlarmForElderly: 无法找到老人');
                    return;
                }

                if(bedMonitor.tenantId.toString() != elderly.tenantId.toString()) {
                    self.ctx.clog.log(self.logger, 'saveBedMonitorAlarmForElderly: tenantId 不一致');
                    return;
                }
                tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], bedMonitor.tenantId);


                var content = tenant.other_config.pub_alarm_D3016_A0001 || '${发生时间}${房间床位}${老人姓名}离床未归!';
                var reg = /\${([^}]+)}/, result;
                while ((result = reg.exec(content)) != null) {
                    if (RegExp.$1 == "发生时间") {
                        content = content.replace(reg, self.ctx.moment().format('YYYY-MM-DD HH:mm:ss'));
                    } else if (RegExp.$1 == "房间床位") {
                        content = content.replace(reg, elderly.room_summary);
                    } else if (RegExp.$1 == "老人姓名") {
                        content = content.replace(reg, elderly.name);
                    }
                }

                var result = yield self.ctx.modelFactory().model_create(self.ctx.models['pub_alarm'], {
                    subject: 'pub_bedMonitor',
                    subjectId: bedMonitor._id,
                    subject_name: bedMonitor.name,
                    object: 'psn_elderly',
                    objectId: elderly._id,
                    object_name: elderly.name,
                    reason: DIC.D3016.LEAVE_BED_TIMEOUT,
                    content: content,
                    tenantId: bedMonitor.tenantId
                });

                return result.id;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    }
};