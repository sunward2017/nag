/**
 * Created by zppro on 17-06-29. 沃动科技
 */
var co = require('co');
var wodongConfig = require('../pre-defined/wodong-config.json');
var rp = require('request-promise-native');

module.exports = {
    init: function (ctx) {
        console.log('init sleep... ');
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

        var isProduction = ctx.conf.isProduction;
        // isProduction = true;//使用正式接口
        this.vmsUrl = isProduction ? wodongConfig.production.host + wodongConfig.production.vms : wodongConfig.develop.host + wodongConfig.develop.vms;
        this.smsUrl = isProduction ? wodongConfig.production.host + wodongConfig.production.sms : wodongConfig.develop.host + wodongConfig.develop.sms;

        console.log(this.filename + ' ready... ');
        return this;
    },
    vms: function (mobiles, title, sendContent) {
        var self = this;
        return co(function*() {
            try {
                var mobile = '';
                if (self.ctx._.isArray(mobiles)) {
                    mobile = mobiles.join();
                } else if (self.ctx._.isString(mobiles)) {
                    mobile = mobiles;
                }
                var url = self.vmsUrl + '&mobile=' + mobile + '&title=' + encodeURIComponent(title) + '&Vmsmsg=' + encodeURIComponent(sendContent);
                console.log(url);

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

                var sendRet = yield rp(url);
                console.log('sms sendRet:', sendRet);
                return self.ctx.wrapper.res.ret({url: url, result: sendRet});
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e);
            }

        }).catch(self.ctx.coOnError);
    },
    sms: function (mobiles, sendContent) {
        var self = this;
        return co(function*() {
            try {
                var mobile = '';
                if(self.ctx._.isArray(mobiles)){
                    mobile = mobiles.join();
                }
                var url = self.smsUrl + '&mobile=' + mobile + '&content=' + sendContent;
                var sendRet = yield rp(url);
                console.log('sms sendRet:',sendRet);
                return self.ctx.wrapper.res.ret({url: url, result: sendRet});
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e);
            }
        }).catch(self.ctx.coOnError);
    }
};