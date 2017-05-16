/**
 * Created by zppro on 17-4-7.
 * 养老平台移动接口 pension agency center
 */
var rp = require('request-promise-native');
var DIC = require('../pre-defined/dictionary-constants.json');
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

        this.actions = [{
            method: 'elderly$bloodpressure$fetch',
            verb: 'post',
            url: this.service_url_prefix + "/elderly/bloodpressure/fetch",
            handler: function (app, options) {
                return function* (next) {
                    try {
                        var elderlyId = this.elderlyId;

                        self.logger.info("robot_code:" + (elderlyId || 'not found'));

                        self.logger.info("body:" + this.request.body);

                        var elderly, tenantId;
                        elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
                        if (!elderly || elderly.status == 0) {
                            this.body = app.wrapper.res.error({ message: '无法找到老人!' });
                            yield next;
                            return;
                        }

                        var rows = yield app.modelFactory().model_query(app.models['psn_bloodPressure'], {
                            select: 'perform_on elderly_name systolic_blood_pressure diastolic_blood_pressure drugId blood_pressure_level current_symptoms',
                            where: {
                                elderlyId: { $in: elderlyId },
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
        }, {
            method: 'elderly$bloodpressure$save',
            verb: 'post',
            url: this.service_url_prefix + '/elderly/bloodpressure/save',
            handler: function (app, options) {
                return function* (next) {
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
                            this.body = app.wrapper.res.error({ message: '无法找到老人!' });
                            yield next;
                            return;
                        };
                        var drug = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugDirectory'], tenantId);
                        if (!drug || drug.status == 0) {
                            this.body = app.wrapper.res.error({ message: '无法找到在用药品!' });
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
        }, {
            method: 'drug$directory$save',
            verb: 'post',
            url: this.service_url_prefix + "/drug/directory/save",
            handler: function (app, options) {
                return function* (next) {
                    try {
                        var tenantId = this.request.body.tenantId;
                        var barcode = this.request.body.barcode;
                        var data = {
                            status: 1,
                            tenantId: tenantId,
                            barcode: barcode
                        };

                        var psnDrugs = yield app.modelFactory().model_query(app.models['psn_drugDirectory'], { where: data });
                        if (!psnDrugs || psnDrugs.status == 0) {
                            var pubDrugs = yield app.modelFactory().model_read(app.models['pub_drug'], barcode);
                            if (pubDrugs) {
                                pubDrugs_json = pubDrugs.toOject();
                                yield app.modelFactory().model_create(app.models['psn_drugDirectory'], {
                                    barcode: pubDrugs_json.barcode, //条形码 added by zppro 2017.5.12
                                    drug_no: pubDrugs_json.approval_no,// 药品编码
                                    full_name: pubDrugs_json.name,
                                    short_name: pubDrugs_json.short_name,
                                    alias: pubDrugs_json.alias,
                                    english_name: pubDrugs_json.english_name,
                                    indications_function: pubDrugs_json.indications_function,//药品功能主治（适用症）
                                    otc_flag: pubDrugs_json.otc_flag,
                                    health_care_flag: pubDrugs_json.medical_insurance_flag,
                                    usage: pubDrugs_json.usage,
                                    price: pubDrugs_json.reference_price,
                                    specification: pubDrugs.specification,//药品规格
                                    vender: pubDrugs_json.vender,//厂家 added by zppro 2017.5.12
                                    dosage_form: pubDrugs_json.dosage_form, //剂型 added by zppro 2017.5.12
                                    special_individuals: pubDrugs_json.special_individuals, //特殊人群用药 added by zppro 2017.5.12
                                    drugSourceId: pubDrugs_json.id,//关联公共的药品库
                                    tenantId: tenantId //关联机构   
                                });
                            } else {
                                yield app.modelFactory().model_create(app.models['psn_drugDirectory'], {
                                    barcode: barcode,
                                    tenantId: tenantId
                                })
                            }
                        } else {
                            this.body = app.wrapper.res.error({ message: '该药品已存在' });
                            yield next;
                            return;
                        }
                        this.body = app.wrapper.res.default();
                    } catch (e) {
                        self.logger.error(e.message);
                        this.body = app.wrapper.res.error(e);
                    }
                    yield next;
                }
            }
        }, {
            method: 'user$certification$fetch',
            verb: 'post',
            url: this.service_url_prefix + "/user/certification/fetch",
            handler: function (app, options) {
                return function* (next) {
                    try {
                        var data = this.request.body.data;
                        console.log(data);
                        var user = yield app.modelFactory().model_query(app.models['pub_user'], {
                            select: "code name",
                            where: data
                        }).populate("tenantId", "_id name");

                        console.log("<<<<<user<<<<<", user);

                        if (!user || user.status == 0) {
                            this.body = app.wrapper.res.error({ message: '认证失败,请重新认证' });
                            yield next;
                            return;
                        } else {
                            this.body = app.wrapper.res.rows(user);
                        }

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
