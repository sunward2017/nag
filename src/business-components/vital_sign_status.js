/**
 * Created by zppro on 17-06-05.
 */
var co = require('co');
var rp = require('request-promise-native');
var DIC = require('../pre-defined/dictionary-constants.json');
var externalSystemConfig = require('../pre-defined/external-system-config.json');

module.exports = {
    init: function (ctx) {
        console.log('init sleep... ');
        var self = this;
        this.file = __filename;
        this.filename = this.file.substr(this.file.lastIndexOf('/') + 1);
        this.log_name = 'bc_' + this.filename;
        this.ctx = ctx;
        this.CACHE_MODULE = 'VS-';
        this.CACHE_ITEM_MINGZHONG = 'MINGZHONG_ACCESS_TOKEN';
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
    _mingzhong$doctor$getAccessToken: function (account_name, password) {
        var self = this;
        return co(function*() {
            try {
                var key = self.CACHE_MODULE + self.CACHE_ITEM_MINGZHONG + '@' + account_name;
                var accessToken = self.ctx.cache.get(key);
                if (!accessToken) {
                    if(!password) {
                        var doctorAccount = yield self.ctx.modelFactory().model_one(self.ctx.models['het_doctorAccountOfMingZhong'], {
                            select: 'password',
                            where: {
                                name: account_name
                            }
                        });
                        if (!doctorAccount) {
                            throw new Error('无效的账号:' + account_name);
                        }
                        password = doctorAccount.password;
                    }
                    yield self._mingzhong$doctor$login(account_name, password);
                    accessToken = self.ctx.cache.get(key)
                }
                return accessToken;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    },
    _mingzhong$doctor$login: function (account_name, password) {
        var self = this;
        return co(function* () {
            try {
                var key = self.CACHE_MODULE + self.CACHE_ITEM_MINGZHONG + '@' + account_name;
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.vital_sign_of_minzhong.api_url + '/doctor/login',
                    form: {target: account_name, password: password}
                });
                ret = JSON.parse(ret);
                if (ret.errcode) {
                    throw new Error(ret.errcode + ':' + ret.errmsg);
                }
                self.ctx.cache.put(key, ret.access_token, ret.expires_in);
                var accessToken = self.ctx.cache.get(key);
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    },
    _mingzhong$doctor$serviceList: function (account_name, accessToken) {
        var self = this;
        return co(function* () {
            try {
                var self = this;
                if(!accessToken) {
                    accessToken = yield self._mingzhong$doctor$getAccessToken(account_name);
                }
                console.log('-------------333345')
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.vital_sign_of_minzhong.api_url + '/doctor/serviceList',
                    form: {access_token: accessToken}
                });
                var rows = JSON.parse(ret);
                console.log('_mingzhong$doctor$serviceList:',rows);
                if (rows.errcode) {
                    throw new Error(rows.errcode + ':' + rows.errmsg);
                }
                return rows;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    },
    _mingzhong$doctor$serviceMemberSearch: function (account_name, accessToken) {
        var self = this;
        return co(function* () {
            try {
                if(!accessToken) {
                    accessToken = yield self._mingzhong$doctor$getAccessToken(account_name);
                }
                var elderlyUsers = [];
                var serviceList = yield self._mingzhong$doctor$serviceList(account_name, accessToken);
                for(var i=0, len = serviceList.length;i<len;i++) {
                    var ret = yield rp({
                        method: 'POST',
                        url: externalSystemConfig.vital_sign_of_minzhong.api_url + '/doctor/serviceMemberSearch',
                        form: {access_token: accessToken, serviceid: serviceList[i].serviceid, limit: 500}
                    });

                    var rows = JSON.parse(ret);
                    if (rows.errcode) {
                        throw new Error(rows.errcode + ':' + rows.errmsg);
                    }
                    elderlyUsers = elderlyUsers.concat(rows);
                }
                return elderlyUsers;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    },
    mingzhong$update_elderly_users: function (tenantId, doctorAccountId) {
        var self = this;
        return co(function*() {
            try {

                var elderlyUsers, doctorAccount;
                if (doctorAccountId) {
                    doctorAccount = yield self.ctx.modelFactory().model_read(self.ctx.models['het_doctorAccountOfMingZhong'], doctorAccountId);
                    var elderlyUsers = yield self._mingzhong$doctor$serviceMemberSearch(doctorAccount.name);
                    doctorAccount.elderly_users = elderlyUsers;
                    yield doctorAccount.save();
                } else {
                    var doctorAccounts = yield self.ctx.modelFactory().model_query(self.ctx.models['het_doctorAccountOfMingZhong'], {
                        select: 'name',
                        where: {
                            status: 1,
                            tenantId: tenantId
                        }
                    });
                    for (var i = 0, len = doctorAccounts.length; i < len; i++) {
                        doctorAccount = doctorAccounts[i];
                        var elderlyUsers = yield self._mingzhong$doctor$serviceMemberSearch(doctorAccount.name);
                        doctorAccount.elderly_users = elderlyUsers;
                        yield doctorAccount.save();
                    }
                }
                // 将所有老人用户与本地的老人映射起来
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    }
};