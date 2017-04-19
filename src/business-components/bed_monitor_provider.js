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
                console.log("getToken1");
                if (!self.ctx.cache.get(key)) {
                    console.log("getToken2");
                    var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                        select: 'session_id_hzfanweng',
                        where: {
                            open_id: gen_session_key
                        }
                    });
                    if (member) {
                        console.log('member exist ', member.session_id_hzfanweng);
                        self.ctx.cache.put(key, member.session_id_hzfanweng);
                        return member.session_id_hzfanweng;
                    }
                    console.log(1234);
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
    login: function (openId) {
        var self = this;
        return co(function* () {
            try {
                console.log("login again");
                self.logger.info('login =>', openId);
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: openId,
                        status: 1
                    }
                });
                if (member) {
                    self.logger.info('login member =>', member);
                    var token = yield self.getToken(member.open_id);
                    self.logger.info('login token =>', token);
                    var ret = yield self.userAuthenticate(member, token);
                    self.logger.info('login userAuthenticate ret =>', ret);
                    var session_id = yield self.getSession(openId);
                    self.logger.info('login session_id =>', session_id);
                    return session_id;
                }
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
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/userws/sessionIsExpired.json',
                    form: { sessionId: sessionId },
                });
                ret = JSON.parse(ret);
                if (ret.retCode == "fail") {
                    if (ret.retValue == "0x0020") {

                        return true;
                    }
                }
                return false;
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
    regist: function (openid, userInfo, tenantId) {
        var self = this;
        return co(function* () {
            try {
                console.log("openid:", openid);
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: openid,
                        status: 1,
                        tenantId: tenantId
                    }
                });
                if (member) {
                    return member;
                }
                console.log("no regist");
                var psd = self.ctx.crypto.createHash('md5').update('123456').digest('hex');
                member = yield self.ctx.modelFactory().model_create(self.ctx.models['het_member'], {
                    open_id: openid,
                    name: userInfo.nickName,
                    passhash: psd,
                    head_portrait: userInfo.avatarUrl,
                    tenantId: tenantId
                });
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/userws/userRegister.json',
                    form: {
                        userName: userInfo.nickName,
                        encryptedName: userInfo.nickName,
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
                }

                return member;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);

    },
    addDevice: function (deviceInfo, openid, tenantId) {
        var self = this;
        return co(function* () {
            try {
                var session_id = yield self.getSession(openid);
                var cpNewGender = null;
                var sex = null;
                var myDate = new Date();
                var nowYear = myDate.getFullYear();
                var birthYear;
                var age = deviceInfo.cpNewAge;
                var carePerson;
                var member;
                if (deviceInfo.sex == "男") {
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
                        name: deviceInfo.devId,
                        status: 1,
                        tenantId: tenantId
                    }
                });
                if (device) { //device existed
                    member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                        where: {
                            open_id: openid,
                            status: 1,
                            tenantId: tenantId
                        }
                    });
                    carePerson = yield self.ctx.modelFactory().model_create(self.ctx.models['het_memberCarePerson'], {
                        name: deviceInfo.cpNewName,
                        sex: sex,
                        care_by: member._id,
                        birthYear: birthYear,
                        bedMonitorId: device._id,
                        tenantId: tenantId
                    });
                    var setUserConcernPersonJson = {
                        sessionId: session_id,
                        cpNewName: deviceInfo.cpNewName,
                        cpNewAge: Math.round(Math.random() * 120),
                        cpNewGender: cpNewGender,
                        operation: deviceInfo.operator
                    };
                    setUserConcernPersonJson = JSON.stringify(setUserConcernPersonJson);
                    var cpInfo = {
                        setUserConcernPersonJson: setUserConcernPersonJson
                    };
                    var retCp = yield self.updateConcernPerson(cpInfo);//第三方 add user concern person
                    var retDev = {
                        deviceId: device.name,
                        carePersonName: carePerson.name
                    }
                    return retDev;
                }

                devInfo = {
                    devId: deviceInfo.devId,
                    name: "睡眠监测仪"
                };
                devInfo = JSON.stringify(devInfo);
                var sendData = {
                    sessionId: session_id,
                    type: deviceInfo.type,
                    operator: deviceInfo.operator,
                    device: devInfo
                };
                var retDevice = yield self.updateDevice(sendData);//第三方 add device

                var setUserConcernPersonJson = {
                    sessionId: session_id,
                    cpNewName: deviceInfo.cpNewName,
                    cpNewAge: Math.round(Math.random() * 120),
                    cpNewGender: cpNewGender,
                    operation: deviceInfo.operator
                };
                setUserConcernPersonJson = JSON.stringify(setUserConcernPersonJson);
                var cpInfo = {
                    setUserConcernPersonJson: setUserConcernPersonJson
                };
                var retCp = yield self.updateConcernPerson(cpInfo);//第三方 add user concern person

                device = yield self.ctx.modelFactory().model_create(self.ctx.models['pub_bedMonitor'], {
                    code: deviceInfo.deviceMac,
                    name: deviceInfo.devId,
                    tenantId: tenantId
                });
                member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: openid,
                        tenantId: tenantId
                    }
                });
                member_json = member.toObject();
                var row_bindingBedMonitors = [];
                var row_bindingBedMonitors = self.ctx.clone(member_json.bindingBedMonitors);
                row_bindingBedMonitors.push(device._id);
                member.bindingBedMonitors = row_bindingBedMonitors;
                yield member.save();
                carePerson = yield self.ctx.modelFactory().model_create(self.ctx.models['het_memberCarePerson'], {
                    name: deviceInfo.cpNewName,
                    sex: sex,
                    care_by: member._id,
                    birthYear: birthYear,
                    bedMonitorId: device._id,
                    tenantId: tenantId
                });
                var ret = {
                    deviceId: device.name,
                    carePersonName: carePerson.name
                }
                return ret;
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
            memberCarePerson.status = 0;
            yield memberCarePerson.save();
            return self.ctx.wrapper.res.default();
        }).catch(self.ctx.coOnError);
    },
    getDeviceDetails: function (openid, devId, tenantId) {
        var self = this;
        return co(function* () {
            var deviceInfo = new Array();
            var myDate = new Date();
            var nowYear = myDate.getFullYear();
            console.log(openid);
            var sessionId = yield self.getSession(openid);
            var sessionIsExpired = yield self.checkSessionIsExpired(sessionId);
            if (sessionIsExpired) {
                sessionId = yield self.login(openid);
            }
            var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                where: {
                    status: 1,
                    open_id: openid,
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
            var memberCarePerson = yield self.ctx.modelFactory().model_one(self.ctx.models['het_memberCarePerson'], {
                where: {
                    status: 1,
                    care_by: member._id,
                    bedMonitorId: device._id,
                    tenantId: tenantId
                }
            });
            deviceInfo = {
                deviceId: device.name,
                memberName: memberCarePerson.name,
                sex: memberCarePerson.sex,
                age: nowYear - Number(memberCarePerson.birthYear),
            }
            console.log('deviceInfo:', deviceInfo);
            return deviceInfo;
        }).catch(self.ctx.coOnError);
    },
    getDeviceInfo: function (openid, tenantId) {
        var self = this;
        return co(function* () {
            try {
                var carePersons = [];
                var nowYear = self.ctx.moment().format('YYYY');
                console.log("OPEINID:", openid);
                self.logger.info('openid:', openid);
                var sessionId = yield self.getSession(openid);
                var sessionIsExpired = yield self.checkSessionIsExpired(sessionId);
                if (sessionIsExpired) {
                    sessionId = yield self.login(openid);
                }
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
                self.logger.info('memberCarePersons:', memberCarePersons);
                for (var i = 0, len = memberCarePersons.length, memberCarePerson; i < len; i++) {
                    memberCarePerson = memberCarePersons[i];
                    // var device = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_bedMonitor'], {
                    //     where: {
                    //         status: 1,
                    //         _id:memberCarePersons[i].bedMonitorId
                    //     }
                    // });
                    self.logger.info('device name:' + memberCarePerson.bedMonitorId.name);
                    self.logger.info('getDeviceInfo sessionId:' + (sessionId || 'null or undefined'));
                    if (memberCarePerson.bedMonitorId.name) {
                        var sleepStatus = yield self.getSleepBriefReport(sessionId, memberCarePerson.bedMonitorId.name, tenantId);
                        var memberCarePerson = {
                            deviceName: memberCarePerson.bedMonitorId.name,
                            carePersonId: memberCarePerson._id,
                            carePersonName: memberCarePerson.name,
                            sex: memberCarePerson.sex,
                            age: Number(nowYear) - Number(memberCarePerson.birthYear),
                            sleepStatus: sleepStatus.ret,
                            portraitUrl: memberCarePerson.portrait
                        }
                        carePersons.push(memberCarePerson);
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
    changeCarePersonInfo: function (openid, memberCarePersonInfo, tenantId) {
        var self = this;
        return co(function* () {
            var myDate = new Date();
            var nowYear = myDate.getFullYear();
            var sex;
            var memberCarePerson = yield self.ctx.modelFactory().model_one(self.ctx.models['het_memberCarePerson'], {
                where: {
                    status: 1,
                    _id: memberCarePersonInfo.carePersonId
                }
            });
            if (memberCarePersonInfo.sex == "男") {
                sex = DIC.D1006.MALE;
            } else {
                sex = DIC.D1006.FEMALE;
            }
            if (memberCarePersonInfo.cpAge == null || memberCarePersonInfo.cpAge == "") {
                birthYear = 0;
            } else {
                birthYear = nowYear - Number(memberCarePersonInfo.cpAge);
            }
            console.log('+++++++', birthYear);
            memberCarePerson.name = memberCarePersonInfo.cpName;
            memberCarePerson.birthYear = birthYear;
            memberCarePerson.sex = sex;
            memberCarePerson.portrait = memberCarePersonInfo.portraitUrl
            yield memberCarePerson.save();
            return self.ctx.wrapper.res.default();
        }).catch(self.ctx.coOnError);
    },
    getSleepBriefReport: function (sessionId, devId, tenantId) {//报表
        var self = this;
        return co(function* () {
            try {
                var endTime = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD 12:00:00'));
                var startTime = self.ctx.moment(endTime).subtract(1, 'days');
                var ti = self.ctx.moment(startTime.format('YYYY-MM-DD  HH:MM:SS'));
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/devicews/getSleepBriefReport.json',
                    form: { sessionId: sessionId, devId: devId, startTime: startTime.unix() * 1000, endTime: endTime.unix() * 1000 }
                });
                ret = JSON.parse(ret);
                console.log(ret);
                console.log(typeof (ret.retValue));
                var value = ret.retValue;
                yield self.setDateReport(devId, tenantId, value);
                var evalution = value.evalution;
                if (evalution == '差') {
                    evalution = 40 + parseInt(Math.random() * 10);
                } else if (evalution == '一般') {
                    evalution = 60 + parseInt(Math.random() * 10);
                } else if (evalution == '良好') {
                    evalution = 70 + parseInt(Math.random() * 15);
                }
                else if (evalution == '优') {
                    evalution = 85 + parseInt(Math.random() * 10);
                } else {
                    evalution = 0;
                }
                if (value.fallAsleepTime == '0') {
                    ret = {
                        fallAsleepTime: 0,
                        sleepTime: 0,
                        deepSleepTime: 0,
                        evalution: evalution
                    }
                    return self.ctx.wrapper.res.ret(ret);
                }
                var fallAsleepTime = self.ctx.moment.unix(value.fallAsleepTime / 1000);
                var awakeTime = self.ctx.moment.unix(value.awakeTime / 1000);
                var sleepTime = awakeTime.diff(fallAsleepTime, 'hours');
                // var deepSleepTime = self.ctx.moment.unix(value.deepSleepTime).format('HH:MM:SS');
                console.log("sleepTime:", sleepTime);
                var deepSleepTime = (Number(value.deepSleepTime) / 3600000).toFixed(2);
                ret = {
                    fallAsleepTime: fallAsleepTime.format('HH:MM:SS'),
                    sleepTime: sleepTime,
                    deepSleepTime: deepSleepTime,
                    evalution: evalution
                }


                return self.ctx.wrapper.res.ret(ret);
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    getToken: function (uniqueId) {
        var self = this;
        return co(function* () {
            try {
                console.log(uniqueId);
                var ret = yield rp({
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/userws/getToken.json?uniqueId=' + uniqueId,
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
    userAuthenticate: function (member, token, authenticateTryTimes) {
        var self = this;
        authenticateTryTimes = authenticateTryTimes === undefined ? 1 : authenticateTryTimes;
        return co(function* () {
            try {
                self.logger.info('userAuthenticate');
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/userws/userAuthenticate.json',
                    form: {
                        token: token,
                        userName: member.name,
                        encryptedName: member.name,
                        encryptedPwd: member.passhash,
                        userType: "zjwsy"
                    }
                });
                ret = JSON.parse(ret);
                if (ret.retCode == 'success') {
                    self.logger.info('setSession:', member.open_id, ret.retValue);
                    self.setSession(member.open_id, ret.retValue.sessionId);
                    return self.ctx.wrapper.res.default();
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
    updateDevice: function (sendData, updateDevicetryTimes) {
        var self = this;
        updateDevicetryTimes = updateDevicetryTimes === undefined ? 1 : updateDevicetryTimes;
        return co(function* () {
            try {
                console.log(sendData);
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/devicews/updateDevice',
                    form: sendData
                });
                ret = JSON.parse(ret);
                console.log(ret.retValue);
                if (ret.retValue == "0x8005") {
                    console.log(ret.retValue);
                    console.log(sendData.openId);
                    var sessionId = yield self.login(sendData.openId);
                    sendData.sessionId = sessionId;
                    console.log(sendData);
                    if (updateDevicetryTimes === 0) {
                        return self.ctx.wrapper.res.error({ message: 'sessionId overdue' });
                    } else {
                        return self.updateDevice(sendData, 0);
                    }
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
    updateConcernPerson: function (sendData, tryTimes) {
        var self = this;
        tryTimes = tryTimes === undefined ? 1 : tryTimes;
        return co(function* () {
            try {
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/cpws/updateConcernPerson.json',
                    form: sendData
                });
                ret = JSON.parse(ret);
                if (ret.retValue == "0x8005") {
                    var sessionId = yield self.login(sendData.openId);
                    var setUserConcernPersonJson = JSON.parse(sendData.setUserConcernPersonJson);
                    setUserConcernPersonJson.sessionId = sessionId;
                    sendData.setUserConcernPersonJson = JSON.stringify(setUserConcernPersonJson);
                    if (tryTimes === 0) {
                        return self.ctx.wrapper.res.error({ message: 'sessionId overdue' });
                    } else {
                        return self.updateConcernPerson(sendData, 0);
                    }
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
    updateDeviceAttachState: function (sendData) {
        var self = this;
        return co(function* () {
            try {
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/devicews/updateDeviceAttachState',
                    form: sendData,
                    json: true
                });

                console.log(ret);
                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);

    },
    autoRegistLogin: function () {
        var self = this;
        return co(function* () {
            try {

                var tenants = yield self.ctx.modelFactory().model_query(self.ctx.models['pub_tenant'], {
                    select: 'name',
                    where: {
                        status: 1,
                        type: { '$in': ['A0001', 'A0002', 'A0003'] },
                        active_flag: true,
                        certificate_flag: true,
                        validate_util: { "$gte": self.ctx.moment() }
                    }
                });
                for (var i = 0; i < tenants.length; i++) {
                    var session = {
                        openid: tenants[i]._id
                    };
                    var userInfo = {
                        nickName: tenants[i].name
                    };

                    yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                        select: 'name',
                        where: {
                            status: 1,
                            type: { '$in': ['A0001', 'A0002', 'A0003'] }
                        }
                    });

                    var member = yield self.regist(session, userInfo, tenants[i]._id);
                    if (member) {
                        var token = yield self.getToken(member.open_id);
                        var ret = yield self.userAuthenticate(member, token);
                        console.log('login success:', ret);
                    }
                }
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    updatebedMonitorInfo: function () { // modified by zppro 2017-3.31
        var self = this;
        var timeout = 5 * 60 * 1000; // 离床5分钟报警
        var channelName = 'psn$bed_monitor';
        return co(function* () {
            try {
                if (self.isExecuting) {
                    console.log('back');
                    return;
                }
                self.isExecuting = true;
                var tenants = yield self.ctx.modelFactory().model_query(self.ctx.models['pub_tenant'], {
                    select: '_id name other_config',
                    where: {
                        status: 1,
                        type: { '$in': [DIC.D1002.MINI_PENSION_ORG, DIC.D1002.MIDDLE_SIZE_PENSION_ORG, DIC.D1002.LARGE_SCALE_ORG] },
                        active_flag: true,
                        certificate_flag: true,
                        validate_util: { '$gte': self.ctx.moment() }
                    }
                });

                // console.log('保证各个tenant作为member的session ', tenants);
                var tenantIds = self.ctx._.map(tenants, (o) => {
                    return o.id;
                });

                // 保证各个tenant作为member的session
                var tenantId;
                for (var i = 0, len = tenantIds.length; i < len; i++) {
                    tenantId = tenantIds[i];
                    var isRegist = yield self.checkIsRegist(tenantId);
                    if (!isRegist) {
                        var tenantMember = yield self.registByTenatId(tenantId);
                        if (tenantMember) {
                            var token = yield self.getToken(tenantMember.open_id);
                            yield self.userAuthenticate(tenantMember, token);
                        }
                    }
                    sessionId = yield self.getSession(tenantId);
                    console.log('sessionId:', sessionId);
                    var sessionIsExpired = yield self.checkSessionIsExpired(sessionId);
                    if (sessionIsExpired) {
                        sessionId = yield self.login(tenantId);
                    }
                }

                var bedMonitors = yield self.ctx.modelFactory().model_query(self.ctx.models['pub_bedMonitor'], {
                    select: 'name tenantId device_status',
                    where: {
                        status: 1,
                        tenantId: {
                            '$in': tenantIds
                        }
                    }
                });
                // console.log('获取全部监控睡眠带 ', bedMonitors);
                for (var i = 0; i < bedMonitors.length; i++) {
                    var bedMonitor = bedMonitors[i], key, oldBedStatus, bedStatus, sessionId;

                    //20170418-yrm-modify-satrt
                    var room = yield self.ctx.modelFactory().model_one(self.ctx.models['psn_room'], {
                        where: {
                            status: 1,
                            "bedMonitors.bedMonitorName": bedMonitor.name,
                            tenantId: bedMonitor.tenantId
                        }
                    });

                    if(room){
                        var room_bedMonitors = room.bedMonitors;
                        var bed_no = (self.ctx._.find(room.bedMonitors ,function(o) {
                            return o.bedMonitorId == bedMonitor._id;
                        })).bed_no;
                        var elderly = yield self.ctx.modelFactory().model_one(self.ctx.models['psn_elderly'],{
                            where:{
                                status:1,
                                "room_value.roomId": room._id,
                                "room_value.bed_no": bed_no,
                                tenantId: bedMonitor.tenantId
                            }
                        });

                        if(elderly){
                            if(elderly.bed_monitor_timeout){
                                timeout = elderly.bed_monitor_timeout;
                            }else{
                                var tenant = self.ctx._.findWhere(tenants, { _id: bedMonitor.tenantId });
                                if(tenant && tenant.other_config && tenant.other_config.psn_bed_monitor_timeout){
                                    timeout = tenant.other_config.psn_bed_monitor_timeout;
                                }
                            }
                        }
                    }
                    //20170418-yrm-modify-end

                    console.log('>>>>> 睡眠带 >>>>> ', bedMonitor.name);
                    self.logger.info('>>>>> 睡眠带 >>>>> ' + bedMonitor.name);
                    key = bedMonitor.name;
                    var ret = yield self.getLatestSmbPerMinuteRecord(sessionId, bedMonitor.name);
                    var isOffLine = ret.retValue == 'device_offline';
                    console.log('当前状态:', isOffLine ? '离线' : '在线');
                    self.logger.info('当前状态:' + (isOffLine ? '离线' : '在线'));
                    if (isOffLine) {
                        if (bedMonitor.device_status != DIC.D3009.OffLine) {
                            bedMonitor.device_status = DIC.D3009.OffLine;
                            yield bedMonitor.save();
                            console.log('睡眠带状态变化 在线 -> 离线');
                            self.logger.info('睡眠带状态变化 在线 -> 离线');
                            self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR.OFF_LINE, { bedMonitorName: bedMonitor.name });
                            self.ctx.cache.del(key);
                        }
                    } else {
                        if (bedMonitor.device_status != DIC.D3009.OnLine) {
                            bedMonitor.device_status = DIC.D3009.OnLine;
                            yield bedMonitor.save();
                            console.log('睡眠带状态变化 离线 -> 在线');
                            self.logger.info('睡眠带状态变化 离线 -> 在线');
                            self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR.ON_LINE, { bedMonitorName: bedMonitor.name });
                        }
                        oldBedStatus = self.ctx.cache.get(key);
                        bedStatus = {
                            tenantId: bedMonitor.tenantId,
                            isBed: ret.retValue.inBed
                        };
                        if (!oldBedStatus) {
                            // 旧状态不存在,表示刚启动
                            // 从当前开始计算离床时间
                            if (bedStatus.isBed) {
                                console.log('a系统启动或者刚报警 -> 在床 不做任何事情');
                                self.logger.info('a系统启动或者刚报警 -> 在床 不做任何事情');
                                self.ctx.cache.put(key, bedStatus);
                                self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR.COME, { bedMonitorName: bedMonitor.name });
                            } else {
                                console.log('a系统启动或者刚报警 -> 离床 重置报警');
                                self.logger.info('a系统启动或者刚报警 -> 离床 重置报警');
                                self.ctx.cache.put(key, bedStatus, timeout, function (k, v) {
                                    console.log('a离床超过时限报警 睡眠带:', k);
                                    self.logger.info('a离床超过时限报警 睡眠带:' + k);
                                    self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR.ALARM_LEAVE_TIMEOUT, {
                                        bedMonitorName: k,
                                        reason: DIC.D3016.LEAVE_BED_TIMEOUT
                                    });
                                    v.alarm = true;
                                    self.ctx.cache.put(k, v);
                                });
                                self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR.LEAVE, { bedMonitorName: bedMonitor.name });
                            }
                        } else {
                            if (!oldBedStatus.alarm) {
                                // 当前设备没有处于报警
                                if (oldBedStatus.isBed == bedStatus.isBed) {
                                    if (bedStatus.isBed == true) {
                                        console.log('b在床 -> 在床 不做任何事情');
                                        self.logger.info('b在床 -> 在床 不做任何事情');
                                    } else {
                                        // 离床 -> 离床 不做任何事情
                                        console.log('b离床 -> 离床 处于离床计时,不做任何事情');
                                        self.logger.info('b离床 -> 离床 处于离床计时,不做任何事情');
                                    }
                                } else {
                                    if (bedStatus.isBed == true) {
                                        console.log('b离床 -> 在床 时限内回来了');
                                        self.logger.info('b离床 -> 在床 时限内回来了');
                                        self.ctx.cache.put(key, bedStatus);
                                        self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR.COME, { bedMonitorName: bedMonitor.name });
                                    } else {
                                        console.log('b在床 -> 离床 开始离床计时');
                                        self.logger.info('b在床 -> 离床 开始离床计时');
                                        self.ctx.cache.put(key, bedStatus, timeout, function (k, v) {
                                            console.log('b离床超过时限报警 睡眠带:', k);
                                            self.logger.info('b离床超过时限报警 睡眠带:' + k);
                                            self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR.ALARM_LEAVE_TIMEOUT, {
                                                bedMonitorName: k,
                                                reason: DIC.D3016.LEAVE_BED_TIMEOUT
                                            });
                                            v.alarm = true;
                                            self.ctx.cache.put(k, v);
                                        });
                                        self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR.LEAVE, { bedMonitorName: bedMonitor.name });
                                    }
                                }
                            } else {
                                console.log('c 报警中');
                                self.logger.info('c 报警中');
                            }
                        }
                    }
                    console.log('--------------------------');
                    self.logger.info('--------------------------');
                }
                self.isExecuting = false;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e);
                self.isExecuting = false;
            }
        }).catch(self.ctx.coOnError);
    },
    closeAlarm: function (bedMonitorName) {
        var self = this;
        var channelName = 'psn$bed_monitor';
        return co(function* () {
            try {
                console.log('c 关闭报警');
                var key = bedMonitorName;
                self.ctx.cache.del(key);
                self.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR.COME, { bedMonitorName: bedMonitorName });
            } catch (e) {
                console.log(e);
                self.logger.error(e.message);
                self.isExecuting = false;
            }
        }).catch(self.ctx.coOnError);
    },
    getLatestSmbPerMinuteRecord: function (sessionId, devId) {
        var self = this;
        return co(function* () {
            try {
                console.log('getLatestSmbPerMinuteRecord:')
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/devicews/getLatestSmbPerMinuteRecord.json',
                    form: { sessionId: sessionId, devId: devId }
                });
                self.logger.info('b:' + ret);
                ret = JSON.parse(ret);
                self.logger.info('a:' + ret);
                return ret;
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
    registByTenatId: function (tenantId) {
        var self = this;
        return co(function* () {
            try {
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: tenantId,
                        status: 1
                    }
                });
                if (member) {
                    return member;
                }
                console.log("no regist");
                console.log(typeof (tenantId));
                var psd = self.ctx.crypto.createHash('md5').update('123456').digest('hex');
                member = yield self.ctx.modelFactory().model_create(self.ctx.models['het_member'], {
                    open_id: tenantId,
                    name: tenantId,
                    passhash: psd,
                    tenantId: tenantId
                });
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/userws/userRegister.json',
                    form: {
                        userName: tenantId,
                        encryptedName: tenantId,
                        encryptedPwd: psd,
                        userType: "zjwsy"
                    }
                });
                ret = JSON.parse(ret);
                if (ret.retCode == 'success') {
                    console.log(" sync regist success");
                    member.sync_flag_hzfanweng = true;
                    yield member.save();
                }

                return member;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);

    },
    registByQinKeShi: function (userInfo) {
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
                    url: externalSystemConfig.bed_monitor_provider.api_url + '/ECSServer/userws/userRegister.json',
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
    changeCarePersonPortrait: function (id, portraitUrl) {
        var self = this;
        return co(function* () {
            var memberCarePerson = yield self.ctx.modelFactory().model_one(self.ctx.models['het_memberCarePerson'], {
                where: {
                    status: 1,
                    _id: id
                }
            });
            memberCarePerson.portrait = portraitUrl;
            yield memberCarePerson.save();
            return self.ctx.wrapper.res.default();
        }).catch(self.ctx.coOnError);
    },
    getCarePersonInfoById: function (id) {
        var self = this;
        return co(function* () {
            try {
                var nowYear = self.ctx.moment().format('YYYY');
                var memberCarePerson = yield self.ctx.modelFactory().model_one(self.ctx.models['het_memberCarePerson'], {
                    where: {
                        status: 1,
                        _id: id,
                    }
                }).populate('bedMonitorId', 'name');
                if (memberCarePerson) {
                    var memberCarePerson = {
                        deviceName: memberCarePerson.bedMonitorId.name,
                        carePersonId: memberCarePerson._id,
                        carePersonName: memberCarePerson.name,
                        sex: memberCarePerson.sex,
                        age: Number(nowYear) - Number(memberCarePerson.birthYear),
                        portraitUrl: memberCarePerson.portrait
                    }
                }
                return self.ctx.wrapper.res.ret({ memberCarePerson: memberCarePerson });
            } catch (e) {
                console.log(e);
                self.logger.error(e);
                self.isExecuting = false;
            }
        }).catch(self.ctx.coOnError);
    },
    setDateReport: function (devId, tenantId, dateReport) {
        var self = this;
        return co(function* () {
            try {
                var endTime = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD 12:00:00'));
                var startTime = self.ctx.moment(endTime).subtract(1, 'days');
                var fallAsleepTime, awakeTime, bedTime, wakeUpTime;
                var turnOverFrequency, offBedFrequency;
                var deepSleepTime, lightSleepTime;

                var report = yield self.ctx.modelFactory().model_one(self.ctx.models['dwh_sleepDateReportOfHZFanWeng'], {
                    where: {
                        status: 1,
                        date_begin: startTime,
                        date_end: endTime,
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
                } else {
                    fallAsleepTime = self.ctx.moment.unix(dateReport.fallAsleepTime / 1000);
                    awakeTime = self.ctx.moment.unix(dateReport.awakeTime / 1000);
                    bedTime = self.ctx.moment.unix(dateReport.bedTime / 1000);
                    wakeUpTime = self.ctx.moment.unix(dateReport.wakeUpTime / 1000);
                    deepSleepTime = Number(dateReport.deepSleepTime) / 3600000;
                    lightSleepTime = Number(dateReport.lightSleepTime) / 3600000;
                    evalution = dateReport.evalution;
                    turnOverFrequency = dateReport.turnOverFrequency
                    offBedFrequency = dateReport.offBedFrequency
                }

                yield self.ctx.modelFactory().model_create(self.ctx.models['dwh_sleepDateReportOfHZFanWeng'], {
                    status: 1,
                    devId: devId,
                    date_begin: startTime,
                    date_end: endTime,
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
                    off_bed_frequency: offBedFrequency
                });
                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    getDateReport: function (devId, tenantId, openid, skip) {
        var self = this;
        return co(function* () {
            try {
                var device = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_bedMonitor'], {
                    where: {
                        name: devId,
                        status: 1,
                        tenantId: tenantId
                    }
                });
                var member = yield self.ctx.modelFactory().model_one(self.ctx.models['het_member'], {
                    where: {
                        open_id: openid,
                        status: 1,
                        tenantId: tenantId
                    }
                });
                var memberCarePerson = yield self.ctx.modelFactory().model_one(self.ctx.models['het_memberCarePerson'], {
                    where: {
                        care_by: member._id,
                        bedMonitorId: device._id,
                        status: 1,
                        tenantId: tenantId
                    }
                });
                var reports = yield self.ctx.modelFactory().model_query(self.ctx.models['dwh_sleepDateReportOfHZFanWeng'], {
                    where: {
                        check_in_time: { $gte: memberCarePerson.check_in_time },
                        status: 1,
                        devId: devId,
                        tenantId: tenantId
                    },
                    sort: { check_in_time: -1 }
                }, { limit: 5, skip: skip });

                var dateReports = [];//数据格式修改 封装
                for (var i = 0, length = reports.length; i < length; i++) {
                    var report = reports[i];
                    var date_end_result =  report.date_end.format("yyyy-MM-dd");
                    if (report.fallasleep_time) {
                        var light_sleep_duraion = Number(report.light_sleep_duraion).toFixed(2);
                        var deep_sleep_duraion = Number(report.deep_sleep_duraion).toFixed(2);
                        var dateReport = {
                            fallasleep_time:report.fallasleep_time.format("hh:mm:ss"),
                            awake_time:report.awake_time.format("hh:mm:ss"),
                            light_sleep_duraion:light_sleep_duraion,
                            deep_sleep_duraion:deep_sleep_duraion,
                            endTime:date_end_result,
                            turn_over_frequency:report.turn_over_frequency,
                            off_bed_frequency:report.off_bed_frequency
                        }
                        dateReports.push(dateReport);             
                    } else {
                         var dateReport = {
                            endTime:date_end_result
                            
                        }
                        dateReports.push(dateReport);
                    }
                }
                    return self.ctx.wrapper.res.rows(dateReports);
                }
            catch (e) {
                    console.log(e);
                    self.logger.error(e.message);
                }
            }).catch(self.ctx.coOnError);
    }






};
