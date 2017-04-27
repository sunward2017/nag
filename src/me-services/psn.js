/**
 * Created by zppro on 17-4-7.
 * 养老平台移动接口 pension agency center
 */
var rp = require('request-promise-native');
var DIC = require('../pre-defined/dictionary-constants.json');
module.exports = {
    init: function (option) {
        var self = this;
        this.file = __filename;
        this.filename = this.file.substr(this.file.lastIndexOf('/') + 1);
        this.module_name = this.filename.substr(0, this.filename.lastIndexOf('.'));
        this.service_url_prefix = '/me-services/' + this.module_name.split('_').join('/');
        this.log_name = 'mesvc_' + this.filename;
        option = option || {};

        this.logger = require('log4js').getLogger(this.log_name);

        if (!this.logger) {
            console.error('logger not loaded in ' + this.file);
        }
        else {
            this.logger.info(this.file + " loaded!");
        }

        this.actions = [
            {
                method: 'robot$workitem$fetch',
                verb: 'post',
                url: this.service_url_prefix + "/robot/workitem/fetch",
                handler: function (app, options) {
                    return function *(next) {
                        try {
                            var robot_code = this.robot_code;
                            console.log("robot_code:", robot_code);
                            self.logger.info("robot_code:" +  (robot_code || 'not found'));
                            console.log("body:", this.request.body);
                            self.logger.info("body:" +  this.request.body);
                            var robot, tenantId, rooms, roomIds;
                            robot = yield app.modelFactory().model_one(app.models['pub_robot'], {
                                where:{
                                    status: 1,
                                    code: robot_code
                                }
                            });
                            if (!robot) {
                                this.body = app.wrapper.res.error({message: '无效的机器人编号'});
                                return;
                            }

                            // 通过机器人->房间->护理等级
                            tenantId = robot.tenantId;

                            rooms = yield app.modelFactory().model_query(app.models['psn_room'], {
                                select: '_id',
                                where: {
                                    // robots: {$elemMatch: {_id: robot._id}},
                                    robots: {$in: [robot._id]},
                                    tenantId: tenantId
                                }
                            });

                            roomIds = app._.map(rooms, function (o) {
                                return o._id;
                            });

                            console.log('roomsIds:', roomIds);

                            var today = app.moment(app.moment().format('YYYY-MM-DD') + " 00:00:00");

                            var rows = yield app.modelFactory().model_query(app.models['psn_nursingRecord'], {
                                select: 'exec_on executed_flag name description duration assigned_worker confirmed_flag confirmed_on workItemId voice_content remind_on elderlyId elderly_name type category',
                                where: {
                                    exec_on: { '$gte': today.toDate(), '$lt': today.add(1, 'days').toDate() },
                                    roomId: {$in: roomIds},
                                    tenantId: tenantId
                                },
                                sort: 'exec_on'
                            }).populate('assigned_worker','name').populate('workItemId','repeat_type').populate('elderlyId','avatar');
                            console.log(rows);

                            this.body = app.wrapper.res.rows(rows);
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            {
                method: 'robot$workitem$exec',
                verb: 'post',
                url: this.service_url_prefix + "/robot/workitem/exec",
                handler: function (app, options) {
                    return function *(next) {
                        try {
                            var robot_code = this.robot_code  || 'not found';
                            console.log("robot_code:", robot_code);
                            self.logger.info("robot_code:" +  (robot_code || 'not found'));
                            console.log("body:", this.request.body);
                            self.logger.info("body:" +  this.request.body);
                            var nursingRecordId = this.request.body.nursingRecordId;
                            console.log('nursingRecordId:', nursingRecordId);

                            var robot, tenantId, nursingRecord, roomIds;
                            robot = yield app.modelFactory().model_one(app.models['pub_robot'], {
                                where:{
                                    status: 1,
                                    code: robot_code
                                }
                            });
                            if (!robot) {
                                this.body = app.wrapper.res.error({message: '无效的机器人编号'});
                                return;
                            }

                            // 通过机器人->房间->护理等级
                            tenantId = robot.tenantId;
                            nursingRecord = yield app.modelFactory().model_read(app.models['psn_nursingRecord'], nursingRecordId);
                            if (!nursingRecord) {
                                this.body = app.wrapper.res.error({message: '无效的服务项目记录'});
                                return;
                            }

                            nursingRecord.executed_flag = true;
                            yield nursingRecord.save();

                            this.body = app.wrapper.res.default();
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            {
                method: 'robot$workitem$confirm',
                verb: 'post',
                url: this.service_url_prefix + "/robot/workitem/confirm",
                handler: function (app, options) {
                    return function *(next) {
                        try {
                            var robot_code = this.robot_code  || 'not found';
                            console.log("robot_code:", robot_code);
                            self.logger.info("robot_code:" +  (robot_code || 'not found'));
                            console.log("body:", this.request.body);
                            self.logger.info("body:" +  this.request.body);
                            var nursingRecordId = this.request.body.nursingRecordId;
                            console.log('nursingRecordId:', nursingRecordId);

                            var robot, tenantId, nursingRecord, roomIds;
                            robot = yield app.modelFactory().model_one(app.models['pub_robot'], {
                                where:{
                                    status: 1,
                                    code: robot_code
                                }
                            });
                            if (!robot) {
                                this.body = app.wrapper.res.error({message: '无效的机器人编号'});
                                return;
                            }

                            // 通过机器人->房间->护理等级
                            tenantId = robot.tenantId;
                            nursingRecord = yield app.modelFactory().model_read(app.models['psn_nursingRecord'], nursingRecordId);
                            if (!nursingRecord) {
                                this.body = app.wrapper.res.error({message: '无效的服务项目记录'});
                                return;
                            }

                            nursingRecord.confirmed_flag = true;
                            nursingRecord.confirmed_on = app.moment();

                            yield nursingRecord.save();

                            this.body = app.wrapper.res.default();
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            {
                method: 'robot$alarm$fetch',
                verb: 'post',
                url: this.service_url_prefix + "/robot/alarm/fetch",
                handler: function (app, options) {
                    return function *(next) {
                        try {
                            var robot_code = this.robot_code;
                            console.log("robot_code:", robot_code);
                            self.logger.info("robot_code:" +  (robot_code || 'not found'));
                            console.log("body:", this.request.body);
                            self.logger.info("body:" +  this.request.body);

                            this.body = yield app.pub_alarm_service.fetchBedMonitorAlarmsByRobot(robot_code);
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            {
                method: 'robot$alarm$close',
                verb: 'post',
                url: this.service_url_prefix + "/robot/alarm/close",
                handler: function (app, options) {
                    return function *(next) {
                        try {
                            var robot_code = this.robot_code || 'not found';
                            console.log("robot_code:", robot_code);
                            self.logger.info("robot_code:" + (robot_code || 'not found'));
                            console.log("body:", this.request.body);
                            self.logger.info("body:" + this.request.body);
                            var alarmId = this.request.body.id;
                            console.log('alarmId:', alarmId);

                            var robot, tenantId, alarm;
                            robot = yield app.modelFactory().model_one(app.models['pub_robot'], {
                                where: {
                                    status: 1,
                                    code: robot_code
                                }
                            });
                            if (!robot) {
                                this.body = app.wrapper.res.error({message: '无效的机器人编号'});
                                return;
                            }
                            alarm = yield app.modelFactory().model_read(app.models['pub_alarm'], alarmId);
                            if (!alarm) {
                                this.body = app.wrapper.res.error({message: '无效的警报'});
                                return;
                            }

                            yield app.pub_alarm_service.closeBedMonitorAlarm(alarm, robot._id, robot.code + ' ' + robot.name);

                            this.body = app.wrapper.res.default();
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            {
                method:'elderly$bloodpressure$fetch',
                verb:'post',
                url:this.service_url_prefix+"/elderly/bloodpressure/fetch",
                handler:function(app,options){
                    return function *(next){
                         try {
                            var elderlyId = this.elderlyId;
                             
                            self.logger.info("robot_code:" +  (elderlyId || 'not found'));
                             
                            self.logger.info("body:" +  this.request.body);

                            var elderly, tenantId;
                            elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
                            if (!elderly || elderly.status == 0) {
                                this.body = app.wrapper.res.error({ message: '无法找到老人!' });
                                yield next;
                                return;
                            }

                            var rows = yield app.modelFactory().model_query(app.models['psn_bloodPressure'], {
                                select: 'perform_on elderly_name systolic_blood_pressure diastolic_blood_pressure drugId blood_pressure_level current_symptoms',
                                where: {
                                    elderlyId: {$in: elderlyId},
                                    tenantId: tenantId
                                },
                                sort: 'perform_on'
                            }).populate('blood_pressure_level','name').populate('drugId','full_name');
                            this.body = app.wrapper.res.rows(rows);
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;    
                    }
                }
            },
            {
                method:''
            }
        ];

        return this;
    }
}.init();
//.init(option);