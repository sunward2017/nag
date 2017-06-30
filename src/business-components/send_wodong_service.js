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
        this.shared_form = isProduction ? wodongConfig.production.shared_form: wodongConfig.develop.shared_form;

        console.log(this.filename + ' ready... ');
        return this;
    },
    vms: function (mobiles, title, sendContent) {
        var self = this;
        return co(function*() {
            try {
                var mobile = '', raw_mobiles = '';
                if (self.ctx._.isArray(mobiles)) {
                    raw_mobiles = mobiles.join();
                    mobiles = self.ctx._.filter(mobiles, (o)=>{
                        return self.ctx.util.isPhone(o);
                    });
                    mobile = mobiles.join();
                } else if (self.ctx._.isString(mobiles)) {
                    raw_mobiles = mobiles;
                    if(self.ctx.util.isPhone(o)){
                        mobile = mobiles;
                    }
                }

                if(!mobile){
                    return self.ctx.wrapper.res.error({message: '无效的号码:' + raw_mobiles});
                }

                var formData = self.ctx._.extend({
                    mobile: mobile,
                    title: title,
                    Vmsmsg: sendContent
                }, self.shared_form);


                var sendRet = yield rp({
                    method: 'POST',
                    url: self.vmsUrl,
                    form: formData,
                    json: true
                });
                console.log('---------------- vms sendRet', self.vmsUrl, formData.mobile, sendRet);
                return self.ctx.wrapper.res.ret({url: self.vmsUrl, formData: formData, result: sendRet});
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
                var mobile = '', raw_mobiles = '';
                if (self.ctx._.isArray(mobiles)) {
                    raw_mobiles = mobiles.join();
                    mobiles = self.ctx._.filter(mobiles, (o)=>{
                        return self.ctx.util.isPhone(o);
                    });
                    mobile = mobiles.join();
                } else if (self.ctx._.isString(mobiles)) {
                    raw_mobiles = mobiles;
                    if(self.ctx.util.isPhone(o)){
                        mobile = mobiles;
                    }
                }

                if(!mobile){
                    return self.ctx.wrapper.res.error({message: '无效的号码:' + raw_mobiles});
                }

                var formData = self.ctx._.extend({
                    mobile: mobile,
                    content: sendContent
                }, self.shared_form);

                var sendRet = yield rp({
                    method: 'POST',
                    url: self.smsUrl,
                    form: formData,
                    json: true
                });
                console.log('---------------- sms sendRet', self.smsUrl, formData.mobile, sendRet);
                return self.ctx.wrapper.res.ret({url: self.smsUrl, formData: formData, result: sendRet});
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e);
            }
        }).catch(self.ctx.coOnError);
    }
};