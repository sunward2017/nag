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
            method: 'drug$directory$fetch',
            verb: 'post',
            url: this.service_url_prefix + "/drug/directory/fetch",
            handler: function (app, options) {
                return function* (next) {
                    try {
                        var tenantId = this.request.body.tenantId;
                        var barcode = this.request.body.barcode;

                        // console.log("body", this.request.body);

                        var psnDrug = yield app.modelFactory().model_one(app.models['psn_drugDirectory'], {
                            where: {
                                status: 1,
                                tenantId: tenantId,
                                barcode: barcode
                            }
                        });
                        // console.log("psnDrug", psnDrug);
                        if (!psnDrug) {
                            var pubDrug_json = yield app.modelFactory().model_one(app.models['pub_drug'], { where: { barcode: barcode } });
                            if (pubDrug_json) {
                                var rows = {
                                    local_flag: false,
                                    barcode: pubDrug_json.barcode, //条形码 added by zppro 2017.5.12
                                    drug_no: pubDrug_json.approval_no,// 药品编码
                                    full_name: pubDrug_json.name,
                                    short_name: pubDrug_json.short_name,
                                    alias: pubDrug_json.alias,
                                    english_name: pubDrug_json.english_name,
                                    indications_function: pubDrug_json.indications_function,//药品功能主治（适用症）
                                    otc_flag: pubDrug_json.otc_flag,
                                    health_care_flag: pubDrug_json.medical_insurance_flag,
                                    usage: pubDrug_json.usage,
                                    price: pubDrug_json.reference_price,
                                    specification: pubDrug_json.specification,//药品规格
                                    vender: pubDrug_json.vender,//厂家 added by zppro 2017.5.12
                                    dosage_form: pubDrug_json.dosage_form, //剂型 added by zppro 2017.5.12
                                    special_individuals: pubDrug_json.special_individuals, //特殊人群用药 added by zppro 2017.5.12
                                    drugSourceId: pubDrug_json.id,//关联公共的药品库
                                    tenantId: tenantId //关联机构   
                                };
                                // console.log("<<<<<<<", rows)
                                this.body = app.wrapper.res.rows(rows);
                            } else {
                                this.body = app.wrapper.res.default();
                            }
                        } else {
                            psnDrug.local_flag = true;
                            this.body = app.wrapper.res.rows(psnDrug);
                        }

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
                        // console.log("request", this.request.body.drug);
                        var drug = this.request.body.drug;
                        var barcode = drug.barcode;
                        var stock = yield app.modelFactory().model_one(app.models['psn_drugDirectory'], { where: { barcode: barcode } });

                        var img = drug.img;
                        if (img) {
                            var barcode = drug.barcode;
                            var pubDrug = yield app.modelFactory().model_one(app.models['pub_drug'], {
                                where: { barcode: barcode }
                            });
                            
                            pubDrug.img = img;
                            yield pubDrug.save();
                        }

                        if (stock) {
                            yield app.modelFactory().model_update(app.models['psn_drugDirectory'], stock.id, drug);
                            var msg = "药品入库更新成功"
                            this.body = app.wrapper.res.ret({ success: true, exec:201,msg: msg });

                        } else {
                            yield app.modelFactory().model_create(app.models['psn_drugDirectory'], drug);
                            var msg = "药品入库新增成功"
                            this.body = app.wrapper.res.ret({ success: true, exec:200, msg: msg });
                        }

                    } catch (e) {
                        self.logger.error(e.message);
                        this.body = app.wrapper.res.error(e);
                    }
                    yield next;
                }
            }
        }, {
            method: 'user$auth',
            verb: 'post',
            url: this.service_url_prefix + "/user/auth",
            handler: function (app, options) {
                return function* (next) {
                    try {
                        // console.log("request", this.request.body);
                        var user = yield app.modelFactory().model_one(app.models['pub_user'], {
                            select: "code name tenantId",
                            where: this.request.body
                        })

                        // console.log("<<<<<user<<<<<", user);

                        if (!user || user.status == 0) {
                            this.body = app.wrapper.res.ret({code:500, message: '认证失败,请重新认证' });
                            yield next;
                            return;
                        } else {
                            var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], user.tenantId);
                            var rows = { name: user.name, tenantId: tenant.id, tenantName: tenant.name };
                            // console.log(rows);
                            this.body = app.wrapper.res.rows(rows);
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
