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
    minzhong$doctor$login: function (username, password) {
        var self = this;
        return co(function* () {
            try {
                var self = this;
                var ret = yield rp({
                    method: 'POST',
                    url: externalSystemConfig.vital_sign_of_minzhong.api_url + '/doctor/login',
                    form: {target:username, password: password}
                });
                var len = ret.length-1; 
                ret = ret.substring(2,len); 
                ret = JSON.parse(ret).rows;
                return ret;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    },
    returnResult:function(json){
        console.log(json);
        return json;
    }
};