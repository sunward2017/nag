/**
 * Created by zppro on 16-8-28.
 * 操作多个model
 */
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
        method: 'create',
        verb: 'post',
        url: this.service_url_prefix + "/:model",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = app.getModelOption(this);
              this.body = app.wrapper.res.ret(yield app.modelFactory().create(modelOption.model_name, modelOption.model_path, this.request.body));
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'read',
        verb: 'get',
        url: this.service_url_prefix + "/:model/:_id",
        handler: function (app, options) {
          return function *(next) {
            try {
              var _id = this.params._id;
              var modelOption = app.getModelOption(this);
              if (_id == '$one') {
                //console.log(yield app.modelFactory().one(modelOption.model_name, modelOption.model_path, {
                //    where: this.query,
                //    select: '_id '
                //}));
                var theOne = yield app.modelFactory().one(modelOption.model_name, modelOption.model_path, {
                  where: this.query,
                  select: '_id '
                });
                if (theOne) {
                  this.body = app.wrapper.res.ret(theOne);
                }
                else {
                  this.body = app.wrapper.res.ret({_id: null});
                }
              }
              else {
                var instancePromise = app.modelFactory().read(modelOption.model_name, modelOption.model_path, _id);
                var instance = yield instancePromise;
                //if(instancePromise.schema.$$skipPaths){
                //    instance = app._.omit(instance.toObject(),instancePromise.schema.$$skipPaths);
                //}

                this.body = app.wrapper.res.ret(instance);
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
        method: 'update',
        verb: 'put',
        url: this.service_url_prefix + "/:model/:_id",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = app.getModelOption(this);
              var ret = yield app.modelFactory().update(modelOption.model_name, modelOption.model_path, this.params._id, this.request.body);
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
        method: 'delete',
        verb: 'delete',
        url: this.service_url_prefix + "/:model/:_id",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = app.getModelOption(this);
              this.body = app.wrapper.res.ret(yield app.modelFactory().delete(modelOption.model_name, modelOption.model_path, this.params._id));
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'list',
        verb: 'get',
        url: this.service_url_prefix + "/:model",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = app.getModelOption(this);
              this.body = app.wrapper.res.rows(yield app.modelFactory().query(modelOption.model_name, modelOption.model_path));
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'query',
        verb: 'post',
        url: this.service_url_prefix + "/:model/$query",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = app.getModelOption(this);

              console.log('query request.body:', this.request.body)
              //解析keyword字段
              var _matches_ = this.request.body.where._matches_;
              if(_matches_ && _matches_.keyword && _matches_.col_names && _matches_.col_names.length > 0) {
                var keywordReg = new RegExp(_matches_.keyword);
                this.request.body.where.$or = app._.map(_matches_.col_names, function (col_name) {
                  var keywordRegObj = {};
                  keywordRegObj[col_name] = keywordReg;
                  return keywordRegObj;
                });
                this.request.body.where._matches_ = undefined;
              }
              console.log('query request.body2:', this.request.body)

              var rows = app.modelFactory().query(modelOption.model_name, modelOption.model_path, this.request.body);
              var populates = this.request.body.populates;
              if (populates) {
                console.log('populates:');
                console.log(populates);
                if (app._.isArray(populates)) {
                  app._.each(populates, function (p) {
                    rows = rows.populate(p);
                  });
                } else {
                  rows = rows.populate(populates);
                }
              }
              this.body = app.wrapper.res.rows(yield rows);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'single',
        verb: 'post',
        url: this.service_url_prefix + "/:model/$single",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = app.getModelOption(this);
              var theOne = app.modelFactory().one(modelOption.model_name, modelOption.model_path, this.request.body);
              var populates = this.request.body.populates;
              if (populates) {
                console.log('single populates:');
                console.log(populates);
                if (app._.isArray(populates)) {
                  app._.each(populates, function (p) {
                    theOne = theOne.populate(p);
                  });
                } else {
                  theOne = theOne.populate(populates);
                }
              }
              this.body = app.wrapper.res.rows(yield theOne);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'totals',
        verb: 'post',
        url: this.service_url_prefix + "/:model/$totals",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = app.getModelOption(this);
              this.body = app.wrapper.res.ret({totals: (yield app.modelFactory().totals(modelOption.model_name, modelOption.model_path, this.request.body)).length});
              //this.set('page-totals', 10);response head set
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'bulkInsert',
        verb: 'post',
        url: this.service_url_prefix + "/:model/$bulkInsert",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = app.getModelOption(this);
              yield app.modelFactory().bulkInsert(modelOption.model_name, modelOption.model_path, this.request.body);
              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'bulkUpdate',
        verb: 'post',
        url: this.service_url_prefix + "/:model/$bulkUpdate",
        handler: function (app, options) {
          return function *(next) {
            try {
              var modelOption = app.getModelOption(this);
              console.log(this.request.body)
              var ret = yield app.modelFactory().bulkUpdate(modelOption.model_name, modelOption.model_path, this.request.body);
              if (ret.error) {
                this.body = app.wrapper.res.error(ret.error)
              }
              else {
                this.body = app.wrapper.res.default();
              }
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
  //, getModelOption: function (ctx) {
  //    var modelName = ctx.params.model.split('-').join('_');//将 A-B改为A_B
  //    var modelPath = '../models/' + modelName.split('_').join('/');
  //    return {model_name: modelName, model_path: modelPath};
  //}
}.init();
//.init(option);
