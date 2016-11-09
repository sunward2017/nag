/**
 * open Created by zppro on 16-11-09.
 * Target:使用第三方登录
 */
var rp = require('request-promise-native');
var openConfig = require('../pre-defined/open-config.json');

module.exports = {
    init: function (option) {
        var self = this;
        this.file = __filename;
        this.filename = this.file.substr(this.file.lastIndexOf('/') + 1);
        this.module_name = this.filename.substr(0, this.filename.lastIndexOf('.'));
        this.service_url_prefix = '/services/' + this.module_name.split('_').join('/');
        this.log_name = 'svc_' + this.filename;
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
                method: 'WeiXin$Connect',
                verb: 'get',
                url: this.service_url_prefix + "/WeiXin$Connect",
                handler: function (app, options) {
                    return function *(next) {
                        try {
                            var ret = yield rp({
                                url: 'https://open.weixin.qq.com/connect/qrconnect?appid=' + openConfig.weixin.appid + '&redirect_uri=' + openConfig.weixin.redirect_uri + '&response_type=code&scope=snsapi_login&state=STATE#wechat_redirect'
                            });
                            console.log(ret)
                            this.body = 'success'
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = e.message;
                        }
                        yield next;
                    };
                }
            },
            {
                method: 'WeiXin$ConnectCallback',
                verb: 'get',
                url: this.service_url_prefix + "/WeiXin$ConnectCallback",
                handler: function (app, options) {
                    return function *(next) {
                        try {

                            console.log(this.query)
                            var msg = JSON.stringify(this.query);
                            self.logger.info(msg);

                            yield app.mail.sendTest('微信网页授权结果', msg);
                            this.body = 'success'
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = e.message;
                        }
                        yield next;
                    };
                }
            }
        ];

        return this;
    }
}.init();
//.init(option);