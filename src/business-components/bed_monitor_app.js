/**
 * Created by hcl on 17-3-14.
 */
var co = require('co');
var rp = require('request-promise-native');
var _ = require('underscore');
var externalSystemConfig = require('../pre-defined/external-system-config.json');
var DIC = require('../pre-defined/dictionary-constants.json');
var socketServerEvents = require('../pre-defined/socket-server-events.json');

module.exports = {
    init: function (ctx) {
        console.log('init sleep... ');
        var self = this;
        this.file = __filename;
        this.filename = this.file.substr(this.file.lastIndexOf('/') + 1);
        this.log_name = 'bc_' + this.filename;
        this.ctx = ctx;
        this.CACHE_MODULE = 'N-BED-M-P-';
        this.CACHE_ITEM_SESSION = 'SESSIONID';
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


    regist: function (openId,requestInfo) {//member:{openid,unionid,nickName,avatarUrl,tenantId}
        var self = this;
        return co(function* () {
            try {
                var psd = self.ctx.crypto.createHash('md5').update('123456').digest('hex');
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/userRegister.json',
                    form: {
                        userName: requestInfo.userInfo.nickName,
                        encryptedName: requestInfo.userInfo.nickName,
                        encryptedPwd: psd,
                        userType: "zjwsy"
                    }
                    // form: {userName:'testt',encryptedName:'testt',encryptedPwd:psd,userType:"zjwsy"}
                });
                ret = JSON.parse(ret);
                console.log(" sync regist success", ret);
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                        where: {
                            open_id: openId,
                            status: 1,
                            tenantId:  requestInfo.userInfo.tenantId
                        }
                    });
                if (ret.retCode == 'success') {
                    console.log(" sync regist success");
                    if (member) {
                        return self.ctx.wrapper.res.ret(member);
                    }
                    member= yield self.ctx.modelFactory().model_create(self.ctx.models['het_member'], {
                        open_id: openId,
                        name:  requestInfo.userInfo.nickName,
                        union_id:  requestInfo.userInfo.unionid,
                        phone:  requestInfo.userInfo.phone,
                        passhash: psd,
                        head_portrait:  requestInfo.userInfo.avatarUrl,
                        tenantId:  requestInfo.userInfo.tenantId,
                        sync_flag_hzfanweng: true,
                    });
                    return self.ctx.wrapper.res.ret(member);
                } else if (ret.retValue == '0x8001') {
                    if (member) {
                        return self.ctx.wrapper.res.ret(member);
                    }
                   return self.ctx.wrapper.res.error({ message: '注册失败' })
                }
                return self.ctx.wrapper.res.error({ message: '注册失败' })

            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);

    },
    login: function (member) {//uniqueId
        var self = this;
        return co(function* () {
            try {
                console.log("getToken");
                var ret = yield rp({
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/getToken.json?uniqueId=' + member.open_id,
                    json: true
                });
                console.log("getToken:",ret);
                console.log(ret.retCode);
                if (ret.retCode == 'success') {
                    var ret = yield rp({
                        method: 'POST',
                        url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/userAuthenticate.json',
                        form: {
                            token: ret.retValue,
                            userName: member.name,
                            encryptedName: member.name,
                            encryptedPwd: member.passhash,
                            userType: "zjwsy"
                        }
                    });
                    ret = JSON.parse(ret);
                    if (ret.retCode == 'success') {//成功返回session
                        self.logger.info('setSession:', member.open_id, ret.retValue);
                        var key = self.CACHE_MODULE + self.CACHE_ITEM_SESSION + '@' + member.open_id;
                        self.ctx.cache.put(key, ret.retValue.sessionId);
                        yield self.ctx.modelFactory().model_update(self.ctx.models['het_member'],member._id, {session_id_hzfanweng:ret.retValue.sessionId});
                        return self.ctx.wrapper.res.ret(ret.retValue.sessionId);
                    } else {
                        if (ret.retValue == '1') {//用户不存在 重新注册
                                return self.ctx.wrapper.res.error({ message: '用户未注册' });                      
                        }

                    }
                }
                return ret.retValue;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    getWeekDatas: function (openid, info,endDay, startDay) {
        var self = this;
        return co(function* () {
            try {
                if (info.times == 0) {
                    var isThisweek = true;
                }
                var sessionIdRet = yield self._ensuresessionIdIsEffective(openid);
                if (!sessionIdRet.success) {
                    return sessionIdRet
                }
                //console.log("endTime", endTime);
                //console.log("startTime", startTime);
                var sessionId = sessionIdRet.ret
                console.log("data from wx:", info);
                var week = self.ctx.moment().format('dddd');
                var day = self.ctx.moment().day();
                var startTime = self.ctx.moment(startDay);
                var endTime = self.ctx.moment(endDay);
                var dayNum = endTime.diff(startTime,'day');
                console.log("data sunday wx:", startTime.format('YYYY-MM-DD'));
                console.log("data sunday wx:", dayNum);
                  var device = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_bedMonitor'], {
                    where: {
                        name: info.deviceName,
                        status: 1,
                        tenantId: info.tenantId
                    }
                });
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: openid,
                        status: 1,
                        tenantId: info.tenantId
                    }
                });

                var memberCarePerson = yield self.ctx.modelFactory().model_one(self.ctx.models['het_memberCarePerson'], {
                    where: {
                        care_by: member._id,
                        status: 1,
                        bedMonitorId:device._id,
                        tenantId: info.tenantId
                    }
                });
                //判断关心时间与最后时间是否一致，以关心时间为首要条件
                if (startTime.isSame(self.ctx.moment(memberCarePerson.check_in_time), 'day')) {
                    startTime = startTime;
                } else if (startTime.isAfter(self.ctx.moment(memberCarePerson.check_in_time), 'day')) {
                    startTime =startTime;
                } else {
                    startTime = self.ctx.moment(memberCarePerson.check_in_time);
                    var isBindingTime = true;
                }
                var reports = yield self.ctx.modelFactory().model_query(self.ctx.models['dwh_sleepDateReportOfHZFanWeng'], {
                    where: {
                        status: 1,
                        date_end: {
                            $gte: self.ctx.moment(self.ctx.moment(startTime).format('YYYY-MM-DD')),
                            $lt: self.ctx.moment(self.ctx.moment(endTime).add(1,'days').format('YYYY-MM-DD'))
                        },
                        devId: info.deviceName,
                        tenantId: info.tenantId
                    },
                    sort: { date_end: 1 }
                });
                var aweekTimes = [], lightSleepTimes = [], deepSleepTimes = [], maxHearts = [], minHearts = [];
                var maxHeart, minHeart, aweekTime, lightSleepTime, deepSleepTime, startTime, endTime, dataTime;
                //数据封装 库中有的话直接封装，没有则去第三方取回封装并插入数据库
                for (var j = 0; j < dayNum+1; j++) {
                    for (var i = 0, len = reports.length; i < len; i++) {
                        var report = reports[i];
                        if (self.ctx.moment(report.date_end).day() == j) {
                            var fallasleep_time = self.ctx.moment(report.fallasleep_time);
                            var awake_time = self.ctx.moment(report.awake_time);
                            aweekTime = awake_time.diff(fallasleep_time);
                            lightSleepTime = self.ctx.moment.duration(report.light_sleep_duraion).asHours();
                            deepSleepTime = self.ctx.moment.duration(report.deep_sleep_duraion).asHours();
                            var newAweekTime = self.ctx.moment.duration(Number(aweekTime) - Number(report.light_sleep_duraion) - Number(report.deep_sleep_duraion)).asHours().toFixed(1);
                            if (newAweekTime < 0.1) {
                                newAweekTime = null;
                            }
                            aweekTimes[j] = newAweekTime
                            lightSleepTimes[j] = lightSleepTime.toFixed(1) < 0.1 ? null : lightSleepTime.toFixed(1);
                            deepSleepTimes[j] = deepSleepTime.toFixed(1) <0.1 ? null : deepSleepTime.toFixed(1);
                            maxHearts[j] = report.max_heart_rate;
                            minHearts[j] = report.min_heart_rate;
                        }
                    }
                    if (!aweekTimes[j] && !lightSleepTimes[j] && !deepSleepTimes[j] && !maxHearts[j] && !minHearts[j]) {
                        var no_endTime = self.ctx.moment(self.ctx.moment().day(j).format('YYYY-MM-DD 12:00:00'));
                        var no_startTime = self.ctx.moment(self.ctx.moment().day(j - 1).format('YYYY-MM-DD 12:00:00'));
                        var dateReport = yield self._getSleepBriefReport(sessionId, info.deviceName, info.tenantId, no_endTime, no_startTime);
                        if (dateReport.lastEventOccTime == 0) {
                            aweekTimes[j] = null;
                            lightSleepTimes[j] = null;
                            deepSleepTimes[j] = null;
                            maxHearts[j] = null;
                            minHearts[j] = null;
                        } else {
                            yield self._setDateReport(info.deviceName, info.tenantId, dateReport, no_endTime, no_startTime);
                            var fallasleep_time = self.ctx.moment(dateReport.fallAsleepTime);
                            var awake_time = self.ctx.moment(dateReport.awakeTime);
                            aweekTime = awake_time.diff(fallasleep_time);
                            lightSleepTime = self.ctx.moment.duration(dateReport.lightSleepTime).asHours();
                            deepSleepTime = self.ctx.moment.duration(dateReport.deepSleepTime).asHours();
                            var newAweekTime = self.ctx.moment.duration(Number(aweekTime) - Number(report.lightSleepTime) - Number(report.deepSleepTime)).asHours().toFixed(1);
                            if (newAweekTime < 0.1) {
                                newAweekTime = null;
                            }
                            aweekTimes[j] = newAweekTime;
                            lightSleepTimes[j] =lightSleepTime.toFixed(1) < 0.1 ? null : lightSleepTime.toFixed(1);
                            deepSleepTimes[j] =deepSleepTime.toFixed(1) <0.1 ? null : deepSleepTime.toFixed(1);
                            maxHearts[j] = dateReport.maxHeartRate;
                            minHearts[j] = dateReport.minHeartRate;
                        }
                    }
                }
                var new_aweekTimes = _.compact(aweekTimes);
                var new_lightSleepTimes = _.compact(lightSleepTimes);
                var new_deepSleepTimes = _.compact(deepSleepTimes);
                var new_maxHearts = _.compact(maxHearts);
                var new_minHearts = _.compact(minHearts);
                if(new_aweekTimes.length==0&&new_lightSleepTimes==0&&new_deepSleepTimes==0&&new_maxHearts==0&&new_minHearts==0){
                        aweekTimes = new_aweekTimes;
                        lightSleepTimes =new_lightSleepTimes;
                        deepSleepTimes =new_deepSleepTimes;
                        maxHearts = new_maxHearts;
                        minHearts = new_minHearts;
                }
                var weekdays = {
                    aweekTimes: aweekTimes,
                    lightSleepTimes: lightSleepTimes,
                    deepSleepTimes: deepSleepTimes,
                    maxHearts: maxHearts,
                    minHearts: minHearts,
                    dateTime: {
                        startTime: startTime.format('MM-DD'),
                        endTime: endTime.format('MM-DD')
                    },
                    isBindingTime: isBindingTime,
                    isThisweek: isThisweek
                }
                return self.ctx.wrapper.res.ret(weekdays);;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return true;
            }

        }).catch(self.ctx.coOnError);
    },
    addDevice:function(deviceInfo,openid){//deviceInfo, openid, tenantId
        var self = this;
        return co(function* () {
            try {
                 var sessionIdRet = yield self._ensuresessionIdIsEffective(openid);
                if (!sessionIdRet.success) {
                    return sessionIdRet
                }
                //console.log("startTime", startTime);
                var sessionId = sessionIdRet.ret
                var cpNewGender = null;
                var sex = null;
                var myDate = new Date();
                var nowYear = myDate.getFullYear();
                var birthYear;
                var age = deviceInfo.deviceInfo.cpNewAge;
                var carePerson;
                var member;
                if (deviceInfo.deviceInfo.sex == "男") {
                    cpNewGender = 0;
                    sex = DIC.D1006.MALE;
                } else {
                    cpNewGender = 1;
                    sex = DIC.D1006.FEMALE;
                }
                if (age == null || age == "") {
                    birthYear = 0;
                } else {
                    birthYear = nowYear - Number(age);
                }
                var device = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_bedMonitor'], {
                    where: {
                        name: deviceInfo.deviceInfo.devId,
                        status: 1,
                        tenantId: deviceInfo.deviceInfo.tenantId
                    }
                });
                if (device) { //device existed
                     console.log("device existed");
                    member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                        where: {
                            open_id: openid,
                            status: 1,
                            tenantId: deviceInfo.deviceInfo.tenantId
                        }
                    });
                    var setUserConcernPersonJson = {
                        sessionId: sessionId,
                        cpNewName: deviceInfo.deviceInfo.cpNewName,
                        cpNewAge: Math.round(Math.random() * 120),
                        cpNewGender: cpNewGender,
                        operation: deviceInfo.deviceInfo.operator
                    };
                    setUserConcernPersonJson = JSON.stringify(setUserConcernPersonJson);
                    var cpInfo = {
                        setUserConcernPersonJson: setUserConcernPersonJson
                    };
                    var retCp = yield self._updateConcernPerson(cpInfo);//第三方 add user concern person
                    console.log("绑定关心的人:",retCp);
                    if(retCp.success){
                        console.log('attach back:',retCp.success);
                        carePerson = yield self.ctx.modelFactory().model_create(self.ctx.models['het_memberCarePerson'], {
                            name: deviceInfo.deviceInfo.cpNewName,
                            sex: sex,
                            care_by: member._id,
                            birthYear: birthYear,
                            bedMonitorId: device._id,
                            status:1,
                            cid_hz_hzfanweng:retCp.ret.cid,
                            tenantId: deviceInfo.deviceInfo.tenantId
                        });
                        var updateDeviceAttachState = {
                            sessionId:sessionId,
                            cpId:retCp.ret.cid,
                            cpName:deviceInfo.deviceInfo.cpNewName,
                            devIdTypeMapJson:JSON.stringify([{"devId":deviceInfo.deviceInfo.devId,"devType":"Mattress"}]),
                            operator:"attach"
                        };
                        var attachRet = yield self._updateDeviceAttachState(updateDeviceAttachState);
                        console.log('attach back:',attachRet);
                        if(attachRet.success){
                            return attachRet;
                        }
                        return self.ctx.wrapper.res.error({ message: '绑定失败' });
                    }
                    return self.ctx.wrapper.res.error({ message: '绑定失败' });       
                }

                devInfo = {
                    devId: deviceInfo.deviceInfo.devId,
                    name: "睡眠监测仪"
                };
                devInfo = JSON.stringify(devInfo);
                var sendData = {
                    sessionId: sessionId,
                    type: deviceInfo.deviceInfo.type,
                    operator: deviceInfo.deviceInfo.operator,
                    device: devInfo
                };
                var retDevice = yield self._updateDevice(sendData);//第三方 add device
                if(retDevice.success){
                    var setUserConcernPersonJson = {
                        sessionId: sessionId,
                        cpNewName: deviceInfo.deviceInfo.cpNewName,
                        cpNewAge: Math.round(Math.random() * 120),
                        cpNewGender: cpNewGender,
                        operation: deviceInfo.deviceInfo.operator
                    };
                    setUserConcernPersonJson = JSON.stringify(setUserConcernPersonJson);
                    var cpInfo = {
                        setUserConcernPersonJson: setUserConcernPersonJson
                    };
                    var retCp = yield self._updateConcernPerson(cpInfo);//第三方 add user concern person
                    if(retCp.success){
                        device = yield self.ctx.modelFactory().model_create(self.ctx.models['pub_bedMonitor'], {
                            code: deviceInfo.deviceInfo.deviceMac,
                            name: deviceInfo.deviceInfo.devId,
                            tenantId: deviceInfo.deviceInfo.tenantId
                        });
                        member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                            where: {
                                open_id: openid,
                                tenantId: deviceInfo.deviceInfo.tenantId
                            }
                        });
                        member_json = member.toObject();
                        var row_bindingBedMonitors = [];
                        var row_bindingBedMonitors = self.ctx.clone(member_json.bindingBedMonitors);
                        row_bindingBedMonitors.push(device._id);
                        member.bindingBedMonitors = row_bindingBedMonitors;
                        yield member.save();
                        carePerson = yield self.ctx.modelFactory().model_create(self.ctx.models['het_memberCarePerson'], {
                            name: deviceInfo.deviceInfo.cpNewName,
                            sex: sex,
                            care_by: member._id,
                            birthYear: birthYear,
                            bedMonitorId: device._id,
                            status:1,
                            cid_hz_hzfanweng:retCp.ret.cid,
                            tenantId: deviceInfo.deviceInfo.tenantId
                        });
                        var updateDeviceAttachState = {
                                sessionId:sessionId,
                                cpId:retCp.ret.cid,
                                cpName:deviceInfo.deviceInfo.cpNewName,
                                devIdTypeMapJson:JSON.stringify([{"devId":deviceInfo.deviceInfo.devId,"devType":"Mattress"}]),
                                operator:"attach"
                            };
                            var attachRet = yield self._updateDeviceAttachState(updateDeviceAttachState);
                            console.log('attach back:',attachRet);
                            if(attachRet.success){
                                return attachRet;
                            }
                            return self.ctx.wrapper.res.error({ message: '绑定失败' });
                    }
                    return self.ctx.wrapper.res.error({ message: '绑定失败' });
                }
                return retDevice;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    checkIsAttach: function (openId, deviceId, tenantId) {
        var self = this;
        return co(function* () {
            try {
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: openId,
                        status: 1
                    }
                });
                console.log('member:', member)
                var device = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_bedMonitor'], {
                    where: {
                        name: deviceId,
                        status: 1,
                        tenantId: tenantId
                    }
                });
                console.log('device:', device);
                if (!device) {
                    return false;
                }
                var carePerson = yield self.ctx.modelFactory().model_one(self.ctx.models['het_memberCarePerson'], {
                    where: {
                        status: 1,
                        care_by: member._id,
                        bedMonitorId: device._id,
                        tenantId: tenantId
                    }
                });
                console.log(carePerson);
                if (carePerson) {
                    return true;
                }
                return false;

            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    removeDevice: function (openid, devId, tenantId) {
        var self = this;
        return co(function* () {
            var sessionIdRet = yield self._ensuresessionIdIsEffective(openid);
                if (!sessionIdRet.success) {
                    return sessionIdRet
            }
            var sessionId = sessionIdRet.ret
            var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                where: {
                    status: 1,
                    open_id: openid,
                    tenantId: tenantId
                }
            });
            console.log(member);
            var device = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_bedMonitor'], {
                where: {
                    status: 1,
                    name: devId,
                    tenantId: tenantId,
                }
            });
            console.log(device);
             var memberCarePerson = yield self.ctx.modelFactory().model_one(self.ctx.models['het_memberCarePerson'], {
                where: {
                    status: 1,
                    care_by: member._id,
                    bedMonitorId: device._id,
                    tenantId: tenantId
                }
            });
            var updateDeviceAttachState = {
                sessionId:sessionId,
                cpId:memberCarePerson.cid_hz_hzfanweng,
                devIdTypeMapJson:JSON.stringify([{"devId":devId,"devType":"Mattress"}]),
                operator:"deattach"
            };
            var attachRet = yield self._updateDeviceAttachState(updateDeviceAttachState);
            console.log('attach back:',attachRet);
            if(attachRet.success){
                memberCarePerson.status = 0;
                yield memberCarePerson.save();
                return attachRet;
            }
            return attachRet;
        }).catch(self.ctx.coOnError);
    },
    getAttachDevice: function (openid, tenantId) {
        var self = this;
        return co(function* () {
            try {
                var carePersons = [];
                var dateReport;
                var nowYear = self.ctx.moment().format('YYYY');
                var endTime = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD 12:00:00'));
                var startTime = self.ctx.moment(endTime.subtract(1,'day').format('YYYY-MM-DD 12:00:00'));
                console.log("endTime:", endTime);
                console.log("startTime:", startTime);
                self.logger.info('openid:', openid);
                var sessionIdRet = yield self._ensuresessionIdIsEffective(openid);
                if (!sessionIdRet.success) {
                    return sessionIdRet
                }
                var sessionId = sessionIdRet.ret
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        status: 1,
                        open_id: openid,
                        tenantId: tenantId
                    }
                });
                console.log(member);
                var memberCarePersons = yield self.ctx.modelFactory().model_query(self.ctx.models['het_memberCarePerson'], {
                    where: {
                        status: 1,
                        care_by: member._id,
                    }
                }).populate('bedMonitorId', 'name');
                console.log('memberCarePersons:', memberCarePersons);
                self.logger.info('memberCarePersons:', memberCarePersons);
                for (var i = 0, len = memberCarePersons.length, memberCarePerson; i < len; i++) {
                    var memberCarePerson = memberCarePersons[i];
                    self.logger.info('device name:' + memberCarePerson.bedMonitorId.name);
                    self.logger.info('getDeviceInfo sessionId:' + (sessionId || 'null or undefined'));
                    if (memberCarePerson.bedMonitorId.name) {
                        var reportRet = yield self._getSleepBriefReport(sessionId, memberCarePerson.bedMonitorId.name, tenantId, endTime, startTime);
                        if(reportRet){
                            yield self._setDateReport( memberCarePerson.bedMonitorId.name, tenantId, reportRet,endTime, startTime);
                            var evalution = reportRet.evalution;
                            if (reportRet.fallAsleepTime != '0') {
                                var fallAsleepTime = self.ctx.moment(reportRet.fallAsleepTime);
                                var awakeTime = self.ctx.moment(reportRet.awakeTime);
                                var bedTime = self.ctx.moment(reportRet.bedTime);
                                var wakeUpTime = self.ctx.moment(reportRet.wakeUpTime);
                                var sleepTime = awakeTime.diff(fallAsleepTime, 'hours');      
                                var newAweekTime = self.ctx.moment.duration(Number(awakeTime.diff(fallAsleepTime)) - Number(reportRet.lightSleepTime) - Number(reportRet.deepSleepTime)).asHours();
                                // var deepSleepTime = self.ctx.moment.unix(value.deepSleepTime).format('HH:MM:SS');
                                var deepSleepTime = self.ctx.moment.duration(reportRet.deepSleepTime).asHours();
                                var lightSleepTime = self.ctx.moment.duration(reportRet.lightSleepTime).asHours();
                                var sleepTime = parseFloat(deepSleepTime) + parseFloat(lightSleepTime);
                                var maxHeartRate = reportRet.maxHeartRate;
                                var minHeartRate = reportRet.minHeartRate;
                                var heartTime = Number(maxHeartRate + minHeartRate) / 2
                                evalution = (Number(sleepTime) * 8.5 + Number(deepSleepTime) * 8.5 - (Number(reportRet.offBedFrequency) / 5) * 8.5 + (Number(sleepTime) - Number(deepSleepTime) - Number(lightSleepTime)) * 8.5).toFixed(0);
                                dateReport = {
                                    fallAsleepTime: self.ctx.moment(fallAsleepTime).format('HH:mm'),
                                    awakeTime: self.ctx.moment(awakeTime).format('HH:mm'),
                                    sleepTime: sleepTime,
                                    deepSleepTime: deepSleepTime.toFixed(1),
                                    lightSleepTime: lightSleepTime.toFixed(1),
                                    evalution: evalution,
                                    turn_over_frequency: reportRet.turnOverFrequency,
                                    off_bed_frequency: reportRet.offBedFrequency,
                                    bodyMoveFrequency: reportRet.bodyMoveFrequency,
                                    heartTime: heartTime,
                                    bed_time: self.ctx.moment(bedTime).format('HH:mm'),
                                    wakeup_time: self.ctx.moment(wakeUpTime).format('HH:mm')
                                }
                            }

                            var memberCarePerson = {
                                deviceName: memberCarePerson.bedMonitorId.name,
                                carePersonId: memberCarePerson._id,
                                carePersonName: memberCarePerson.name,
                                sex: memberCarePerson.sex,
                                age: Number(nowYear) - Number(memberCarePerson.birthYear),
                                sleepStatus: dateReport,
                                portraitUrl: memberCarePerson.portrait
                            }
                            carePersons.push(memberCarePerson);
                        }
                    }
                }
                console.log('memberCarePersons:', carePersons);
                return self.ctx.wrapper.res.rows(carePersons);
            } catch (e) {
                console.log(e);
                self.logger.error(e);
                self.isExecuting = false;
            }
        }).catch(self.ctx.coOnError);
    },
    _checkIsRegist: function (code) {
        var self = this;
        return co(function* () {
            try {
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: code,
                        status: 1
                    }
                });
                return !!member;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    _getSleepBriefReport: function (sessionId, devId, tenantId, endTime, startTime) {//报表
        var self = this;
        return co(function* () {
            try {
                // var endTime = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD 12:00:00'));
                // var startTime = self.ctx.moment(endTime).subtract(1, 'days');
                // var ti = self.ctx.moment(startTime.format('YYYY-MM-DD  HH:MM:SS'));
               console.log("_getSleepBriefReport");
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/devicews/getSleepBriefReport.json',
                    form: { sessionId: sessionId, devId: devId, startTime: startTime.unix() * 1000, endTime: endTime.unix() * 1000 }
                });
                console.log(ret);
                ret = JSON.parse(ret);
                console.log(typeof (ret.retValue));
                return ret.retValue;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    _updateDevice: function (sendData) {//亲可视设备增删改
        var self = this;
        return co(function* () {
            try {
                console.log(sendData);
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/devicews/updateDevice',
                    form: sendData
                });
                ret = JSON.parse(ret);
                console.log(ret.retValue);
                if (ret.retCode == 'success') {//绑定成功
                   return self.ctx.wrapper.res.ret(ret.retValue); 
                } else{
                    return self.ctx.wrapper.res.error({ message: ret.retValue });
                }
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);

    },
    _updateConcernPerson: function (sendData) {//亲可视关心的的人添加
        var self = this;
        return co(function* () {
            try {
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/cpws/updateConcernPerson.json',
                    form: sendData
                });
                ret = JSON.parse(ret);
                if (ret.retCode == "success") {//添加成功
                    return self.ctx.wrapper.res.ret(ret.retValue);
                } else if (ret.retValue == 'bad param') {
                    return self.ctx.wrapper.res.error({ message: 'bad param' });
                }
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);

    },
    _updateDeviceAttachState: function (sendData) {//亲可视设备绑定
        var self = this;
        return co(function* () {
            try {
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/devicews/updateDeviceAttachState',
                    form: sendData,
                    json: true
                });
                console.log("attach qinkeshi:",ret);
                console.log(typeof ret);
                if (ret.retCode == 'success') {
                    return self.ctx.wrapper.res.default();
                }
                return self.ctx.wrapper.res.error({ msg: '操作失败' })
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);

    },
    _getLatestSmbPerMinuteRecord: function (sessionId, deviceName) {//亲可视获取设备当前最新的状态
        var self = this;
        return co(function* () {
            try {
                // console.log('getLatestSmbPerMinuteRecord:')
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/devicews/getLatestSmbPerMinuteRecord.json',
                    form: { sessionId: sessionId, devId: deviceName }
                });
                // self.logger.info('b:' + ret);
                ret = JSON.parse(ret);
                if (ret.retCode == 'success') {
                    return self.cxt.wrapper.res.ret(ret.retValue);
                }
                return ret;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    },
    _ensuresessionIdIsEffective: function (openid) {
        var self = this;
        return co(function* () {
            try {
                var key = self.CACHE_MODULE + self.CACHE_ITEM_SESSION + '@' + openid;
                var sessionId = self.ctx.cache.get(key);
                if (!sessionId || typeof sessionId !== 'string') {//缓存中不存在或出错
                    var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                        select: 'session_id_hzfanweng',
                        where: {
                            open_id: openid,
                            status:1
                        }
                    });
                    if (member.session_id_hzfanweng) {
                        self.ctx.cache.put(key, member.session_id_hzfanweng);
                        sessionId = member.session_id_hzfanweng;
                    } else {
                        return self.ctx.wrapper.res.error({ message: '用户不存在' })
                    }
                }
                var effectiveValue = yield rp({//是否过期
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/sessionIsExpired.json',
                    form: { sessionId: sessionId },
                });
                effectiveValue = JSON.parse(effectiveValue);
                if (effectiveValue.retCode == "success") {
                    if (effectiveValue.retValue == "0x0021") {
                        return self.ctx.wrapper.res.ret(sessionId);
                    }
                } else {
                    var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                        where: {
                            open_id: openid,
                            status: 1
                        }
                    });
                    console.log('member:', member);
                    if (member) {
                        console.log('sssss:', ret);
                        //var token = yield self.getToken(member.open_id);
                        //var ret = yield self._userAuthenticate(member, token);
                       var ret = yield self.login(member);
                        console.log('sssss:', ret);
                        return ret
                    }
                    return self.ctx.wrapper.res.error({ message: '用户不存在' })
                }
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return true;
            }

        }).catch(self.ctx.coOnError);
    },
    _setDateReport: function (devId, tenantId, dateReport, endTime, startTime) {
        var self = this;
        return co(function* () {
            try {
                var fallAsleepTime, awakeTime, bedTime, wakeUpTime;
                var turnOverFrequency, offBedFrequency, bodyMoveFrequency, maxHeartRate, minHeartRate;
                var deepSleepTime, lightSleepTime;

                var report = yield self.ctx.modelFactory().model_one(self.ctx.models['dwh_sleepDateReportOfHZFanWeng'], {
                    where: {
                        status: 1,
                        date_begin: {
                            $gte: self.ctx.moment(startTime.format('YYYY-MM-DD')),
                            $lt: self.ctx.moment(self.ctx.moment(startTime).add(1, 'day').format('YYYY-MM-DD'))
                        },
                        date_end: {
                            $gte: self.ctx.moment(endTime.format('YYYY-MM-DD')),
                            $lt: self.ctx.moment(self.ctx.moment(endTime).add(1, 'day').format('YYYY-MM-DD'))
                        },
                        devId: devId,
                        tenantId: tenantId
                    }
                });

                var device = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_bedMonitor'], {
                    where: {
                        status: 1,
                        name: devId,
                        tenantId: tenantId
                    }
                });
                if (report) {
                    return self.ctx.wrapper.res.default();
                }
                if (dateReport.fallAsleepTime == '0') {
                    fallAsleepTime = undefined;
                    awakeTime = undefined;
                    bedTime = undefined;
                    wakeUpTime = undefined;
                    deepSleepTime = undefined;
                    lightSleepTime = undefined;
                    evalution = undefined;
                    turnOverFrequency = undefined;
                    offBedFrequency = undefined;
                    bodyMoveFrequency = undefined;
                    maxHeartRate = undefined;
                    minHeartRate = undefined;
                } else {

                    fallAsleepTime = self.ctx.moment(dateReport.fallAsleepTime);
                    awakeTime = self.ctx.moment(dateReport.awakeTime);
                    bedTime = self.ctx.moment(dateReport.bedTime);
                    wakeUpTime = self.ctx.moment(dateReport.wakeUpTime);
                    deepSleepTime = dateReport.deepSleepTime;
                    lightSleepTime = dateReport.lightSleepTime;
                    evalution = dateReport.evalution;
                    turnOverFrequency = dateReport.turnOverFrequency;
                    offBedFrequency = dateReport.offBedFrequency;
                    bodyMoveFrequency = dateReport.bodyMoveFrequency;
                    maxHeartRate = dateReport.maxHeartRate;
                    minHeartRate = dateReport.minHeartRate;
                }

                yield self.ctx.modelFactory().model_create(self.ctx.models['dwh_sleepDateReportOfHZFanWeng'], {
                    status: 1,
                    devId: devId,
                    date_begin: self.ctx.moment(self.ctx.moment(startTime).format('YYYY-MM-DD 12:00:00')),
                    date_end: self.ctx.moment(self.ctx.moment(endTime).format('YYYY-MM-DD 12:00:00')),
                    bed_time: bedTime,
                    wakeup_time: wakeUpTime,
                    fallasleep_time: fallAsleepTime,
                    awake_time: awakeTime,
                    deep_sleep_duraion: deepSleepTime,
                    light_sleep_duraion: lightSleepTime,
                    turn_over_frequency: turnOverFrequency,
                    bedMonitorId: device._id,
                    tenantId: tenantId,
                    evalution: evalution,
                    off_bed_frequency: offBedFrequency,
                    body_move_frequency: bodyMoveFrequency,
                    max_heart_rate: maxHeartRate,
                    min_heart_rate: minHeartRate
                });
                console.log(self.ctx.moment(endTime).format('YYYY-MM-DD'));
                console.log(self.ctx.moment(startTime).format('YYYY-MM-DD'));
                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },






};
