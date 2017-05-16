/**
 * Created by zppro on 16-8-28.
 * 参考字典D1003-预定义树
 */
var path = require('path');
var xlsx = require('node-xlsx').default;
var importDrugConfig = require('../pre-defined/imp-xlsx-drug-config.json');

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
                method: 'tenantInfo',
                verb: 'get',
                url: this.service_url_prefix + "/tenantInfo/:_id/:select",//:select需要提取的字段域用逗号分割 e.g. name,type
                handler: function (app, options) {
                    return function * (next) {
                        try {
                            var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'],  this.params._id);
                            var ret = app._.pick(tenant.toObject(),this.params.select.split(','));
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
                method: 'tenantChargeItemNursingLevelAsTree',
                verb: 'get',
                url: this.service_url_prefix + "/tenantChargeItemNursingLevelAsTree/:id,:charge_standard,:subsystem",
                handler: function (app, options) {
                    return function * (next) {
                        try {
                            var tenantId = this.params.id;
                            var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
                            if (!tenant || tenant.status == 0) {
                                this.body = app.wrapper.res.error({message: '无法找到租户!'});
                                yield next;
                                return;
                            }
                            var charge_standard = this.params.charge_standard;
                            if (!charge_standard) {
                                this.body = app.wrapper.res.error({message: '无法找到收费标准!'});
                                yield next;
                                return;
                            }
                            var subsytem = this.params.subsystem;
                            if (!subsytem || !app.modelVariables[subsytem.toUpperCase()]) {
                                this.body = app.wrapper.res.error({message: '无法找到子系统!'});
                                yield next;
                                return;
                            }
                            var where = {
                                status: 1,
                                tenantId: tenantId
                            };
                            // if(subsytem) {
                            //     where['subsystem'] = subsytem;
                            // }
                            var chargeItems = yield app.modelFactory().model_query(app.models['psn_nursingLevel'], {
                                where: where
                            });
                            var charge_standard_object = app._.find(tenant.charge_standards, function(o) {
                               return o.charge_standard == charge_standard && o.subsystem == subsytem;
                            });
                            if(!charge_standard_object) {
                                charge_standard = app.modelVariables[subsytem.toUpperCase()].DEFAULT_CHARGE_STANDARD
                            }
                            var ret = {
                                _id: app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_PREFIX + app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_NURSING_LEVEL_CATAGORY._ID + '-' + charge_standard,
                                name: app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_NURSING_LEVEL_CATAGORY.NAME,
                                children: []
                            };

                            for (var i = 0; i < chargeItems.length; i++) {
                                console.log(i);
                                if ((app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_PREFIX + app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_NURSING_LEVEL_CATAGORY._ID + '-' + charge_standard) == ret._id){
                                    ret.children.push({
                                        _id: app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_PREFIX + chargeItems[i]._id,
                                        name: chargeItems[i].name,
                                        data: {manual_seletable: true}
                                    });
                                }
                            }
                            console.log(ret);
                            this.body = app.wrapper.res.ret(ret);
                            
                        } catch (error) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                    }
                }
            },
            {
                method: 'tenantChargeItemCustomizedAsTree',
                verb: 'get',
                url: this.service_url_prefix + "/tenantChargeItemCustomizedAsTree/:id,:charge_standard,:subsystem",
                handler: function (app, options) {
                    return function * (next) {
                        try {
                            var tenantId = this.params.id;
                            var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
                            if (!tenant || tenant.status == 0) {
                                this.body = app.wrapper.res.error({message: '无法找到租户!'});
                                yield next;
                                return;
                            }
                            var charge_standard = this.params.charge_standard;
                            if (!charge_standard) {
                                this.body = app.wrapper.res.error({message: '无法找到收费标准!'});
                                yield next;
                                return;
                            }
                            var subsytem = this.params.subsystem;
                            if (!subsytem || !app.modelVariables[subsytem.toUpperCase()]) {
                                this.body = app.wrapper.res.error({message: '无法找到子系统!'});
                                yield next;
                                return;
                            }
                            var where = {
                                status: 1,
                                tenantId: tenantId
                            };
                            if(subsytem) {
                                where['subsystem'] = subsytem;
                            }
                            var chargeItems = yield app.modelFactory().model_query(app.models['pub_tenantChargeItemCustomized'], {
                                where: where
                            });
                            var charge_standard_object = app._.find(tenant.charge_standards, function(o) {
                               return o.charge_standard == charge_standard && o.subsystem == subsytem;
                            });
                            if(!charge_standard_object) {
                                charge_standard = app.modelVariables[subsytem.toUpperCase()].DEFAULT_CHARGE_STANDARD
                            }
                            var ret = {
                                _id: app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_PREFIX + app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_CUSTOMIZED_CATAGORY._ID + '-' + charge_standard,
                                name: app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_CUSTOMIZED_CATAGORY.NAME,
                                children: []
                            };

                            for (var i = 0; i < chargeItems.length; i++) {
                                if ((app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_PREFIX + chargeItems[i].catagory + '-' + charge_standard) == ret._id){
                                    ret.children.push({
                                        _id: app.modelVariables[subsytem.toUpperCase()].CHARGE_ITEM_PREFIX + chargeItems[i]._id,
                                        name: chargeItems[i].name,
                                        data: {manual_seletable: true}
                                    });
                                }
                            }

                            console.log(ret);
                            
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
                method: 'saveTenantChargeItemCustomized',//保存收费标准
                verb: 'post',
                url: this.service_url_prefix + "/saveTenantChargeItemCustomized/:id",
                handler: function (app, options) {
                    return function * (next) {
                        try {
                            var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], this.params.id);
                            if (!tenant || tenant.status == 0) {
                                this.body = app.wrapper.res.error({message: '无法找到租户!'});
                                yield next;
                                return;
                            }

                            var charge_standard = this.request.body.charge_standard;
                            var subsystem = this.request.body.subsystem;
                            var index =  app._.findIndex(tenant.charge_standards, function (o) {
                                return o.subsystem === subsystem && o.charge_standard === charge_standard
                            });
                            if (index === -1) {
                                tenant.charge_standards.push(this.request.body);
                            } else {
                                tenant.charge_standards.splice(index, 1, this.request.body);
                            }
                            yield tenant.save();
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
                method: 'saveTenantOtherConfig',//保存机构其它配置
                verb: 'post',
                url: this.service_url_prefix + "/saveTenantOtherConfig/:id",
                handler: function (app, options) {
                    return function * (next) {
                        try {
                            var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], this.params.id);
                            if (!tenant || tenant.status == 0) {
                                this.body = app.wrapper.res.error({message: '无法找到租户!'});
                                yield next;
                                return;
                            }
                            // console.log('saveTenantOtherConfig', this.request.body);
                            tenant.other_config = this.request.body.otherConfig;
                            tenant.name = this.request.body.name;
                            yield tenant.save();
                            this.body = app.wrapper.res.default();
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            /**********************订单相关*****************************/
            {
                method: 'completeOrder',//完成订单
                verb: 'post',
                url: this.service_url_prefix + "/completeOrder/:_id",
                handler: function (app, options) {
                    return function * (next) {
                        try {

                            //1、订单状态从[财务确认收款]到[交易成功]
                            var orderUpdateData = {order_status: 'A1004', success_on: app.moment()};
                            var ret = yield app.modelFactory().model_update(app.models['pub_order'], this.params._id, orderUpdateData);
                            //2、更新tenant.open_funcs中对应的func.payed和expired_on
                            var order = yield app.modelFactory().model_read(app.models['pub_order'], this.params._id);
                            var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], order.tenantId);

                            var order_items = order.order_items;
                            for (var i = 0; i < order_items.length; i++) {
                                var open_func = app._.findWhere(tenant.open_funcs, {func_id: order_items[i].func_id});

                                if(open_func){
                                    //已经存在的功能
                                    var isAfter = app.moment().isAfter(open_func.expired_on);
                                    if (isAfter) {
                                        //已经过期
                                        console.log('isAfter:true');
                                        open_func.expired_on = app.moment().add(order.duration, 'M');
                                    }
                                    else {
                                        //还未过期
                                        console.log('isAfter:false');
                                        open_func.expired_on = app.moment(open_func.expired_on).add(order.duration, 'M');
                                    }
                                }
                                else{
                                    //增加新功能

                                    open_func = app._.omit(order_items[i].toObject(),['_id','check_in_time']);
                                    console.log(order_items[i]);
                                    console.log(open_func);
                                    open_func.expired_on = app.moment().add(order.duration, 'M');


                                    tenant.open_funcs.push(open_func);
                                    //console.log(open_func);
                                    //console.log(tenant.open_funcs);
                                }

                            }
                            yield tenant.save();
                            this.body = app.wrapper.res.ret(orderUpdateData);
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            {
                method: 'refundOrder',//订单发起退款
                verb: 'post',
                url: this.service_url_prefix + "/refundOrder/:_id",
                handler: function (app, options) {
                    return function * (next) {
                        try {
                            //1、订单状态从[交易成功]到[等待退款]
                            var orderUpdateData = {order_status: 'A1006', refund_on: app.moment()};
                            var ret = yield app.modelFactory().model_update(app.models['pub_order'],this.params._id, orderUpdateData);
                            //2、更新tenant.open_funcs中对应的func.payed和expired_on
                            var order = yield app.modelFactory().model_read(app.models['pub_order'], this.params._id);
                            var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], order.tenantId);

                            var order_items = order.order_items;
                            for (var i = 0; i < order_items.length; i++) {
                                var open_func = app._.findWhere(tenant.open_funcs, {func_id: order_items[i].func_id});
                                open_func.expired_on = app.moment(open_func.expired_on).subtract(order.duration, 'M');
                            }
                            yield tenant.save();
                            this.body = app.wrapper.res.ret(orderUpdateData);
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            /**********************冲红相关*****************************/
            {
                method: 'queryVoucherNo',
                verb: 'post',
                url: this.service_url_prefix + "/q/voucher_no",
                handler: function (app, options) {
                    return function * (next) {
                        try {
                            var tenantId = this.request.body.tenantId;
                            var modelName = this.request.body.modelName;
                            var keyword = this.request.body.keyword;
                            var data = this.request.body.data;

                            console.log(this.request.body);

                            app._.extend(data.where,{
                                status: 1,
                                //carry_over_flag:true,
                                tenantId: tenantId
                            });

                            if(keyword){
                                data.where.voucher_no = new RegExp(keyword);
                            }
                            var rows_in_recharge = yield app.modelFactory().model_query(app.models[modelName], data);
                            var rows_in_tenantJournalAccount = yield app.modelFactory().model_query(app.models['pub_tenantJournalAccount'], data);

                            var rows = app._.union(rows_in_recharge,rows_in_tenantJournalAccount);

                            this.body = app.wrapper.res.rows(rows);
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            /**********************用户密码相关*****************************/
            {
                method: 'userChangePassword',//用户修改密码
                verb: 'post',
                url: this.service_url_prefix + "/userChangePassword/:_id",
                handler: function (app, options) {
                    return function * (next) {
                        try {

                            var user = yield app.modelFactory().model_read(app.models['pub_user'], this.params._id);
                            if(!user){
                                this.body = app.wrapper.res.error({message: '无效的用户!'});
                                yield next;
                                return;
                            }
                            var oldPasswordHash = app.crypto.createHash('md5').update(this.request.body.old_password).digest('hex');
                            if(user.password_hash != oldPasswordHash) {
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
                    };
                }
            },
            {
                method: 'resetUserPassword',//管理中心重设用户密码
                verb: 'post',
                url: this.service_url_prefix + "/resetUserPassword/:_id",
                handler: function (app, options) {
                    return function * (next) {
                        try {
                            var user = yield app.modelFactory().model_read(app.models['pub_user'], this.params._id);
                            if(!user){
                                this.body = app.wrapper.res.error({message: '无效的用户!'});
                                yield next;
                                return;
                            }
                            console.log('before update');
                            var newPasswordHash = app.crypto.createHash('md5').update('123456').digest('hex');
                            console.log(newPasswordHash);
                            user.password_hash = newPasswordHash;
                            user.save();
                            this.body = app.wrapper.res.default();
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            /******************APP版本*********************************/
            {
                method: 'upgradeAppServerSide',//管理中心将复制一条服务端端升级记录，并增加一位版本号
                verb: 'post',
                url: this.service_url_prefix + "/upgradeAppServerSide/:appId",
                handler: function (app, options) {
                    return function * (next) {
                        try {
                            var updateHistories = yield app.modelFactory().model_query(app.models['pub_appServerSideUpdateHistory'], {
                                where: { app_id: this.params.appId },
                                select: 'app_id ver ver_order',
                                sort: {ver_order: -1, check_in_time: -1}
                            }, {limit: 1});
                            if(updateHistories.length == 0){
                                this.body = app.wrapper.res.error({message: '当前App在该操作系统下没有任何版本信息!'});
                                yield next;
                                return;
                            }
                            var newUpdateHistory = updateHistories[0].toObject();
                            delete newUpdateHistory._id;
                            delete newUpdateHistory.id;
                            var arrVer = newUpdateHistory.ver.split('.');
                            var scale = 100;
                            var newVer;
                            var ver3 = parseInt(arrVer[2]);
                            console.log(newUpdateHistory.ver)
                            if(++ver3 == scale){
                                ver3 = 0;
                                var ver2 = parseInt(arrVer[1]);
                                ver2++;
                                if(ver2 == scale) {
                                    ver2 = 0;
                                    var ver1 = parseInt(arrVer[0]);
                                    ver1++;
                                    if(ver1 == scale) {
                                        ver1 = 0
                                    }
                                    console.log(ver1)
                                    newVer = ['' + ver1, '' + ver2, '' + ver3].join('.')
                                } else {
                                    newVer = [arrVer[0], '' + ver2, '' + ver3].join('.')
                                }
                            } else {
                                newVer = [arrVer[0], arrVer[1], '' + ver3].join('.')
                            }
                            newUpdateHistory.ver = newVer;
                            newUpdateHistory.ver_order = self.genVerOrder(newUpdateHistory.ver);
                            yield app.modelFactory().model_create(app.models['pub_appServerSideUpdateHistory'], newUpdateHistory);

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
                method: 'upgradeAppClientSide',//管理中心将复制一条客户端升级记录，并增加一位版本号
                verb: 'post',
                url: this.service_url_prefix + "/upgradeAppClientSide/:appId,:os",
                handler: function (app, options) {
                    return function * (next) {
                        try {
                            var updateHistories = yield app.modelFactory().model_query(app.models['pub_appClientSideUpdateHistory'], {
                                    where: { app_id: this.params.appId, os: this.params.os },
                                    select: 'app_id os ver ver_code force_update_flag download_url',
                                    sort: {ver_order: -1, check_in_time: -1}
                            }, {limit: 1});
                            if(updateHistories.length == 0){
                                this.body = app.wrapper.res.error({message: '当前App在该操作系统下没有任何版本信息!'});
                                yield next;
                                return;
                            }
                            var newUpdateHistory = updateHistories[0].toObject();
                            delete newUpdateHistory._id;
                            delete newUpdateHistory.id;
                            var arrVer = newUpdateHistory.ver.split('.');
                            var scale = 100;
                            var newVer;
                            var ver3 = parseInt(arrVer[2]);
                            console.log(newUpdateHistory.ver)
                            if(++ver3 == scale){
                                ver3 = 0;
                                var ver2 = parseInt(arrVer[1]);
                                ver2++;
                                if(ver2 == scale) {
                                    ver2 = 0;
                                    var ver1 = parseInt(arrVer[0]);
                                    ver1++;
                                    if(ver1 == scale) {
                                        ver1 = 0
                                    }
                                    console.log(ver1)
                                    newVer = ['' + ver1, '' + ver2, '' + ver3].join('.')
                                } else {
                                    newVer = [arrVer[0], '' + ver2, '' + ver3].join('.')
                                }
                            } else {
                                newVer = [arrVer[0], arrVer[1], '' + ver3].join('.')
                            }
                            newUpdateHistory.ver = newVer;
                            newUpdateHistory.ver_order = self.genVerOrder(newUpdateHistory.ver);
                            yield app.modelFactory().model_create(app.models['pub_appClientSideUpdateHistory'], newUpdateHistory);

                            this.body = app.wrapper.res.default();
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            },
            /******************数据管理*********************************/
            {
                method: 'importDrug',//管理中心将复制一条客户端升级记录，并增加一位版本号
                verb: 'post',
                url: this.service_url_prefix + "/importDrug",
                handler: function (app, options) {
                    return function *(next) {
                        try {
                            var file_name = this.request.body.file_name;
                            // console.log(this.request.body);
                            var file = path.join(app.conf.dir.rawData, file_name);
                            // console.log(file);
                            console.log('begin parse',app.moment().format('YYYY.MM.DD HH:mm:ss'));
                            var worksheets = xlsx.parse(file);
                            console.log('end parse',app.moment().format('YYYY.MM.DD HH:mm:ss'));
                            var saveRows = [], sheetConfig;
                            for (var i = 0, len = worksheets.length, worksheet = worksheets[i]; i < len; i++) {
                                //读取导入配置
                                for (var key in importDrugConfig) {
                                    if (key == worksheet.name) {
                                        sheetConfig = importDrugConfig[key];
                                        // console.log('importDrugConfig:', key, sheetConfig);
                                        // 解析colIndex
                                        var columns = sheetConfig.columns, col, colIndex;
                                        for (var j = 0, jlen = columns.length; j < jlen; j++) {
                                            col = columns[j];
                                            if (sheetConfig.header) {
                                                colIndex = app._.findIndex(worksheet.data[0], (o) => {
                                                    return o == col.src
                                                });
                                            } else {
                                                colIndex = col.src;
                                            }
                                            if (colIndex != -1) {
                                                col['colIndex'] = colIndex;
                                            }
                                        }

                                        var row, colType, colValue, required, isSkip;
                                        console.log('begin row each', app.moment().format('YYYY.MM.DD HH:mm:ss'));
                                        var rowMax = (sheetConfig.to || 0) + 1 > worksheet.data.length ? (sheetConfig.to || 0) + 1 : worksheet.data.length;
                                        console.log('rowMax:', rowMax)
                                        for (var rowIndex = sheetConfig.from, rowLen = rowMax; rowIndex < rowLen; rowIndex++) {
                                            if (worksheet.data[rowIndex].length > 0) {
                                                row = {};
                                                isSkip = false;
                                                for (var k = 0, klen = columns.length; k < klen; k++) {
                                                    col = columns[k];
                                                    colType = col.type;
                                                    required = !!col.required;
                                                    colValue = worksheet.data[rowIndex][col['colIndex']];
                                                    // console.log('col:', col, colType,col['colIndex'], worksheet.data[rowIndex][col['colIndex']]);
                                                    if (colValue) {
                                                        colValue = colValue.replace(/\r/g, '').replace(/\n/g, '');
                                                        if (colType == 'number') {
                                                            row[col.dest] = parseInt(colValue);
                                                        } else if (colType == 'date') {
                                                            row[col.dest] = app.moment(colValue);
                                                        } else {
                                                            row[col.dest] = colValue;
                                                        }
                                                    } else {
                                                        isSkip = required
                                                    }
                                                }
                                                if (!isSkip) {
                                                    saveRows.push(row);
                                                } else {
                                                    console.log('skip row:', rowIndex, worksheet.data[rowIndex]);
                                                }
                                            }
                                        }
                                        console.log('end row each',app.moment().format('YYYY.MM.DD HH:mm:ss'));
                                    }
                                }
                            }

                            console.log('begin save row to db', app.moment().format('YYYY.MM.DD HH:mm:ss'));
                            var needChunkNumber = 1000;
                            if (saveRows.length > needChunkNumber) {
                                var arrChunked = self.chunkArrayRange(saveRows, 100);
                                for (var s = 0, sLen = arrChunked.length; s < sLen; s++) {
                                    // console.log('arrChunked:',s,arrChunked[s]);
                                    yield app.modelFactory().model_bulkInsert(app.models['pub_drug'], {
                                        rows: arrChunked[s]
                                    });
                                }
                            } else {
                                // console.log('saveRows:', saveRows)
                                yield app.modelFactory().model_bulkInsert(app.models['pub_drug'], {
                                    rows: saveRows
                                });
                            }
                            console.log('end save row to db',app.moment().format('YYYY.MM.DD HH:mm:ss'));
                            
                            this.body = app.wrapper.res.default();
                        } catch (e) {
                            console.log(e);
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
    genVerOrder: function(ver) {
        var arr = ver.split('.');
        return parseInt(arr[0]) * 10000 + parseInt(arr[1]) * 100 + parseInt(arr[2]);
    },
    chunkArrayRange: function (arr, range) {
        var result = [], start, end;
        // console.log('total arr length:', arr.length);
        for (var x = 0; x < arr.length; x = x+range) {
            start = result.length * range;
            end = (start + range) < arr.length ? (start + range) : arr.length + 1;
            // console.log('chunkArrayRange:', start, end);
            result.push(arr.slice(start, end));
        }
        return result;
    },
    chunkArraySize: function (arr, size) {
        var result = [], start, end;
        for (var x = 0; x < Math.ceil(arr.length / size); x++) {
            start = x * size;
            end = start + size;
            result.push(arr.slice(start, end));
        }
        return result;
    }
}.init();
//.init(option);