/**
 * Created by hcl on 17-3-14.
 */
var co = require('co');
var rp = require('request-promise-native');
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
        this.isExecuting = false;
        if (!this.logger) {
            console.error('logger not loaded in ' + this.file);
        }
        else {
            this.logger.info(this.file + " loaded!");
        }
        this.isExecuting = false;
        console.log(this.filename + ' ready... ');
        return this;
    },
    getSession: function (gen_session_key) {
        var self = this;
        return co(function* () {
            try {
                var key = self.CACHE_MODULE + self.CACHE_ITEM_SESSION + '@' + gen_session_key;
                if (!self.ctx.cache.get(key)) {
                    var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                        select: 'session_id_hzfanweng',
                        where: {
                            open_id: gen_session_key
                        }
                    });
                    if (member) {
                        self.ctx.cache.put(key, member.session_id_hzfanweng);
                        return member.session_id_hzfanweng;
                    }
                    return null;
                }
                return self.ctx.cache.get(key);
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    },
    setSession: function (gen_session_key, sessionId) {
        var self = this;
        return co(function* () {
            try {
                var key = self.CACHE_MODULE + self.CACHE_ITEM_SESSION + '@' + gen_session_key;
                self.ctx.cache.put(key, sessionId);
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: gen_session_key
                    }
                });
                member.session_id_hzfanweng = sessionId;
                yield member.save();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    checkSessionIsExpired: function (sessionId) {
        var self = this;
        return co(function* () {
            try {
                if (!sessionId || typeof sessionId !== 'string') {
                    return true;
                }

                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/userws/sessionIsExpired.json',
                    form: { sessionId: sessionId },
                });
                // console.log('checkSessionIsExpired:', ret);
                ret = JSON.parse(ret);
                if (ret.retCode == "success") {
                    if (ret.retValue == "0x0021") {
                        return false;
                    }
                }
                return true;
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
    registByQinKeShi: function (userInfo) {//亲可视注册
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
    regist: function (memberInfo) {//member:{openid,nickName,avatarUrl,tenantId}
        var self = this;
        return co(function* () {
            try {
                console.log("openid:", openid);
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: memberInfo.openid,
                        status: 1,
                        tenantId: memberInfo.tenantId
                    }
                });
                if (member) {
                    return self.ctx.wrapper.res.ret(member);
                }
                console.log("no regist");
                var psd = self.ctx.crypto.createHash('md5').update('123456').digest('hex');
                member = yield self.ctx.modelFactory().model_create(self.ctx.models['het_member'], {
                    open_id: memberInfo.openid,
                    name: memberInfo.nickName,
                    passhash: psd,
                    head_portrait: memberInfo.avatarUrl,
                    tenantId: memberInfo.tenantId
                });
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
                if (ret.retCode == 'success') {
                    console.log(" sync regist success");
                    member.sync_flag_hzfanweng = true;
                    yield member.save();
                    return self.ctx.wrapper.res.ret(member);
                }
                return self.ctx.wrapper.res.error({ message: ret.retValue })

            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);

    },
    getToken: function (uniqueId) {//亲可视token获取
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
    userAuthenticate: function (member, token, authenticateTryTimes) {//亲可视认证登陆 返回session
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
                    self.setSession(member.open_id, ret.retValue.sessionId);
                    return ret.retValue.sessionId;
                } else {
                    if (ret.retValue == '1') {//用户不存在 重新注册
                        var regist_status = yield self.registByQinKeShi(member);
                        console.log(regist_status);
                        if (regist_status.ret.registStatus == 'success') {//成功 重新登陆
                            if (authenticateTryTimes === 0) {
                                return self.ctx.wrapper.res.error({ message: 'regist fail again' });
                            } else {
                                return self.userAuthenticate(member, token, 0);
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
    getSleepBriefReport: function (sessionId, devId, tenantId) {//报表
        var self = this;
        return co(function* () {
            try {
                var endTime = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD 12:00:00'));
                var startTime = self.ctx.moment(endTime).subtract(1, 'days');
                var ti = self.ctx.moment(startTime.format('YYYY-MM-DD  HH:MM:SS'));
                var dateReport;
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_status.api_url + '/ECSServer/devicews/getSleepBriefReport.json',
                    form: { sessionId: sessionId, devId: devId, startTime: startTime.unix() * 1000, endTime: endTime.unix() * 1000 }
                });
                ret = JSON.parse(ret);
                console.log(ret);
                console.log(typeof (ret.retValue));
                return self.ctx.wrapper.res.ret(ret);
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    updateDevice: function (sendData, updateDevicetryTimes) {//亲可视设备增删改
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
    updateConcernPerson: function (sendData, tryTimes) {//亲可视关心的的人添加
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
    updateDeviceAttachState: function (sendData) {//亲可视设备绑定
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
    getLatestSmbPerMinuteRecord: function (sessionId, deviceName) {//亲可视获取设备当前最新的状态
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
    insureLoginSuccess: function (openid) {
        var self = this;
        return co(function* () {
            try {
                var sessionId = yield self.getSession(openid);
                var sessionIsExpired = yield self.checkSessionIsExpired(sessionId);//判断session是否过期        
                if (sessionIsExpired) {
                    var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                        where: {
                            open_id: openId,
                            status: 1
                        }
                    });
                    if (member) {
                        var token = yield self.getToken(member.open_id);
                        var ret = yield self.userAuthenticate(member, token);
                        return ret;
                    }
                    return self.ctx.wrapper.res.error({ message: '用户不存在' })
                }
                return sessionId;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return true;
            }

        }).catch(self.ctx.coOnError);
    }






};
