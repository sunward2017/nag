/**
 * Created by zppro on 16-8-28.
 */
var _ = require('underscore');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var DIC = require('../pre-defined/dictionary-constants.json');

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
        method: 'signinMedical',
        verb: 'post',
        url: this.service_url_prefix + "/medical/signin",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = self.getModelOption(this);
              // var passwordHash = crypto.createHash('md5').update(this.request.body.password).digest('hex');
              var user = yield app.modelFactory().one(modelOption.model_name, modelOption.model_path, {
                where: {
                  code: this.request.body.code,
                  password_hash: this.request.body.password_hash,
                  status: 1
                }, select: "name stop_flag type roles tenantId"
              });

              if (user) {

                if (user.stop_flag) {
                  this.body = app.wrapper.res.error({message: '该用户已停用!'});
                  yield next;
                  return;
                }
                if (_.findIndex(user.roles, DIC.D1001.MEDICAL) == -1 &&
                  _.findIndex(user.roles, DIC.D1001.SYSTEM) == -1 &&
                  _.findIndex(user.roles, DIC.D1001.SUPER) == -1) {
                  this.body = app.wrapper.res.error({message: '无效的用户角色!'});
                  yield next;
                  return;
                }
                if (user.type != DIC.D1000.TENANT) {
                  this.body = app.wrapper.res.error({message: '无效的用户类型!'});
                  yield next;
                  return;
                }
                /*
                 var objectId = new require('mongoose').Types.ObjectId().toString().substr(12);
                 console.log(objectId.length);

                 var nounce = crypto.createHash('md5').update(objectId).digest('hex');
                 console.log(nounce);
                 */
                var tenant = yield app.modelFactory().one('pub_tenant', '../models/pub/tenant', {
                  where: {
                    _id: user.tenantId
                  },
                  select: "_id name type active_flag certificate_flag validate_util limit_to"
                });

                //检查租户是否激活open_funcs
                if (!tenant.active_flag) {
                  this.body = app.wrapper.res.error({message: '该用户所属的【' + tenant.name + '】未激活!'});
                  yield next;
                  return;
                }

                //检查租户是否到期
                if (app.moment(tenant.validate_util).diff(app.moment()) < 0) {
                  //用户所属租户到期
                  this.body = app.wrapper.res.error({message: '该用户所属的【' + tenant.name + '】已经超过使用有效期!'});
                  yield next;
                  return;
                }

                tenant = tenant.toObject();//将bson转为json

                //日期字符 保证token当日有效
                // sign with default (HMAC SHA256)
                user = user.toObject();
                var token = jwt.sign(user, app.conf.secure.authSecret + ':' +  (new Date().f('yyyy-MM-dd').toString()));

                this.body = app.wrapper.res.ret(_.defaults(_.pick(user, '_id', 'name'), {
                  tenant: tenant,
                  token: token
                }));
              }
              else {
                this.body = app.wrapper.res.error({message: '无效的的登录名密码!'});
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
        method: 'validateTokenMedical',
        verb: 'post',
        url: this.service_url_prefix + "/medical/validateToken",
        handler: function (app, options) {
          return function *(next) {
            try {
              var user = jwt.verify(this.request.body.token, app.conf.secure.authSecret + ':' + (new Date().f('yyyy-MM-dd').toString()));
              // console.log('medical/validateToken:', user);
              this.body = app.wrapper.res.ret(user._id);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'signin',
        verb: 'post',
        url: this.service_url_prefix + "/signin",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = self.getModelOption(this);
              var passwordHash = crypto.createHash('md5').update(this.request.body.password).digest('hex');
              var user = yield app.modelFactory().one(modelOption.model_name, modelOption.model_path, {
                where: {
                  code: this.request.body.code,
                  password_hash: passwordHash,
                  status: 1
                }, select: "code name stop_flag type roles tenantId"
              });

              if (user) {

                if (user.stop_flag) {
                  this.body = app.wrapper.res.error({message: '该用户已停用!'});
                  yield next;
                  return;
                }
                  /*
                   var objectId = new require('mongoose').Types.ObjectId().toString().substr(12);
                   console.log(objectId.length);

                   var nounce = crypto.createHash('md5').update(objectId).digest('hex');
                   console.log(nounce);
                   */
                var tenant = null;
                var open_funcs;
                if (user.type == 'A0002') {
                  //普通租户
                  tenant = yield app.modelFactory().one('pub_tenant', '../models/pub/tenant', {
                    where: {
                      _id: user.tenantId
                    },
                    select: "_id name type active_flag certificate_flag validate_util limit_to open_funcs"
                  });

                  //检查租户是否激活open_funcs
                  if (!tenant.active_flag) {
                    this.body = app.wrapper.res.error({message: '该用户所属的【' + tenant.name + '】未激活!'});
                    yield next;
                    return;
                  }

                  //检查租户是否到期
                  if (app.moment(tenant.validate_util).diff(app.moment()) < 0) {
                    //用户所属租户到期
                    this.body = app.wrapper.res.error({message: '该用户所属的【' + tenant.name + '】已经超过使用有效期!'});
                    yield next;
                    return;
                  }

                  //考虑cookie大小，过滤open_funcs里的字段
                  tenant = tenant.toObject();//将bson转为json
                  open_funcs = app._.map(tenant.open_funcs, function (o) {
                    return app._.pick(o, 'func_id', 'expired_on');
                  });


                  delete tenant.open_funcs;
                }

                //日期字符 保证token当日有效
                // sign with default (HMAC SHA256)
                var token = jwt.sign(user, app.conf.secure.authSecret + ':' + (new Date().f('yyyy-MM-dd').toString()));

                console.log(token);

                this.body = app.wrapper.res.ret({
                  user: _.defaults(_.pick(user, '_id', 'code', 'name', 'type', 'roles'), {
                    tenant: tenant
                  }),
                  token: token,
                  open_funcs: open_funcs || []
                });
              }
              else {
                this.body = app.wrapper.res.error({message: '无效的的登录名密码!'});
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
        method: 'signout',
        verb: 'post',
        url: this.service_url_prefix + "/signout",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = self.getModelOption(this);
              this.body = app.wrapper.res.ret(yield app.modelFactory().create(modelOption.model_name, modelOption.model_path, this.request.body));
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
  },
  getModelOption: function (ctx) {
    var modelName = 'pub_user';
    var modelPath = '../models/' + modelName.split('_').join('/');
    return {model_name: modelName, model_path: modelPath};
  }
}.init();
//.init(option);