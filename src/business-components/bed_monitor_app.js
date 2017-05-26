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


    regist: function (memberInfo) {//member:{openid,unionid,nickName,avatarUrl,tenantId}
        var self = this;
        return co(function* () {
            try {
                console.log("openid:", self.openid);
                var psd = self.ctx.crypto.createHash('md5').update('123456').digest('hex');
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/userRegister.json',
                    form: {
                        userName: memberInfo.nickName,
                        encryptedName: memberInfo.nickName,
                        encryptedPwd: psd,
                        userType: "zjwsy"
                    }
                    // form: {userName:'testt',encryptedName:'testt',encryptedPwd:psd,userType:"zjwsy"}
                });
                ret = JSON.parse(ret);
                console.log(" sync regist success", ret);
                if (ret.retCode == 'success') {
                    console.log(" sync regist success");
                    var member = yield self.ctx.modelFactory().model_create(self.ctx.models['het_member'], {
                        open_id: memberInfo.openid,
                        name: memberInfo.nickName,
                        union_id: memberInfo.unionid,
                        phone: memberInfo.phone,
                        passhash: psd,
                        head_portrait: memberInfo.avatarUrl,
                        tenantId: memberInfo.tenantId,
                        sync_flag_hzfanweng: true,
                    });
                    return self.ctx.wrapper.res.ret({ message: '注册成功' });
                } else if (ret.retValue == '0x8001') {
                    return self.ctx.wrapper.res.error({ message: '用户已经注册' })
                }
                return self.ctx.wrapper.res.error({ message: '注册失败' })

            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);

    },
    login: function () {//uniqueId
        var self = this;
        return co(function* () {
            try {
                console.log(getToken);
                var ret = yield rp({
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/getToken.json?uniqueId=' + uniqueId,
                    json: true
                });
                console.log(ret);
                console.log(ret.retCode);
                if (ret.retCode == 'success') {
                    var ret = yield rp({
                        method: 'POST',
                        url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/userAuthenticate.json',
                        form: {
                            token: token,
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
                        return self.ctx.wrapper.res.ret(ret.retValue.sessionId);
                    } else {
                        if (ret.retValue == '1') {//用户不存在 重新注册
                            var memberInfo = {
                                nickName: member.name
                            }
                            var regist_status = yield self._registByQinKeShi(member);
                            console.log(regist_status);
                            if (regist_status.ret.registStatus == 'success') {//成功 重新登陆
                                if (authenticateTryTimes === 0) {
                                    return self.ctx.wrapper.res.error({ message: 'regist fail again' });
                                } else {
                                    return self._userAuthenticate(member, token, 0);
                                }
                            } else {//失败 返回
                                return self.ctx.wrapper.res.error({ message: 'regist fail' });
                            }
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
                sessionId = sessionIdRet.ret
                console.log("data from wx:", sessionId);
                var week = self.ctx.moment().format('dddd');
                var day = self.ctx.moment().day();
                var startTime = self.ctx.moment(startDay);
                var endTime = self.ctx.moment(endDay);
                var dayNum = endTime.diff(startTime,'day');
                console.log("data sunday wx:", startTime.format('YYYY-MM-DD'));
                console.log("data sunday wx:", dayNum);
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
                        tenantId: info.tenantId
                    }
                }).populate('bedMonitorId', 'name');;
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
    checkIsRegist: function (code) {
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
    _registByQinKeShi: function (userInfo) {//亲可视注册
        var self = this;
        return co(function* () {
            try {
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: userInfo.open_id,
                        status: 1
                    }
                });
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/userRegister.json',
                    form: {
                        userName: userInfo.name,
                        encryptedName: userInfo.name,
                        encryptedPwd: userInfo.passhash,
                        userType: "zjwsy"
                    }
                });
                ret = JSON.parse(ret);
                if (ret.retCode == 'success') {//注册成功
                    console.log(" sync regist success");
                    member.sync_flag_hzfanweng = true;
                    yield member.save();
                    return self.ctx.wrapper.res.ret({ registStatus: 'success' });
                } else {//注册失败
                    return self.ctx.wrapper.res.error({ message: ret.retValue });
                }

            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    },
    _getToken: function (uniqueId) {//亲可视token获取
        var self = this;
        return co(function* () {
            try {
                console.log(uniqueId);
                var ret = yield rp({
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/getToken.json?uniqueId=' + uniqueId,
                    json: true
                });
                console.log(ret);
                console.log(ret.retCode);
                return ret.retValue;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    _userAuthenticate: function (member, token, authenticateTryTimes) {//亲可视认证登陆 返回session
        var self = this;
        authenticateTryTimes = authenticateTryTimes === undefined ? 1 : authenticateTryTimes;
        return co(function* () {
            try {
                self.logger.info('userAuthenticate');
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/userAuthenticate.json',
                    form: {
                        token: token,
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
                    return self.ctx.wrapper.res.ret(ret.retValue.sessionId);
                } else {
                    if (ret.retValue == '1') {//用户不存在 重新注册
                        var memberInfo = {
                            nickName: member.name
                        }
                        var regist_status = yield self._registByQinKeShi(member);
                        console.log(regist_status);
                        if (regist_status.ret.registStatus == 'success') {//成功 重新登陆
                            if (authenticateTryTimes === 0) {
                                return self.ctx.wrapper.res.error({ message: 'regist fail again' });
                            } else {
                                return self._userAuthenticate(member, token, 0);
                            }
                        } else {//失败 返回
                            return self.ctx.wrapper.res.error({ message: 'regist fail' });
                        }
                    }
                    ;
                }
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
                var dateReport;
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/devicews/getSleepBriefReport.json',
                    form: { sessionId: sessionId, devId: devId, startTime: startTime.unix() * 1000, endTime: endTime.unix() * 1000 }
                });
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
    _updateDevice: function (sendData, updateDevicetryTimes) {//亲可视设备增删改
        var self = this;
        updateDevicetryTimes = updateDevicetryTimes === undefined ? 1 : updateDevicetryTimes;
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
                if (ret.retValue == '0x8005') {//登陆过期
                    console.log(ret.retValue);
                    console.log(sendData.openId);
                    var sessionId = yield self.insureLoginSuccess(sendData.openId);
                    sendData.sessionId = sessionId;
                    console.log(sendData);
                    if (updateDevicetryTimes === 0) {
                        return self.ctx.wrapper.res.error({ message: 'sessionId overdue' });
                    } else {
                        return self.updateDevice(sendData, 0);
                    }
                } else if (ret.retValue == '"unknown_device"') {
                    return self.ctx.wrapper.res.error({ message: 'unknown device' });
                }
                console.log(ret);
                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);

    },
    _updateConcernPerson: function (sendData, tryTimes) {//亲可视关心的的人添加
        var self = this;
        tryTimes = tryTimes === undefined ? 1 : tryTimes;
        return co(function* () {
            try {
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/cpws/updateConcernPerson.json',
                    form: sendData
                });
                ret = JSON.parse(ret);
                if (ret.retValue == "0x8005") {//登陆失败 session过期
                    var sessionId = yield self.insureLoginSuccess(sendData.openId);
                    var setUserConcernPersonJson = JSON.parse(sendData.setUserConcernPersonJson);
                    setUserConcernPersonJson.sessionId = sessionId;
                    sendData.setUserConcernPersonJson = JSON.stringify(setUserConcernPersonJson);
                    if (tryTimes === 0) {
                        return self.ctx.wrapper.res.error({ message: 'sessionId overdue' });
                    } else {
                        return self.updateConcernPerson(sendData, 0);
                    }
                } else if (ret.retValue == 'bad param') {
                    return self.ctx.wrapper.res.error({ message: 'bad param' });
                }
                console.log(ret);
                return self.ctx.wrapper.res.default();
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
                if (ret.retCode == 'success') {
                    return self.ctx.wrapper.res.default();
                }
                console.log(ret);
                return self.ctx.wrapper.res.error({ msg: 'attach fail' })
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
                            open_id: openid
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
                        var token = yield self.getToken(member.open_id);
                        var ret = yield self._userAuthenticate(member, token);
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
