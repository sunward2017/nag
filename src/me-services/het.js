/**
 * Created by hcl on 17-3-14.
 * 健康助手移动接口 health center
 */
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
             self.logger.info("body:" , {a:'bbb',c:'ddd'});
         }

         this.actions = [
             {
                 method: 'sleepUser$regist',//regist useing
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepUser$regist",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             var member = yield app.bed_monitor_status.regist(this.openid || this.request.body.openid, this.request.body.userInfo, this.request.body.tenantId);
                             console.log("regist reback");		
				    console.log("member:",member);	
                             if (member) {
                                 console.log("getToken");
                                 var token = yield app.bed_monitor_status.getToken(member.open_id);
                                 var ret = yield app.bed_monitor_status.userAuthenticate(member, token);
                                 this.body = app.wrapper.res.default();
                             }
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$addDevice',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$addDevice",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body);
                             var ret = yield app.bed_monitor_status.addDevice(this.request.body.deviceInfo, this.openid || this.request.body.openid, this.request.body.tenantId);
                             console.log("add device back");
                             // console(ret);
                             console.log("-------------------------");
                             this.body = app.wrapper.res.ret(ret);
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$getAttachDevice',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$getAttachDevice",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body);
                             self.logger.info('this.request.body:', this.openid);
                             this.body = yield app.bed_monitor_status.getDeviceInfo(this.openid || this.request.body.openid,this.request.body.tenantId);
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$removeDevice',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$removeDevice",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body)
                             var ret = yield app.bed_monitor_status.removeDevice(this.openid || this.request.body.openid, this.request.body.deviceId, this.request.body.tenantId);
                             console.log("ret++++:", ret);
                             this.body = app.wrapper.res.ret(ret);
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$getDeviceDetails',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$getDeviceDetails",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body)
                             var ret = yield app.bed_monitor_status.getDeviceDetails(this.openid || this.request.body.openid, this.request.body.devId, this.request.body.tenantId);
                             console.log("ret++++:", ret);
                             this.body = app.wrapper.res.ret(ret);
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$changeCarePersonInfo',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$changeCarePersonInfo",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body)
                             var ret = yield app.bed_monitor_status.changeCarePersonInfo(this.openid || this.request.body.openid, this.request.body.memberCarePersonInfo, this.request.body.tenantId);
                             console.log("ret++++:", ret);
                             this.body = app.wrapper.res.ret(ret);
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$isAttach',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$isAttach",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body)
                             var ret = yield app.bed_monitor_status.checkIsAttach(this.openid || this.request.body.openid, this.request.body.deviceId, this.request.body.tenantId);
                             console.log("isAttach:", ret);
                             this.body =  app.wrapper.res.ret({isAttach:ret});
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$test',
                 verb: 'get',
                 url: this.service_url_prefix + "/sleepDevicews/test",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             // console.log("body:");
                             //console.log(this.request.body)"oYoT70Fw1BPC-oTUI7-Q-NiHKOq8"
                             var userInfo ={
                                 nickName:'1e1r',
                                 avatarUrl:'http://wx.qlogo.cn/mmopen/vi_32/DYAIOgq83ertBQu5V7dyLVFFXHyal599vF8WbFmuRLQ3hDeRibAia2F3icO0IjxvznIEvdAtNjicibGHhaacHiapdz7Q/0',
                                 devId:'A1100123',
                                 deviceMac:'A0E6F8855129F',
                                 cpNewName:'HCL',
                                 sex:'女',
                                 cpNewAge:'59',
                                 tenantId:'58f5e9add2b7261ba8af97b8',
                                 //openid :'oYoT70Fw1BPC-oTUI7-Q-NiHKOq8'
                                 openid :'oYoT70Fw1BPC-oTUI7-Q-123456'
                             }
                             var deviceInfo={
                                 devId:'A1100065',
                                 deviceMac:'A0E6F88550DF2',
                                 cpNewName:'HCC',
                                 sex:'女',
                                 cpNewAge:'59',
                                 type:'Mattress',
                                 operator:'add'

                             }
                             var openid = 'oYoT70Fw1BPC-oTUI7-Q-NiHKOq8'
                            
                             var tenantId = '58cf896e2f0f0a21b026d973'
                             var deviceId = 'A1100123'
                             var member = {
                                 name:'1l42o',
                                 passhash:'e10adc3949ba59abbe56e057f20f883e',
                             }
					
                             var token='47843085';
                             console.log("test:");
                             var ret = yield app.bed_monitor_app.regist(userInfo);
                              
                             console.log("test recall:", ret);
                             this.body = "ok";
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$changeCarePersonPortrait',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$changeCarePersonPortrait",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body)
                             var ret = yield app.bed_monitor_status.changeCarePersonPortrait(this.request.body.id,this.request.body.portraitUrl);
                             console.log("changeCarePersonPortrait:", ret);
                             this.body =  app.wrapper.res.default();
                            
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$getCarePersonInfoById',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$getCarePersonInfoById",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body)
                             this.body= yield app.bed_monitor_status.getCarePersonInfoById( this.request.body.cid);    
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$getDateReport',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$getDateReport",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body)
                             this.body =  yield app.bed_monitor_status.getDateReport(this.openid || this.request.body.openid,this.request.body.devId,this.request.body.tenantId,this.request.body.skip,this.request.body.lastDate);
                            
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
              {
                 method: 'sleepDevicews$getTodayReport',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$getTodayReport",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body)
                            var ret =  yield app.bed_monitor_status.getTodayReport(this.openid || this.request.body.openid,this.request.body.devId,this.request.body.tenantId);
                             console.log('返回的数据日报：',ret);
                             this.body = ret;
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$getReportByDate',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews$getReportByDate",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body)
                             this.body =  yield app.bed_monitor_status.getReportByDate(this.request.body.devId,this.request.body.tenantId,this.request.body.targetdDate);
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'sleepDevicews$getWeekDatas',
                 verb: 'post',
                 url: this.service_url_prefix + "/sleepDevicews/getWeekDatas",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body);
                             console.log(this.request.body.endTime);
                             console.log(this.request.body.startTime);
                            //console.log("test:",this.openid);
                             var deviceId = 'A1200006';
                              var tenantId = '58f5e9add2b7261ba8af97b8';
                             var ret = yield app.bed_monitor_app.getWeekDatas(this.openid || this.request.body.openid,this.request.body.info,this.request.body.endTime,this.request.body.startTime);
                             console.log("test recall:", ret);
                             this.body = ret;
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                 method: 'bedMonitor$regist',//regist useing
                 verb: 'post',
                 url: this.service_url_prefix + "/bedMonitor/regist",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             var registRet = yield app.bed_monitor_app.regist(this.openid || this.request.body.openid, this.request.body);
                             console.log("regist reback");		
				             console.log("member:",registRet);	
                             if (registRet.success) {
                                 console.log("自动登陆");
                                 this.body = yield app.bed_monitor_app.login(registRet.ret);
                             }
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             },
             {
                
                 method: 'bedMonitor$addDevice',
                 verb: 'post',
                 url: this.service_url_prefix + "/bedMonitor/addDevice",
                 handler: function (app, options) {
                     return function *(next) {
                         try {
                             console.log("body:");
                             console.log(this.request.body);
                             var ret = yield app.bed_monitor_app.addDevice(this.request.body, this.openid || this.request.body.openid);
                             console.log("add device back");
                             // console(ret);
                             console.log("-------------------------");
                             this.body = app.wrapper.res.ret(ret);
                         } catch (e) {
                             self.logger.error(e.message);
                             this.body = app.wrapper.res.error(e);
                         }
                         yield next;
                     };
                 }
             }
         ];
         return this;
     }
 }.init();
