/**
 * Created by zppro on 17-4-7.
 * 养老平台移动接口 pension agency center
 */
var rp = require('request-promise-native');
var DIC = require('../pre-defined/dictionary-constants.json');
var D0103 = require('../pre-defined/dictionary.json')['D0103'];
var D3026 = require('../pre-defined/dictionary.json')['D3026'];
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
                    return function * (next) {
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
                    return function * (next) {
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
                            if(districtId) {
                                console.log('districtId...')
                                dynamicFilter['room_value.districtId'] = districtId;
                            }
                            if(floorId) {
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

                                var roomIds = app._.map(rooms, (o)=> {
                                    return o._id;
                                })

                                dynamicFilter['room_value.roomId'] = {$in: roomIds};
                            }
                            
                            if(roomId) {
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
                                select: 'name room_summary avatar',
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
                            var drugDirectory = yield app.modelFactory().model_one(app.models['psn_drugDirectory'], {where: {barcode: barcode}});

                            if(!drugDirectory) {
                                //本地库不存在
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
                                drug.drugSourceId = pubDrug._id;
                                drugDirectory = yield app.modelFactory().model_create(app.models['psn_drugDirectory'], drug);
                            } else {
                                yield app.modelFactory().model_update(app.models['psn_drugDirectory'], drugDirectory.id, drug);
                            }
                            if(drug.img) {
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
                            var elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
                            if (!elderly || elderly.status == 0) {
                                return app.wrapper.res.error({ message: '无法找到对应的老人资料' });
                            }
                            if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                                return app.wrapper.res.error({ message: '当前老人不在院或正在办理出院手续' });
                            }

                            // 按片区配置 获取药品扫码出库方式
                            var district  = yield app.modelFactory().model_read(app.models['psn_district'], elderly.room_value.districtId);
                            if (!district || district.status == 0) {
                                return app.wrapper.res.error({ message: '无法找到对应的片区' });
                            }
                            
                            var elderlys_out_stock_check_mode = DIC.D3028.BY_TIME_TEMPLATE;
                            if(district.config && district.config.elderlys_out_stock_check_mode){
                                elderlys_out_stock_check_mode = district.config.elderlys_out_stock_check_mode;
                            }


                            if( elderly.tenantId.toString() == tenantId && elderly.room_value && elderly.room_value.roomId && elderly.room_value.roomId.toString() == roomId) {
                                //返回老人当日的用药
                                var drugUseItems = yield app.modelFactory().model_query(app.models['psn_drugUseItem'], {
                                    select: 'drugId name quantity unit drugUseTemplateId repeat_type repeat_start',
                                    where: {
                                        status: 1,
                                        elderlyId: elderlyId,
                                        stop_flag: false,
                                        tenantId: tenantId
                                    }
                                }).populate('drugId', 'img', 'psn_drugDirectory').populate('drugUseTemplateId', 'name order_no', 'psn_drugUseTemplate');

                                var groupObject = app._.groupBy(drugUseItems, function(o){
                                    if(o.drugUseTemplateId){
                                        return o.drugUseTemplateId._id;
                                    } else {
                                        return o._id;
                                    }
                                });
                                var elderlyDrugUseItems = [], groupValue, row;
                                for(var key in groupObject) {
                                    groupValue = groupObject[key];
                                    for (var i = 0, len = groupValue.length; i < len; i++) {
                                        row = groupValue[i].toObject();
                                        if (row.drugUseTemplateId) {
                                            row.group_order = row.drugUseTemplateId.order_no;
                                            row.template_name =  row.drugUseTemplateId.name;
                                            row.templateId =  row.drugUseTemplateId.id;
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
                                        row.exec_on_str =  D0103[row.repeat_type].name + '' + row.repeat_start;

                                        elderlyDrugUseItems.push(row)
                                    }
                                }

                                var ret = {elderlys_out_stock_check_mode: elderlys_out_stock_check_mode, drugs: elderlyDrugUseItems};

                                this.body = app.wrapper.res.ret(ret);
                            } else {
                                this.body = app.wrapper.res.error({ message: '老人与房间不匹配,请仔细检查核对' });
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
                method: 'drug$stock$out',
                verb: 'post',
                url: this.service_url_prefix + "/drug/stock/out",
                handler: function (app, options) {
                    return function*(next) {
                        try {
                            var tenantId = this.request.body.tenantId;
                            var operated_by = this.request.body.userId;
                            var openid = this.openid;
                            var outStockData = this.request.body.outStockData;

                            console.log("body", this.request.body);

                            this.body = yield app.psn_drug_stock_service.outStock(tenantId, outStockData, operated_by, openid);

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
                                sort:{
                                    check_in_time: -1
                                }
                            }, {skip: page.skip, limit: page.size}).populate('drugs.drugId', 'img');


                            app._.each(drugInOutStocks, (o)=>{
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
                                var ret = {id: user._id, name: user.name, tenantId: tenant.id, tenant_name: tenant.name };
                                if(tenant.other_config) {
                                    ret.drug_in_stock_expire_date_check_flag = !!tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
                                } else {
                                    ret.drug_in_stock_expire_date_check_flag = false;
                                }
                                this.body = app.wrapper.res.ret(ret);
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
