/**
 * Created by zppro on 17-4-7.
 * 养老平台移动接口 pension agency center
 */
var rp = require('request-promise-native');
var DIC = require('../pre-defined/dictionary-constants.json');
var D0103 = require('../pre-defined/dictionary.json')['D0103'];
var D3026 = require('../pre-defined/dictionary.json')['D3026'];
var D3040 = require('../pre-defined/dictionary.json')['D3040'];
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
    } else {
      this.logger.info(this.file + " loaded!");
    }

    this.actions = [
      /************************字典相关*****************************/
      {
          method: 'd',
          verb: 'get',
          url: this.service_url_prefix + "/d/:key",
          handler: function (app, options) {
              return function * (next) {
                  try {
                      var rows = [];
                      app._.each(app.dictionary.pairs[this.params.key.toUpperCase()],function(v,k) {
                          if (k != 'name') {
                              rows.push({label: v.name, value: k})
                          }
                      })
                      this.body = app.wrapper.res.rows(rows);
                  } catch (e) {
                      self.logger.error(e.message);
                      this.body = app.wrapper.res.error(e);
                  }
                  yield next;
              };
          }
      },
      {
        method: 'elderly$bloodpressure$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/elderly/bloodpressure/fetch",
        handler: function (app, options) {
          return function*(next) {
            try {
              var elderlyId = this.elderlyId;

              self.logger.info("robot_code:" + (elderlyId || 'not found'));

              self.logger.info("body:" + this.request.body);

              var elderly, tenantId;
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }

              var rows = yield app.modelFactory().model_query(app.models['psn_bloodPressure'], {
                select: 'perform_on elderly_name systolic_blood_pressure diastolic_blood_pressure drugId blood_pressure_level current_symptoms',
                where: {
                  elderlyId: {$in: elderlyId},
                  tenantId: tenantId
                },
                sort: 'perform_on'
              }).populate('blood_pressure_level', 'name').populate('drugId', 'full_name');
              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'elderly$bloodpressure$save',
        verb: 'post',
        url: this.service_url_prefix + '/elderly/bloodpressure/save',
        handler: function (app, options) {
          return function*(next) {
            try {
              var elderlyId = this.elderlyId;
              var tenantId = this.tenantId;
              var drugId = this.drugId;
              var systolic_blood_pressure = this.systolic_blood_pressure; // 收缩压
              var diastolic_blood_pressure = this.diastolic_blood_pressure; // 舒张压
              var blood_pressure_level = this.blood_pressure_level;
              var current_symptoms = this.current_symptoms;

              var elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }
              ;
              var drug = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugDirectory'], tenantId);
              if (!drug || drug.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到在用药品!'});
                yield next;
                return;
              }

              yield self.ctx.modelFactory().model_create(self.ctx.models['psn_bloodPressure'], {
                elderlyId: elderly.elderlyId,
                elderly_name: elderly.elderly_name,
                systolic_blood_pressure: systolic_blood_pressure, // 收缩压
                diastolic_blood_pressure: diastolic_blood_pressure, // 舒张压
                drugId: drugId,
                blood_pressure_level: blood_pressure_level,
                current_symptoms: current_symptoms, //当前症状
                tenantId: tenantId
              });

              this.body = app.wrapper.res.default();

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'mini_unit$fetch',
        verb: 'get',
        url: this.service_url_prefix + "/mini_unit/fetch",
        handler: function (app, options) {
          return function *(next) {
            try {
              // var values = app.dictionary.pairs['D3026'];

              var rows = [];
              app._.each(app.dictionary.pairs['D3026'], function (v, k) {
                if (k != 'name') {
                  rows.push(app._.defaults(v, {value: k}));
                }
              });

              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'district$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/district/fetch",
        handler: function (app, options) {
          return function *(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var districts = yield app.modelFactory().model_query(app.models['psn_district'], {
                select: 'name',
                where: {
                  status: 1,
                  tenantId: tenantId
                }
              });
              this.body = app.wrapper.res.rows(districts);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'floor$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/floor/fetch",
        handler: function (app, options) {
          return function *(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var districtId = this.request.body.districtId;

              var rooms = yield app.modelFactory().model_query(app.models['psn_room'], {
                select: 'floor',
                where: {
                  status: 1,
                  districtId: districtId,
                  tenantId: tenantId
                }
              });

              var floors = app._.map(app._.uniq(app._.map(rooms, (o) => {
                return o.floor;
              })), function (o) {
                return {id: districtId + '$' + o, name: o + '层'};
              });


              this.body = app.wrapper.res.rows(floors);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'room$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/room/fetch",
        handler: function (app, options) {
          return function *(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var floorId = this.request.body.floorId;
              var arrFloorParsed = floorId.split('$');
              var districtId = arrFloorParsed[0];
              var floor = arrFloorParsed[1];

              var rooms = yield app.modelFactory().model_query(app.models['psn_room'], {
                select: 'name',
                where: {
                  status: 1,
                  districtId: districtId,
                  floor: floor,
                  tenantId: tenantId
                }
              });

              this.body = app.wrapper.res.rows(rooms);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'tenant$config$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/tenant/config/fetch",
        handler: function (app, options) {
          return function *(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                return app.wrapper.res.error({message: '无法找到养老机构'});
              }
              var config = {};
              if (tenant.other_config) {
                config.drug_in_stock_expire_date_check_flag = tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
                config.psn_drug_stock_out_mode = tenant.other_config.psn_drug_stock_out_mode;
                config.psn_meal_biz_mode = tenant.other_config.psn_meal_biz_mode;
                config.psn_meal_periods = tenant.other_config.psn_meal_periods;
              }
              config.drug_in_stock_expire_date_check_flag == undefined && (config.drug_in_stock_expire_date_check_flag = false);
              config.psn_drug_stock_out_mode == undefined && (config.psn_drug_stock_out_mode = DIC.D3028.BY_PERIOD);
              config.psn_meal_biz_mode == undefined && (config.psn_meal_biz_mode = DIC.D3041.REAL_TIME);
              (config.psn_meal_periods == undefined || config.psn_meal_periods.length === 0) && (config.psn_meal_periods = [DIC.D3040.BREAKFAST, DIC.D3040.LUNCH, DIC.D3040.DINNER, DIC.D3040.SUPPER]);
              this.body = app.wrapper.res.ret(config);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'elderly$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/elderly/fetch",
        handler: function (app, options) {
          return function *(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var districtId = this.request.body.districtId;
              var floorId = this.request.body.floorId;
              var roomId = this.request.body.roomId;

              var dynamicFilter = {};
              if (districtId) {
                console.log('districtId...')
                dynamicFilter['room_value.districtId'] = districtId;
              }
              if (floorId) {
                console.log('floorId...')
                //需要按照
                var arrFloorParsed = floorId.split('$');
                dynamicFilter['room_value.districtId'] = arrFloorParsed[0];

                var floor = arrFloorParsed[1];
                var rooms = yield app.modelFactory().model_query(app.models['psn_room'], {
                  select: '_id',
                  where: {
                    status: 1,
                    floor: floor,
                    districtId: arrFloorParsed[0],
                    tenantId: tenantId
                  }
                });

                var roomIds = app._.map(rooms, (o) => {
                  return o._id;
                })

                dynamicFilter['room_value.roomId'] = {$in: roomIds};
              }

              if (roomId) {
                console.log('roomId...')
                dynamicFilter['room_value.roomId'] = roomId;
              }
              console.log('dynamicFilter:', dynamicFilter);
              app._.extend(dynamicFilter, {
                status: 1,
                tenantId: tenantId,
                live_in_flag: true,
                begin_exit_flow: {$ne: true}
              });

              console.log('dynamicFilter:', dynamicFilter);

              var elderly = yield app.modelFactory().model_query(app.models['psn_elderly'], {
                select: 'name birthday room_summary avatar room_value',
                where: dynamicFilter
              });

              this.body = app.wrapper.res.rows(elderly);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'drug$directory$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/drug/directory/fetch",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var barcode = this.request.body.barcode;

              console.log("body", this.request.body);

              var psnDrug = yield app.modelFactory().model_one(app.models['psn_drugDirectory'], {
                where: {
                  status: 1,
                  tenantId: tenantId,
                  barcode: barcode
                }
              });
              console.log("psnDrug", psnDrug);
              if (!psnDrug) {
                var pubDrug_json = yield app.modelFactory().model_one(app.models['pub_drug'], {where: {barcode: barcode}});
                if (pubDrug_json) {
                  psnDrug = {
                    barcode: pubDrug_json.barcode, //条形码 added by zppro 2017.5.12
                    // drug_no: pubDrug_json.approval_no,// 药品编码
                    full_name: pubDrug_json.name,
                    short_name: pubDrug_json.short_name,
                    // alias: pubDrug_json.alias,
                    // english_name: pubDrug_json.english_name,
                    indications_function: pubDrug_json.indications_function,//药品功能主治（适用症）
                    otc_flag: pubDrug_json.otc_flag,
                    health_care_flag: pubDrug_json.medical_insurance_flag,
                    usage: pubDrug_json.usage,
                    price: pubDrug_json.reference_price,
                    specification: pubDrug_json.specification,//药品规格
                    vender: pubDrug_json.vender,//厂家 added by zppro 2017.5.12
                    // dosage_form: pubDrug_json.dosage_form, //剂型 added by zppro 2017.5.12
                    // special_individuals: pubDrug_json.special_individuals, //特殊人群用药 added by zppro 2017.5.12
                    // drugSourceId: pubDrug_json.id,//关联公共的药品库
                    tenantId: tenantId //关联机构
                  };
                  this.body = app.wrapper.res.ret(psnDrug);
                } else {
                  this.body = app.wrapper.res.default();
                }
              } else {
                this.body = app.wrapper.res.ret(psnDrug);
              }

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'drug$directory$save',
        verb: 'post',
        url: this.service_url_prefix + "/drug/directory/save",
        handler: function (app, options) {
          return function*(next) {
            try {
              // console.log("request", this.request.body.drug);
              var drug = this.request.body.drug;
              var barcode = drug.barcode;
              var pubDrug = yield app.modelFactory().model_one(app.models['pub_drug'], {where: {barcode: barcode}});
              if (!pubDrug) {
                pubDrug = yield app.modelFactory().model_create(app.models['pub_drug'], {
                  barcode: drug.barcode,
                  img: drug.img,
                  name: drug.full_name,
                  reference_price: drug.price,
                  vender: drug.vender,
                  dosage_form: drug.dosage_form,
                  short_name: drug.short_name,
                  alias: drug.alias,
                  english_name: drug.english_name,
                  specification: drug.special_individuals,
                  usage: drug.usage,
                  indications_function: drug.indications_function,
                  otc_flag: drug.otc_flag,
                  medical_insurance_flag: drug.health_care_flag
                });
              }

              var drugDirectory = yield app.modelFactory().model_one(app.models['psn_drugDirectory'], {where: {barcode: barcode}});
              if (!drugDirectory) {
                //本地库不存在
                drug.drugSourceId = pubDrug._id;
                drugDirectory = yield app.modelFactory().model_create(app.models['psn_drugDirectory'], drug);
              } else {
                yield app.modelFactory().model_update(app.models['psn_drugDirectory'], drugDirectory.id, drug);
              }
              if (drug.img) {
                pubDrug.img = drug.img;
                yield pubDrug.save();
              }
              this.body = app.wrapper.res.ret(drugDirectory._id);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'drug$stock$in',
        verb: 'post',
        url: this.service_url_prefix + "/drug/stock/in",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.userId;
              var openid = this.openid;
              var inStockData = this.request.body.inStockData;

              console.log("body", this.request.body);

              this.body = yield app.psn_drug_stock_service.inStock(tenantId, inStockData, operated_by, openid);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'elderly_room$check',
        verb: 'post',
        url: this.service_url_prefix + "/elderly-room/check",
        handler: function (app, options) {
          return function*(next) {
            try {
              // console.log("request", this.request.body.drug);
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              var roomId = this.request.body.roomId;
              var bed_no = this.request.body.bed_no;
              var elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                return app.wrapper.res.error({message: '无法找到对应的老人资料'});
              }
              if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                return app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续'});
              }

              // 按片区配置 获取药品扫码出库方式
              var district = yield app.modelFactory().model_read(app.models['psn_district'], elderly.room_value.districtId);
              if (!district || district.status == 0) {
                return app.wrapper.res.error({message: '无法找到对应的片区'});
              }

              var elderlys_out_stock_check_mode = DIC.D3028.BY_PERIOD;
              if (district.config && district.config.elderlys_out_stock_check_mode) {
                elderlys_out_stock_check_mode = district.config.elderlys_out_stock_check_mode;
              }
              if (elderly.tenantId.toString() == tenantId && elderly.room_value && elderly.room_value.roomId && elderly.room_value.roomId.toString() == roomId && elderly.room_value.bed_no == bed_no) {
                //返回老人当日的用药
                var drugUseItems = yield app.modelFactory().model_query(app.models['psn_drugUseItem'], {
                  select: 'drugId name quantity unit drugUseTemplateId repeat_type repeat_values repeat_start',
                  where: {
                    status: 1,
                    elderlyId: elderlyId,
                    stop_flag: false,
                    tenantId: tenantId
                  }
                }).populate('drugId', 'img', 'psn_drugDirectory').populate('drugUseTemplateId', 'name order_no', 'psn_drugUseTemplate');

                var groupObject = app._.groupBy(drugUseItems, function (o) {
                  if (o.drugUseTemplateId) {
                    return o.drugUseTemplateId._id;
                  } else {
                    return o._id;
                  }
                });
                var elderlyDrugUseItems = [], groupValue, row;
                for (var key in groupObject) {
                  groupValue = groupObject[key];
                  for (var i = 0, len = groupValue.length; i < len; i++) {
                    row = groupValue[i].toObject();
                    if (row.drugUseTemplateId) {
                      row.group_order = row.drugUseTemplateId.order_no;
                      row.template_name = row.drugUseTemplateId.name;
                      row.templateId = row.drugUseTemplateId.id;
                    } else {
                      row.group_order = 99999;
                      row.template_name = '无';
                    }
                    row.drugUseTemplateId = undefined;

                    row.drug_img = row.drugId.img;
                    row.drugId = row.drugId.id;

                    if (row.unit) {
                      row.unit_name = D3026[row.unit].name;
                    }
                    if (row.repeat_values.length > 0) {
                      row.exec_on_str = D0103[row.repeat_type].name + '' + row.repeat_values.map(o => '' + o + row.repeat_start).join()
                    } else {
                      row.exec_on_str = D0103[row.repeat_type].name + '' + row.repeat_start;
                    }
                    elderlyDrugUseItems.push(row)
                  }
                }

                var ret = {elderlys_out_stock_check_mode: elderlys_out_stock_check_mode, drugs: elderlyDrugUseItems};

                this.body = app.wrapper.res.ret(ret);
              } else {
                this.body = app.wrapper.res.error({message: '老人与房间床位不匹配,请仔细检查核对'});
              }
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'elderly$drugUseItemDaily$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/elderly/drugUseItemDaily/fetch",
        handler: function (app, options) {
          return function*(next) {
            try {
              // console.log("request", this.request.body.drug);
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              this.body = yield app.psn_drug_stock_service.elderlyDrugUseMergedWithStockList(tenantId, elderlyId);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'elderlyDrugMergedStock',
        verb: 'post',
        url: this.service_url_prefix + "/elderly/drugMergedStock",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              this.body = yield app.psn_drug_stock_service.elderlyStockQuery(tenantId, elderlyId,keyword,statusFlag);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'elderlyDrugLowStockWarning',
        verb: 'post',
        url: this.service_url_prefix + "/elderly/drugLowStockWarning",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;

              var tae = yield app.psn_drug_stock_service._getTenantAndElderly(tenantId, elderlyId);
              if (!tae.success) {
                return tae
              }

              var tenant = tae.ret.t, elderly = tae.ret.e;
              var elderlyStockObject = yield app.psn_drug_stock_service._elderlyStockObject(tenant, elderly);
              var lowStockDrugStats = [], drugStockStat;
              for (var drugId in elderlyStockObject) {
                drugStockStat = elderlyStockObject[drugId];
                if (drugStockStat.is_warning) {
                  lowStockDrugStats.push(drugStockStat);
                }
              }
              if (lowStockDrugStats.length == 0) {
                this.body = app.wrapper.res.error({message: '当前库存充足,无需提醒'});
                return;
              }

              yield app.pub_alarm_service.saveLowStockDrugsAlarmForElderly(lowStockDrugStats, elderly);
              this.body = yield app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'drug$stock$out',
        verb: 'post',
        url: this.service_url_prefix + "/drug/stock/out",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.userId;
              var openid = this.openid;
              var outStockMode = this.request.body.outStockMode;
              var outStockData = this.request.body.outStockData;

              console.log("body", this.request.body);

              if (outStockMode === DIC.D3028.BY_DAY) {
                this.body = yield app.psn_drug_stock_service.outStockByDay(tenantId, outStockData.type, outStockData.mode, operated_by, openid);
              } else {
                this.body = yield app.psn_drug_stock_service.outStockByPeriod(tenantId, outStockData, operated_by, openid);
              }
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'drug$stockin$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/drug/stockin/fetch",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.userId;
              var openid = this.openid;
              var page = this.request.body.page;

              var drugInOutStocks = yield app.modelFactory().model_query(app.models['psn_drugInOutStock'], {
                select: 'check_in_time code drugs elderly_name',
                where: {
                  status: 1,
                  tenantId: tenantId,
                  operated_by: operated_by,
                  open_id: openid
                },
                sort: {
                  check_in_time: -1
                }
              }, {skip: page.skip, limit: page.size}).populate('drugs.drugId', 'img');


              app._.each(drugInOutStocks, (o) => {
                console.log('drugInOutStock drugs:', o.drugs);
              });

              this.body = app.wrapper.res.rows(drugInOutStocks);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'handoverlog$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/handoverlog/fetch",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log("body", this.request.body);
              var tenantId = this.request.body.tenantId;
              var level = this.request.body.level;
              var elderlyId = this.request.body.elderlyId;
              var check_in_time = this.request.body.check_in_time;
              var page = this.request.body.page;
              var where = {status: 1, tenantId: tenantId};
              if (level) {
                where.level = level;
              }
              if (elderlyId) {
                where.elderlies = {$elemMatch: {$eq: elderlyId}}
              }
              if (check_in_time) {
                where.check_in_time = {
                  '$gte': app.moment(check_in_time).toDate(),
                  '$lt': app.moment(check_in_time).add(1, 'days').toDate()
                }
              }

              var data = {
                select: 'check_in_time title description elderlies level voice_records',
                where: where,
                page: page,
                sort: {check_in_time: -1}
              };
              var rows = yield app.modelFactory().model_query(app.models['psn_handoverLog'], data).populate('elderlies', 'name avatar');
              console.log(rows);
              this.body = app.wrapper.res.rows(rows);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'handoverlog$save',
        verb: 'post',
        url: this.service_url_prefix + "/handoverlog/save",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log("body", this.request.body);
              yield app.modelFactory().model_create(app.models['psn_handoverLog'], this.request.body);
              this.body = app.wrapper.res.default();

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'nursingWorkerSchedule$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/nursingWorkerSchedule/fetch",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var d = this.request.body.date;
              var start = app.moment(d).toDate(), end = app.moment(d).add(1, 'days').toDate();
              var nursingWorkerSchedules = yield app.modelFactory().model_aggregate(app.models['psn_nursingWorkerSchedule'], [
                {
                  $match: {status: 1, tenantId: app.ObjectId(tenantId), x_axis: {'$gte': start, '$lt': end}}
                },

                {
                  $group: {
                    _id: '$y_axis',
                    nursing_shift_ids: {$addToSet: "$aggr_value"}
                  }
                },
                {
                  $lookup: {
                    from: "psn_nursingWorker",
                    localField: "_id",
                    foreignField: "_id",
                    as: "nursing_worker"
                  }
                },
                {$unwind: {path: "$nursing_worker"}},
                {
                  $project: {
                    nursing_worker_id: '$nursing_worker._id',
                    nursing_worker_name: '$nursing_worker.name',
                    nursing_shift_ids: '$nursing_shift_ids',
                    _id: false
                  }
                }
              ]);

              // console.log('nursingWorkerSchedules:', nursingWorkerSchedules);

              var nursingWorkerIds = app._.map(nursingWorkerSchedules, item => item.nursing_worker_id);
              var nursingSchedules = yield app.modelFactory().model_query(app.models['psn_nursingSchedule'], {
                select: 'y_axis aggr_value',
                where: {status: 1, x_axis: {'$gte': start, '$lt': end}, aggr_value: {$in: nursingWorkerIds}}
              }).populate('y_axis', 'name');

              var nursingWorkerMap = {}, nursingSchedule, nursingWorkerId;
              for (var i = 0, len = nursingSchedules.length; i < len; i++) {
                nursingSchedule = nursingSchedules[i];
                nursingWorkerId = nursingSchedule.aggr_value.toString();
                if (nursingWorkerMap[nursingWorkerId]) {
                  nursingWorkerMap[nursingWorkerId] += ',' + nursingSchedule.y_axis.name;
                } else {
                  nursingWorkerMap[nursingWorkerId] = nursingSchedule.y_axis.name;
                }
              }
              // console.log('nursingWorkerMapRoom:', nursingWorkerMap);

              var nursingShifts = yield app.modelFactory().model_query(app.models['psn_nursingShift'], {
                select: 'name',
                where: {status: 1}
              });
              var nursingShiftMap = {}, nursingShift;
              for (var i = 0, len = nursingShifts.length; i < len; i++) {
                nursingShift = nursingShifts[i];
                nursingShiftMap[nursingShift.id] = nursingShift.name;
              }

              var rows = app._.map(nursingWorkerSchedules, item => ({
                nursing_worker: item.nursing_worker_name,
                nursing_shifts: item.nursing_shift_ids.map(item => nursingShiftMap[item]).join(),
                rooms: nursingWorkerMap[item.nursing_worker_id] || ''
              }));

              // console.log('rows:', rows);

              this.body = app.wrapper.res.rows(rows);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'user$changePassword',
        verb: 'post',
        url: this.service_url_prefix + "/user/changePassword",
        handler: function (app, options) {
          return function*(next) {
            try {
              // console.log("request", this.request.body);
              var user = yield app.modelFactory().model_read(app.models['pub_user'], this.request.body.userId);
              if (!user) {
                this.body = app.wrapper.res.error({message: '无效的用户!'});
                yield next;
                return;
              }
              var oldPasswordHash = app.crypto.createHash('md5').update(this.request.body.old_password).digest('hex');
              if (user.password_hash != oldPasswordHash) {
                this.body = app.wrapper.res.error({message: '旧密码错误!'});
                yield next;
                return;
              }

              var newPasswordHash = app.crypto.createHash('md5').update(this.request.body.new_password).digest('hex');
              user.password_hash = newPasswordHash;
              user.save();
              this.body = app.wrapper.res.default();

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'user$auth',
        verb: 'post',
        url: this.service_url_prefix + "/user/auth",
        handler: function (app, options) {
          return function*(next) {
            try {
              // console.log("request", this.request.body);
              var user = yield app.modelFactory().model_one(app.models['pub_user'], {
                select: "code name tenantId",
                where: this.request.body
              })

              // console.log("<<<<<user<<<<<", user);

              if (!user || user.status == 0) {
                this.body = app.wrapper.res.error({message: '认证失败,请重新认证'});
                yield next;
                return;
              } else {
                var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], user.tenantId);

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

                var ret = {id: user._id, name: user.name, tenantId: tenant.id, tenant_name: tenant.name};

                this.body = app.wrapper.res.ret(ret);
              }

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'mealOrderRecords$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/mealOrderRecords/fetch",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log("body", this.request.body);
              var userId = this.request.body.userId;
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              var check_time = app.moment(this.request.body.check_in_time);
              var thisMoment = app.moment().format();
              var curMealTime = null, curDay = app.moment().format('YYYY-MM-DD'), resCurMealTime = false;

              if (app.moment(thisMoment).isBetween(curDay + 'T05', curDay + 'T09:00:00+08:00')) {
                curMealTime = 'A0000';
              } else if (app.moment(thisMoment).isBetween(curDay + 'T09:00:01+08:00', curDay + 'T13:00:00+08:00')) {
                curMealTime = 'A0001';
              } else if (app.moment(thisMoment).isBetween(curDay + 'T13:00:01+08:00', curDay + 'T19:00:00+08:00')) {
                curMealTime = 'A0002';
              } else if (app.moment(thisMoment).isBetween(curDay + 'T19:00:01+08:00', curDay + 'T21:00:00+08:00')) {
                curMealTime = 'A0003';
              }
              if (this.request.body.check_in_time === curDay) {
                resCurMealTime = curMealTime;
              }

              var where = {tenantId: app.ObjectId(tenantId), x_axis: {'$gte': check_time.toDate(), '$lt': check_time.add(1, 'days').toDate()}};

              if (elderlyId) {
                where.elderlyId = app.ObjectId(elderlyId);
              } else {
                var dataPermissionRecord = yield app.modelFactory().model_one(app.models['pub_dataPermission'], {
                  select: 'object_ids',
                  where: {
                    status: 1,
                    subsystem: app.modelVariables["PENSION-AGENCY"]['SUB_SYSTEM'],
                    subject_model: 'pub-user',
                    subject_id: userId,
                    object_type: DIC.D0105.ROOM,
                    tenantId: tenantId
                  }
                });

                var whereElderlys = {
                  status: 1,
                  tenantId: tenantId,
                  live_in_flag: true,
                  begin_exit_flow: {$ne: true}
                }
                if (dataPermissionRecord) {
                  whereElderlys['room_value.roomId'] = {$in: dataPermissionRecord.object_ids || []};
                } else{
                  whereElderlys['room_value.roomId'] = {$in: []};
                }

                var elderlys = yield app.modelFactory().model_query(app.models['psn_elderly'], {
                  select: '_id',
                  where: whereElderlys
                });

                where.elderlyId = {$in: app._.map(elderlys, o => o._id)}
              }

              var rows = yield app.modelFactory().model_aggregate(app.models['psn_mealOrderRecord'], [
                {
                  $match: where
                },
                {
                  $lookup: {
                    from: "psn_meal",
                    localField: "mealId",
                    foreignField: "_id",
                    as: "mealName"
                  }
                },
                {
                  $project: {
                    elderlyId: '$elderlyId',
                    elderly_name: '$elderly_name',
                    x_axis: '$x_axis',
                    meal: {y_axis: '$y_axis', mealId: '$mealId', quantity: '$quantity', mealName: '$mealName', orderId: '$_id'}
                  }
                },
                {
                  $group: {
                    _id: '$elderlyId',
                    elderly_name: {$first: '$elderly_name'},
                    x_axis: {$first: '$x_axis'},
                    orderedMeals: {$push: '$meal'}
                  }
                },
                {
                  $lookup: {
                    from: "psn_elderly",
                    localField: "_id",
                    foreignField: "_id",
                    as: "elderly"
                  }
                }
              ]);
              console.log('mealOrderRecord rows:', rows);
              app._.each(rows, (o) => {
                var groupedRows = app._.groupBy(o.orderedMeals, (meal) => {
                  "use strict";
                  return meal.y_axis;
                });
                o.orderedMeals = groupedRows;
              });

              this.body = app.wrapper.res.ret({status: resCurMealTime, rows: rows});
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'mealOrderRecords$fetchByDateRange',
        verb: 'post',
        url: this.service_url_prefix + "/mealOrderRecords/fetchByDateRange",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log("body", this.request.body);
              var userId = app.ObjectId(this.request.body.userId);
              var tenantId = app.ObjectId(this.request.body.tenantId);
              var begin_date = this.request.body.begin_date;
              var end_date = this.request.body.end_date;
              var psn_meal_periods = this.request.body.psn_meal_periods || [DIC.D3040.BREAKFAST, DIC.D3040.LUNCH, DIC.D3040.DINNER, DIC.D3040.SUPPER];

              var x_axis_start = app.moment(begin_date);
              var x_axis_end = app.moment(end_date).add(1, 'days');
              var where = {tenantId: tenantId, x_axis: {'$gte': x_axis_start.toDate(), '$lt': x_axis_end.toDate()}};


              var dataPermissionRecord = yield app.modelFactory().model_one(app.models['pub_dataPermission'], {
                select: 'object_ids',
                where: {
                  status: 1,
                  subsystem: app.modelVariables["PENSION-AGENCY"]['SUB_SYSTEM'],
                  subject_model: 'pub-user',
                  subject_id: userId,
                  object_type: DIC.D0105.ROOM,
                  tenantId: tenantId
                }
              });
              console.log('dataPermissionRecord:', dataPermissionRecord);
              var whereElderlys = {
                status: 1,
                tenantId: tenantId,
                live_in_flag: true,
                begin_exit_flow: {$ne: true}
              }
              if (dataPermissionRecord) {
                whereElderlys['room_value.roomId'] = {$in: dataPermissionRecord.object_ids || []};
              } else{
                whereElderlys['room_value.roomId'] = {$in: []};
              }
              var elderlys = yield app.modelFactory().model_query(app.models['psn_elderly'], {
                select: '_id',
                where: whereElderlys
              });
              where.elderlyId = {$in: app._.map(elderlys, o => o._id)};
              var aggrPipe = [{
                $match: where
              },
                {
                  $lookup: {
                    from: "psn_meal",
                    localField: "mealId",
                    foreignField: "_id",
                    as: "meal"
                  }
                },
                {
                  $unwind: '$meal'
                },
                {
                  $project: {
                    elderlyId: '$elderlyId',
                    weekDay: {$dayOfWeek: '$x_axis'},
                    date: {$dateToString: {format: "%Y-%m-%d", date: "$x_axis"}},
                    period: '$y_axis',
                    meal: '$meal',
                    quantity: '$quantity',
                    orderId:'$_id'
                  }
                },
                {
                  $group: {
                    _id: {elderlyId: '$elderlyId', period: '$period', weekDay: '$weekDay'},
                    date: {$first: '$date'},
                    meals: {$push: { mealId: '$meal._id', name: '$meal.name', x_axis: '$date', quantity: '$quantity',orderId: '$orderId'} }
                  }
                },
                {
                  $sort: {'_id.period': 1}
                }];

              var g1 = {
                $project: {
                  _id: 0,
                  elderlyId: '$_id.elderlyId',
                  weekDay: { $subtract: [ '$_id.weekDay', 1 ]},
                  period: '$_id.period',
                  date: '$date'
                }
              };
              var g2 =  {
                $group: {
                  _id: {elderlyId: '$elderlyId'}
                }
              };

              var g3 = {
                $lookup: {
                  from: "psn_elderly",
                  localField: "_id.elderlyId",
                  foreignField: "_id",
                  as: "elderly"
                }
              };
              var g4 = {
                $unwind: '$elderly'
              }

              var g5 = {
                $project: {
                  _id: 0,
                  elderly: { id: '$elderly._id', name: '$elderly.name', avatar: '$elderly.avatar', room_summary: '$elderly.room_summary' }
                }
              }

              app._.each(psn_meal_periods, (periodKey)=> {
                g1.$project[periodKey] = {
                  0: {$cond: {if: {$and: [{$eq: ['$_id.period', periodKey]},{$eq: ['$_id.weekDay', 1]}]}, then: '$$CURRENT.meals', else: []}},
                  1: {$cond: {if: {$and: [{$eq: ['$_id.period', periodKey]},{$eq: ['$_id.weekDay', 2]}]}, then: '$$CURRENT.meals', else: []}},
                  2: {$cond: {if: {$and: [{$eq: ['$_id.period', periodKey]},{$eq: ['$_id.weekDay', 3]}]}, then: '$$CURRENT.meals', else: []}},
                  3: {$cond: {if: {$and: [{$eq: ['$_id.period', periodKey]},{$eq: ['$_id.weekDay', 4]}]}, then: '$$CURRENT.meals', else: []}},
                  4: {$cond: {if: {$and: [{$eq: ['$_id.period', periodKey]},{$eq: ['$_id.weekDay', 5]}]},then: '$$CURRENT.meals', else: []}},
                  5: {$cond: {if: {$and: [{$eq: ['$_id.period', periodKey]},{$eq: ['$_id.weekDay', 6]}]}, then: '$$CURRENT.meals', else: []}},
                  6: {$cond: {if: {$and: [{$eq: ['$_id.period', periodKey]},{$eq: ['$_id.weekDay', 7]}]}, then: '$$CURRENT.meals', else: []}}
                };
                g2.$group[periodKey] = {$push: '$' + periodKey}
                g5.$project[periodKey] = 1;
              });

              console.log('g1>>>',g1);
              console.log('g2>>>',g2);
              console.log('g2>>>',g3);
              aggrPipe.push(g1, g2, g3, g4, g5);
              // aggrPipe.push(g2);
              var rows = yield app.modelFactory().model_aggregate(app.models['psn_mealOrderRecord'], aggrPipe);
              app._.each(rows, function(row){
                app._.each(psn_meal_periods, (periodKey)=> {
                  row[periodKey] = app._.reduce(row[periodKey], (total, row2) => {
                    total[0] = (total[0] || []).concat(row2[0])
                    total[1] = (total[1] || []).concat(row2[1])
                    total[2] = (total[2] || []).concat(row2[2])
                    total[3] = (total[3] || []).concat(row2[3])
                    total[4] = (total[4] || []).concat(row2[4])
                    total[5] = (total[5] || []).concat(row2[5])
                    total[6] = (total[6] || []).concat(row2[6])
                    return total;
                  }, {})
                });
              });
              console.log('meals$fetch:rows[0]>>', rows[0]);
              // console.log('meals$fetch:rows[0].A0000>>', rows[0].A0000);
              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'meals$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/meals/fetch",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log("body", this.request.body);
              var tenantId = this.request.body.tenantId;
              var psn_meal_biz_mode = this.request.body.psn_meal_biz_mode;
              var psn_meal_periods = this.request.body.psn_meal_periods.length == 0 || [DIC.D3040.BREAKFAST, DIC.D3040.LUNCH, DIC.D3040.DINNER, DIC.D3040.SUPPER];

              if (psn_meal_biz_mode === DIC.D3041.PRE_BOOKING) {
                //提前预订
                var x_axis_start = app.moment(app.moment().weekday(0).add(7, 'days').format('YYYY-MM-DD'));
                var x_axis_end = app.moment(app.moment().weekday(0).add(14, 'days').format('YYYY-MM-DD'));

                var rows = yield app.modelFactory().model_aggregate(app.models['psn_mealMenu'], [
                  {
                    $match: {
                      tenantId: app.ObjectId(tenantId),
                      status: 1,
                      x_axis: {$gte: x_axis_start.toDate(), $lt: x_axis_end.toDate()},
                      y_axis: {$in: psn_meal_periods}
                    }
                  },
                  {
                    $lookup: {
                      from: "psn_meal",
                      localField: "aggr_value.mealId",
                      foreignField: "_id",
                      as: "meal"
                    }
                  },
                  {
                    $unwind: '$meal'
                  },
                  {
                    $project: {
                      date: {$dateToString: {format: "%Y-%m-%d", date: "$x_axis"}},
                      period: '$y_axis',
                      meal: {id: '$aggr_value.mealId', name: '$meal.name'}
                    }
                  },
                  {
                    $group: {
                      _id: {date: '$date', period: '$period'},
                      meals: {$push: '$meal'}
                    }
                  },
                  {
                    $sort: {'_id.period': 1}
                  },
                  {
                    $project: {
                      date: '$_id.date',
                      period: '$_id.period',
                      meals: '$meals'
                    }
                  },
                  {
                    $group: {
                      _id: '$date',
                      periods: {$push: '$$ROOT'}
                    }
                  },
                  {
                    $project: {
                      _id: 0,
                      date: '$_id',
                      periods: '$periods'
                    }
                  },
                  {
                    $sort: {'date': 1}
                  }
                ]);
                app._.each(rows, (o) => {
                  o.weekday = app.moment(o.date).format('ddd');
                  o.periods = app._.map(o.periods, (p) => {
                    console.log(p.period)
                    return {period: p.period, meals: p.meals}
                  });
                });
                console.log('meals$fetch:PRE_BOOKING>>', rows);
                this.body = app.wrapper.res.rows(rows);
              }else if(this.request.body.x_axis && this.request.body.y_axis){
                var x_axis = this.request.body.x_axis;
                var y_axis = this.request.body.y_axis;
                var rows = yield app.modelFactory().model_query(app.models['psn_mealMenu'], {
                  select: 'aggr_value',
                  where: {
                    tenantId: tenantId,
                    x_axis: x_axis,
                    y_axis: y_axis
                  },
                  sort: {check_in_time: -1}
                }).populate('aggr_value.mealId', 'name meal');
                console.log('predetermin meals$fetch:rows..:', rows);
                var meals = [];
                app._.each(rows, (o) => {
                    meals.push({id: o.aggr_value.mealId._id, name: o.aggr_value.mealId.name});
                });
                this.body = app.wrapper.res.ret(meals);
              } else {
                //实时预订
                var x_axis = app.moment().format('YYYY-MM-DD'), y_axis, y_axis_value;
                var thisMoment = app.moment().format();
                if (app.moment(thisMoment).isBetween(x_axis + 'T05', x_axis + 'T09:00:00+08:00')) {
                  y_axis = 'A0000';
                } else if (app.moment(thisMoment).isBetween(x_axis + 'T09:00:01+08:00', x_axis + 'T13:00:00+08:00')) {
                  y_axis = 'A0001';
                } else if (app.moment(thisMoment).isBetween(x_axis + 'T13:00:01+08:00', x_axis + 'T19:00:00+08:00')) {
                  y_axis = 'A0002';
                } else if (app.moment(thisMoment).isBetween(x_axis + 'T19:00:01+08:00', x_axis + 'T21:00:00+08:00')) {
                  y_axis = 'A0003';
                }
                y_axis_value = D3040[y_axis].name;
                console.log('meals$fetch:thisMoment:', thisMoment, 'x_axis:', x_axis, 'y_axis:', y_axis, 'y_axis_value:', y_axis_value);

                var rows = yield app.modelFactory().model_query(app.models['psn_mealMenu'], {
                  select: 'aggr_value x_axis',
                  where: {
                    tenantId: tenantId,
                    x_axis: x_axis,
                    y_axis: y_axis
                  },
                  sort: {check_in_time: -1}
                }).populate('aggr_value.mealId', 'name meal');
                console.log('meals$fetch:rows..:', rows);
                var meals = [];
                app._.each(rows, (o) => {
                  meals.push({id: o.aggr_value.mealId._id, name: o.aggr_value.mealId.name, quantity: o.aggr_value.quantity, member: o.aggr_value.mealId.meal});
                });
                this.body = app.wrapper.res.ret({meals: meals, y_axis: y_axis, y_axis_value: y_axis_value});
              }

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'mealOrderRecord$elderly$fetch',
        verb: 'post',
        url: this.service_url_prefix + "/mealOrderRecord/elderly/fetch",
        handler: function (app, options) {
          return function *(next) {
            try {
              var userId = this.request.body.userId;
              var tenantId = this.request.body.tenantId;
              var districtId = this.request.body.districtId;
              var floorId = this.request.body.floorId;
              var roomId = this.request.body.roomId;

              var dynamicFilter = {};
              if (districtId) {
                console.log('districtId...')
                dynamicFilter['room_value.districtId'] = districtId;
              }
              if (floorId) {
                console.log('floorId...')
                //需要按照
                var arrFloorParsed = floorId.split('$');
                dynamicFilter['room_value.districtId'] = arrFloorParsed[0];

                var floor = arrFloorParsed[1];
                var rooms = yield app.modelFactory().model_query(app.models['psn_room'], {
                  select: '_id',
                  where: {
                    status: 1,
                    floor: floor,
                    districtId: arrFloorParsed[0],
                    tenantId: tenantId
                  }
                });

                var roomIds = app._.map(rooms, (o) => {
                  return o._id;
                })

                dynamicFilter['room_value.roomId'] = {$in: roomIds};
              }

              if (roomId) {
                console.log('mealOrderRecord$elderly$fetch: roomId...')
                dynamicFilter['room_value.roomId'] = roomId;
              } else {
                //查找有权限访问的房间
                var dataPermissionRecord = yield app.modelFactory().model_one(app.models['pub_dataPermission'], {
                  select: 'object_ids',
                  where: {
                    status: 1,
                    subsystem: app.modelVariables["PENSION-AGENCY"]['SUB_SYSTEM'],
                    subject_model: 'pub-user',
                    subject_id: userId,
                    object_type: DIC.D0105.ROOM,
                    tenantId: tenantId
                  }
                });

                var whereElderlys = {
                  status: 1,
                  tenantId: tenantId,
                  live_in_flag: true,
                  begin_exit_flow: {$ne: true}
                }
                if (dataPermissionRecord) {
                  dynamicFilter['room_value.roomId'] = {$in: dataPermissionRecord.object_ids || []};
                } else {
                  dynamicFilter['room_value.roomId'] = {$in: [] };
                }

                // dynamicFilter['room_value.roomId'] = {$in: dataPermissionRecord.object_ids };
                console.log('mealOrderRecord$elderly$fetch: dynamicFilter:', dynamicFilter);
              }

              app._.extend(dynamicFilter, {
                status: 1,
                tenantId: tenantId,
                live_in_flag: true,
                begin_exit_flow: {$ne: true}
              });

              var psn_meal_biz_mode = this.request.body.psn_meal_biz_mode;

              if (psn_meal_biz_mode === DIC.D3041.PRE_BOOKING) {
                var psn_meal_periods = this.request.body.psn_meal_periods.length == 0 || [DIC.D3040.BREAKFAST, DIC.D3040.LUNCH, DIC.D3040.DINNER, DIC.D3040.SUPPER];
                var x_axis_start = app.moment(app.moment().weekday(0).add(7, 'days').format('YYYY-MM-DD'));
                var x_axis_end = app.moment(app.moment().weekday(0).add(14, 'days').format('YYYY-MM-DD'));

                var rows = yield app.modelFactory().model_aggregate(app.models['psn_mealOrderRecord'], [
                  {
                    $match: {
                      tenantId: app.ObjectId(tenantId),
                      status: 1,
                      x_axis: {$gte: x_axis_start.toDate(), $lt: x_axis_end.toDate()},
                      y_axis: {$in: psn_meal_periods}
                    }
                  },
                  {
                    $group: {
                      _id: '$elderlyId'
                    }
                  }
                ]);

                console.log('mealOrderRecord$elderly$fetch: elderlyIdsOrdered rows:',rows);
                var elderlyIdsOrdered = app._.map(rows, (o) => o._id);
                dynamicFilter['_id'] = {$nin: elderlyIdsOrdered};
              }
              var elderly = yield app.modelFactory().model_query(app.models['psn_elderly'], {
                select: 'name birthday room_summary avatar room_value',
                where: dynamicFilter
              });

              this.body = app.wrapper.res.rows(elderly);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'mealOrderRecord$save',
        verb: 'post',
        url: this.service_url_prefix + "/mealOrderRecord/save",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log("body", this.request.body);
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.operated_by;
              var psn_meal_biz_mode = this.request.body.psn_meal_biz_mode;
              var meals = this.request.body.meals;
              if (psn_meal_biz_mode === DIC.D3041.PRE_BOOKING) {
                //提前预订
                var elderly = this.request.body.elderly;
                var psn_meal_periods = this.request.body.psn_meal_periods.length == 0 || [DIC.D3040.BREAKFAST, DIC.D3040.LUNCH, DIC.D3040.DINNER, DIC.D3040.SUPPER];
                var x_axis_start = app.moment(app.moment().weekday(0).add(7, 'days').format('YYYY-MM-DD'));
                var x_axis_end = app.moment(app.moment().weekday(0).add(14, 'days').format('YYYY-MM-DD'));
                var toSaveRows = [];
                app._.each(meals, (o) => {
                  o.elderlyId = elderly.id;
                  o.elderly_name = elderly.name;
                  o.tenantId = tenantId;
                });
                yield app.modelFactory().model_bulkInsert(app.models['psn_mealOrderRecord'], {
                  rows: meals,
                  removeWhere: {
                    tenantId: tenantId,
                    elderlyId: elderly.id,
                    status: 1,
                    x_axis: {$gte: x_axis_start.toDate(), $lt: x_axis_end.toDate()},
                    y_axis: {$in: psn_meal_periods}
                  }
                });
                this.body = app.wrapper.res.default();
              } else {
                var mealTime = this.request.body.mealTime;
                var submitMealMember = this.request.body.submitMealMember;
                //实时预订
                var x_axis = app.moment().format('YYYY-MM-DD'), y_axis;
                var thisMoment = app.moment().format();
                if (app.moment(thisMoment).isBetween(x_axis + 'T05', x_axis + 'T09:00:00+08:00')) {
                  y_axis = 'A0000';
                } else if (app.moment(thisMoment).isBetween(x_axis + 'T09:00:01+08:00', x_axis + 'T13:00:00+08:00')) {
                  y_axis = 'A0001';
                } else if (app.moment(thisMoment).isBetween(x_axis + 'T13:00:01+08:00', x_axis + 'T19:00:00+08:00')) {
                  y_axis = 'A0002';
                } else if (app.moment(thisMoment).isBetween(x_axis + 'T19:00:01+08:00', x_axis + 'T21:00:00+08:00')) {
                  y_axis = 'A0003';
                }
                var resMealMember = {}, res = false;
                if (mealTime === y_axis) {
                  for (var i = 0, len = meals.length; i < len; i++) {
                    var submitMealMemberIdArray = submitMealMember[meals[i].id];
                    if (submitMealMemberIdArray) {
                      var jLen = submitMealMemberIdArray.length;
                      console.log('查询套餐数量----');
                      var mealInMealMenu = yield app.modelFactory().model_query(app.models['psn_mealMenu'], {
                        select: 'status aggr_value',
                        where: {
                          x_axis: x_axis,
                          y_axis: y_axis,
                          'aggr_value.mealId': meals[i].id,
                          tenantId: tenantId
                        }
                      });
                      console.log('mealInMealMenu:', mealInMealMenu);
                      if (jLen <= mealInMealMenu[0].aggr_value.quantity) {
                        console.log('修改套餐剩余数量-------');
                        mealInMealMenu[0].aggr_value.quantity -= jLen;
                        yield mealInMealMenu[0].save();

                        console.log('增加订单记录------');
                        for (var j = 0; j < jLen; j++) {
                          var sameMealOrderRecord = yield app.modelFactory().model_query(app.models['psn_mealOrderRecord'], {
                            select: 'status mealId quantity',
                            where: {
                              elderlyId: submitMealMemberIdArray[j].id,
                              x_axis: x_axis,
                              y_axis: y_axis,
                              mealId: meals[i].id,
                              tenantId: tenantId
                            }
                          });
                          console.log('sameMealOrderRecord:', sameMealOrderRecord);
                          if (sameMealOrderRecord.length >= 1) {
                            sameMealOrderRecord[0].quantity++;
                            yield sameMealOrderRecord[0].save();
                          } else {
                            yield app.modelFactory().model_create(app.models['psn_mealOrderRecord'], {
                              operated_by: operated_by,
                              elderlyId: submitMealMemberIdArray[j].id,
                              elderly_name: submitMealMemberIdArray[j].name,
                              x_axis: x_axis,
                              y_axis: y_axis,
                              mealId: meals[i].id,
                              quantity: 1,
                              tenantId: tenantId
                            });
                          }
                        }
                      } else {
                        console.log('套餐数量不足，返回重新提交-----');
                        resMealMember[meals[i].id] = submitMealMemberIdArray;
                        res = true;
                      }
                    }
                  }
                } else {
                  this.body = app.wrapper.res.error({message: '当前订餐时间已过，请重新订餐!'});
                  yield next;
                  return;
                }
                this.body = app.wrapper.res.ret({status: res, data: resMealMember});
              }
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'predetermineEditMeal$save',
        verb: 'post',
        url: this.service_url_prefix + "/predetermineEditMeal/save",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log("body", this.request.body);
              var tenantId = this.request.body.tenantId;
              var num = this.request.body.num;
              var orderId = this.request.body.orderId;
              var mealId = this.request.body.mealId;

              var mealOrderRecord = yield app.modelFactory().model_read(app.models['psn_mealOrderRecord'], orderId);
              console.log('mealOrderRecord:', mealOrderRecord);

              if (mealOrderRecord.mealId == mealId) {
                mealOrderRecord.quantity += num;
                yield mealOrderRecord.save();
              } else {
                var iptNum = mealOrderRecord.quantity + num;
                mealOrderRecord.quantity = iptNum;
                mealOrderRecord.mealId = mealId;
                yield mealOrderRecord.save();
              }

              this.body = app.wrapper.res.ret(mealOrderRecord);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'changeMealQuantity$save',
        verb: 'post',
        url: this.service_url_prefix + "/changeMealQuantity/save",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log("body", this.request.body);
              var tenantId = this.request.body.tenantId;
              var num = this.request.body.num;
              var orderId = this.request.body.orderId;
              var mealId = this.request.body.mealId;
              var MealTime = this.request.body.curMealTime;
              var thisMoment = app.moment().format(), x_axis = app.moment().format('YYYY-MM-DD'), y_axis;
              if (app.moment(thisMoment).isBetween(x_axis + 'T05', x_axis + 'T09:00:00+08:00')) {
                y_axis = 'A0000';
              } else if (app.moment(thisMoment).isBetween(x_axis + 'T09:00:01+08:00', x_axis + 'T13:00:00+08:00')) {
                y_axis = 'A0001';
              } else if (app.moment(thisMoment).isBetween(x_axis + 'T13:00:01+08:00', x_axis + 'T19:00:00+08:00')) {
                y_axis = 'A0002';
              } else if (app.moment(thisMoment).isBetween(x_axis + 'T19:00:01+08:00', x_axis + 'T21:00:00+08:00')) {
                y_axis = 'A0003';
              }
              if (MealTime !== y_axis) {
                this.body = app.wrapper.res.error({message: '已过当前点餐时间，刷新重试！'});
                yield next;
                return;
              }
              var mealInMealMenu = yield app.modelFactory().model_query(app.models['psn_mealMenu'], {
                select: 'status aggr_value',
                where: {
                  x_axis: x_axis,
                  y_axis: y_axis,
                  'aggr_value.mealId': mealId,
                  tenantId: tenantId
                }
              });
              var mealOrderRecord = yield app.modelFactory().model_read(app.models['psn_mealOrderRecord'], orderId);
              console.log('mealOrderRecord:', mealOrderRecord);

              if (mealOrderRecord.mealId == mealId) {
                if (num > 0) {
                  if (mealInMealMenu[0].aggr_value.quantity >= num) {
                    console.log('套餐数量-num -------');
                    mealInMealMenu[0].aggr_value.quantity -= num;
                  } else {
                    console.log('套餐剩余数量不足.....');
                    this.body = app.wrapper.res.error({message: '套餐剩余数量不足！'});
                    yield next;
                    return;
                  }
                } else {
                  console.log('套餐数量+num +++++++++');
                  mealInMealMenu[0].aggr_value.quantity -= num;
                }
                yield mealInMealMenu[0].save();
                mealOrderRecord.quantity += num;
                yield mealOrderRecord.save();
              } else {
                var iptNum = mealOrderRecord.quantity + num;
                if (iptNum > mealInMealMenu[0].aggr_value.quantity) {
                  console.log('修改后套餐剩余数量不足...');
                  this.body = app.wrapper.res.error({message: '套餐剩余数量不足！'});
                  yield next;
                  return;
                } else {
                  console.log('套餐数量-iptNum -------');
                  mealInMealMenu[0].aggr_value.quantity -= iptNum;
                  yield mealInMealMenu[0].save();
                  var preMealInMealMenu = yield app.modelFactory().model_one(app.models['psn_mealMenu'], {
                    select: 'status aggr_value',
                    where: {
                      x_axis: x_axis,
                      y_axis: y_axis,
                      'aggr_value.mealId': mealOrderRecord.mealId,
                      tenantId: tenantId
                    }
                  });
                  preMealInMealMenu.aggr_value.quantity += mealOrderRecord.quantity;
                  yield preMealInMealMenu.save();
                }
                var sameMealOrderRecord = yield app.modelFactory().model_one(app.models['psn_mealOrderRecord'], {
                  select: 'status mealId quantity',
                  where: {
                    elderlyId: mealOrderRecord.elderlyId,
                    x_axis: x_axis,
                    y_axis: y_axis,
                    mealId: mealId,
                    tenantId: tenantId
                  }
                });
                if (sameMealOrderRecord) {
                  sameMealOrderRecord.quantity += iptNum;
                  yield sameMealOrderRecord.save();
                  yield app.modelFactory().model_delete(app.models['psn_mealOrderRecord'], orderId);
                } else {
                  mealOrderRecord.quantity = iptNum;
                  mealOrderRecord.mealId = mealId;
                  yield mealOrderRecord.save();
                }
              }

              this.body = app.wrapper.res.ret(mealOrderRecord);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      {
        method: 'deleteMealOrder$save',
        verb: 'post',
        url: this.service_url_prefix + "/deleteMealOrder/save",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log("body", this.request.body);
              var tenantId = this.request.body.tenantId;
              var meal = this.request.body.meal;
              var MealTime = this.request.body.curMealTime;
              var thisMoment = app.moment().format(), x_axis = app.moment().format('YYYY-MM-DD'), y_axis;
              if (app.moment(thisMoment).isBetween(x_axis + 'T05', x_axis + 'T09:00:00+08:00')) {
                y_axis = 'A0000';
              } else if (app.moment(thisMoment).isBetween(x_axis + 'T09:00:01+08:00', x_axis + 'T13:00:00+08:00')) {
                y_axis = 'A0001';
              } else if (app.moment(thisMoment).isBetween(x_axis + 'T13:00:01+08:00', x_axis + 'T19:00:00+08:00')) {
                y_axis = 'A0002';
              } else if (app.moment(thisMoment).isBetween(x_axis + 'T19:00:01+08:00', x_axis + 'T21:00:00+08:00')) {
                y_axis = 'A0003';
              }
              if (MealTime !== y_axis) {
                this.body = app.wrapper.res.error({message: '已过当前点餐时间，刷新重试！'});
                yield next;
                return;
              }

              yield app.modelFactory().model_delete(app.models['psn_mealOrderRecord'], meal.orderId);
              var mealInMealMenu = yield app.modelFactory().model_one(app.models['psn_mealMenu'], {
                select: 'status aggr_value',
                where: {
                  x_axis: x_axis,
                  y_axis: y_axis,
                  'aggr_value.mealId': meal.mealId,
                  tenantId: tenantId
                }
              });
              mealInMealMenu.aggr_value.quantity += meal.quantity;
              yield mealInMealMenu.save();

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      }
    ];

    return this;
  }
}.init();
//.init(option);
