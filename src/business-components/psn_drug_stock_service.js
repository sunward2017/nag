/**
 * Created by zppro on 17-6-6.
 */
var co = require('co');
var D3026 = require('../pre-defined/dictionary.json')['D3026'];
var DIC = require('../pre-defined/dictionary-constants.json');
module.exports = {
    init: function (ctx) {
        console.log('init member service... ');
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
    inStock: function (tenantId, inStockData, operated_by, open_id) {
        var self = this;
        return co(function *() {
            try {
                var tenant, drugData, drugObject, elderly;
                
                tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
                if (!tenant || tenant.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到养老机构' });
                }
                elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], inStockData.elderlyId);
                if (!elderly || elderly.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到入库药品对应的老人资料' });
                }
                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                    return self.ctx.wrapper.res.error({ message: '当前老人不在院或正在办理出院手续，无法入库' });
                }
                var drugs = inStockData.drugs;
                if(!drugs | drugs.length == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法提供入库药品数据' });
                }
                var drugIds = self.ctx._.map(drugs, (o) => {
                    return o.drugId;
                });
                var drugObjects = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugDirectory'], {
                    select: 'full_name short_name',
                    where: {
                        status: 1,
                        _id: {$in: drugIds}
                    }
                });

                if(drugs.length != drugObjects.length) {
                    return self.ctx.wrapper.res.error({ message: '入库药品中包含无效的药品记录' });
                }

                var expire_date_check_flag = false;
                if(tenant.other_config) {
                    expire_date_check_flag = !!tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
                }

                console.log('新增入库记录...');
                for (var i=0,len=drugs.length;i<len;i++) {
                    drugData = drugs[i];
                    drugObject = self.ctx._.find(drugObjects, (o)=>{
                        return o.id == drugData.drugId;
                    });

                    if (expire_date_check_flag) {
                        drugData.expires_in = expire_date_check_flag ? self.ctx.moment(drugData.expire_in) : undefined;
                    }

                    console.log('设置药品...',i);
                    drugData.drug_name = drugObject.short_name || drugObject.full_name;

                    if(expire_date_check_flag) {
                        console.log('需要检查效期...');
                        if (!drugData.expire_in) {
                            return self.ctx.wrapper.res.error({ message: '入库药品的需要输入有效期，无法入库' });
                        }
                    }

                    console.log('检查最小使用单位...',i);
                    if (!drugObject.mini_unit) {
                        console.log('没有设置最小使用单位,入库时设置')
                        drugObject.mini_unit = drugData.mini_unit;
                        yield drugObject.save();
                    } else {
                        if (drugObject.mini_unit != drugData.mini_unit) {
                            return self.ctx.wrapper.res.error({message: '入库药品的最小使用单位与药品库不一致，无法入库:' + drugData.drug_name});
                        }
                    }

                    console.log('检查数量...',i);
                    if (drugData.quantity == 0) {
                        return self.ctx.wrapper.res.error({message: '入库药品的数量为0，无法入库:' + drugData.drug_name});
                    }
                }

                var drugInStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugInOutStock'], {
                    code: self.ctx.modelVariables.SERVER_GEN,
                    operated_by: operated_by,
                    mode: inStockData.mode,
                    type: inStockData.type,
                    elderlyId: inStockData.elderlyId,
                    elderly_name: elderly.name,
                    drugs: drugs,
                    open_id: open_id,
                    tenantId: tenantId
                });

                console.log('更新库存...');
                var drugStockRows = [], drug;
                for(var i=0,len=drugInStock.drugs.length;i<len;i++) {
                    drug = drugInStock.drugs[i];
                    drugStockRows.push({
                        elderlyId: drugInStock.elderlyId,
                        elderly_name: drugInStock.elderly_name,
                        drugId: drug.drugId,
                        drug_name: drug.drug_name,
                        quantity: drug.quantity,
                        mini_unit: drug.mini_unit,
                        expire_in: drug.expire_in,
                        drugInStockId: drugInStock._id,
                        tenantId: tenantId
                    })
                }

                yield self.ctx.modelFactory().model_bulkInsert(self.ctx.models['psn_drugStock'], {
                    rows: drugStockRows
                });

                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    stockInRecordCheck: function (tenantId, drugInOutStockId) {
        var self = this;
        return co(function *() {
            try {

                var drugInOutStock = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugInOutStock'], drugInOutStockId);
                if (!drugInOutStock || drugInOutStock.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '入库记录不存在或已失效' });
                }
                var drugsInStock = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                    select: 'drugId drug_name quantity mini_unit expire_in',
                    where: {
                        status: 1,
                        drugInStockId: drugInOutStockId,
                        tenantId: tenantId
                    }
                });

                var drugsStockStatus = {}, drugsInRecord = drugInOutStock.drugs, drugInRecord, drugInStock;
                for (var i=0,len = drugsInRecord.length;i<len;i++) {
                    drugInRecord = drugsInRecord[i];
                    drugInStock = self.ctx._.find(drugsInStock, (o)=>{return o.drugId.toString() == drugInRecord.drugId.toString();});
                    if(!drugInStock){
                        drugsStockStatus[drugInRecord.drugId] = false;
                    } else {
                        drugsStockStatus[drugInRecord.drugId] = drugInRecord.quantity == drugInStock.quantity;
                    }
                }

                return self.ctx.wrapper.res.ret(drugsStockStatus);
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    updateInStock: function (tenantId, drugInOutStockId, inStockData, operated_by) {
        var self = this;
        return co(function *() {
            try {

                var drugInOutStock = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugInOutStock'], drugInOutStockId);
                if (!drugInOutStock || drugInOutStock.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '入库记录不存在或已失效' });
                }

                drugInOutStock.type = inStockData.type;
                drugInOutStock.mode = inStockData.mode;
                if(operated_by) {
                    drugInOutStock.operated_by = operated_by;
                }

                var drugsInStock = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                    select: 'drugId drug_name quantity mini_unit expire_in',
                    where: {
                        status: 1,
                        drugInStockId: drugInOutStockId,
                        tenantId: tenantId
                    }
                });

                var drugsInRecord = drugInOutStock.drugs, drugs = inStockData.drugs, drugInRecordIndex, drug, drugInStockIndex, drugInStock;
                var toAddStockDrugs = [], toModifyStockDrugs = [], toRemoveStockDrugIds = [];
                for (var i=0,len = drugs.length;i<len;i++) {
                    drug = drugs[i];
                    drugInRecordIndex = self.ctx._.findIndex(drugsInRecord, (o)=>{
                        return o.drugId.toString() == drug.drugId;
                    });
                    drugInStockIndex = self.ctx._.findIndex(drugsInStock, (o)=>{return o.drugId.toString() == drug.drugId;});
                    if(drug.to_action == 'a') {
                        console.log('药品新增进入库记录', drug.drug_name);
                        if(drugInRecordIndex == -1) {
                            drugsInRecord.push(drug);
                        }
                        if(drugInStockIndex == -1) {
                            drugInStock = self.ctx._.extend({
                                elderlyId: drugInOutStock.elderlyId,
                                elderly_name: drugInOutStock.elderly_name,
                                drugInStockId: drugInOutStockId,
                                tenantId: tenantId}, drug);
                            toAddStockDrugs.push(drugInStock);
                        }
                    } else if(drug.to_action == 'm') {
                        console.log('在入库记录中的药品信息修改', drug.drug_name);
                        if(drugInRecordIndex != -1) {
                            drugsInRecord[drugInRecordIndex].quantity = drug.quantity;
                            drugsInRecord[drugInRecordIndex].mint_unit = drug.mint_unit;
                            drugsInRecord[drugInRecordIndex].expire_in = drug.expire_in;
                        }

                        if(drugInStockIndex != -1) {
                            drugsInStock[drugInStockIndex].quantity = drug.quantity;
                            drugsInStock[drugInStockIndex].mint_unit = drug.mint_unit;
                            drugsInStock[drugInStockIndex].expire_in = drug.expire_in;
                            toModifyStockDrugs.push(drugsInStock[drugInStockIndex]);
                        }

                    } else if(drug.to_action == 'r') {
                        console.log('从入库记录中将药品信息删除', drug.drug_name);
                        if(drugInRecordIndex != -1) {
                            drugsInRecord.splice(drugInRecordIndex, 1);
                        }
                        if (drugInStockIndex != -1) {
                            toRemoveStockDrugIds.push(drug.drugId);
                        }
                    }
                }

                console.log('drugInOutStock.drugs:', drugInOutStock.drugs);
                console.log('修改入库记录...');
                yield drugInOutStock.save();

                console.log('更新库存(增加)...');
                if(toAddStockDrugs.length> 0) {
                    yield self.ctx.modelFactory().model_bulkInsert(self.ctx.models['psn_drugStock'], {
                        rows: toAddStockDrugs
                    })
                }

                console.log('更新库存(修改)...');
                for (var i=0, len=toModifyStockDrugs.length;i<len;i++) {
                    yield toModifyStockDrugs[i].save();
                }

                console.log('更新库存(删除)...');
                if(toRemoveStockDrugIds.length > 0) {
                    yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_drugStock'],  {
                        drugId: {$in: toRemoveStockDrugIds},
                        drugInStockId: drugInOutStockId,
                        tenantId: tenantId
                    });
                }
                
                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    outStock: function (tenantId, outStockData) {
        var self = this;
        return co(function *() {
            try {
                var tenant, drug, elderly;
                tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
                if (!tenant || tenant.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到养老机构' });
                }
                drug = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugDirectory'], outStockData.drugId);
                if (!drug || drug.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无效的出库药品' });
                }
                elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], outStockData.elderlyId);
                if (!elderly || elderly.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到出库药品对应的老人资料' });
                }
                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                    return self.ctx.wrapper.res.error({ message: '当前老人不在院或正在办理出院手续，无法出库' });
                }
                var expire_date_check_flag = false;
                if(tenant.other_config) {
                    expire_date_check_flag = !!tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
                }

                
                console.log('检查库存是否满足出库要求...');
                var drugStockWhere;
                if(expire_date_check_flag) {
                    console.log('需要检查效期, 按照效期  无->最近->最远 优先级来出库...');
                    drugStockWhere = {
                        status: 1,
                        elderlyId: outStockData.elderlyId,
                        drugId: outStockData.drugId,
                        mini_unit: outStockData.mini_unit,
                        expire_in: {'$gte': self.ctx.moment().toDate()},
                        tenantId: tenantId
                    }
                } else {
                    drugStockWhere = {
                        status: 1,
                        elderlyId: outStockData.elderlyId,
                        drugId: outStockData.drugId,
                        mini_unit: outStockData.mini_unit,
                        tenantId: tenantId
                    }
                }
                
                var drugStocks = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                    select: 'status quantity drugOutStockId',
                    where: drugStockWhere,
                    sort: {expire_in: 1}
                });

                var totalQuantity = self.ctx._.reduce(drugStocks, (total, o)=>{
                    return total + o.quantity;
                }, 0);

                if (totalQuantity < outStockData.quantity) {
                    return self.ctx.wrapper.res.error({ message: '当前库存已经不足，无法出库' });
                }
                
 
                console.log('新增出库记录...');
                var drugOutStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugInOutStock'], {
                    type: outStockData.type,
                    elderlyId: outStockData.elderlyId,
                    elderly_name: elderly.name,
                    drugId: outStockData.drugId,
                    drug_name: drug.short_name || drug.full_name,
                    quantity: outStockData.quantity,
                    mini_unit: outStockData.mini_unit,
                    tenantId: tenantId
                });

                console.log('更新库存...');
                var outStockQuantity = drugOutStock.quantity;
                var drugStock;
                for(var i=0,len=drugStocks.length;i<len;i++) {
                    drugStock = drugStocks[i];
                    if (outStockQuantity >= drugStock.quantity) {
                        outStockQuantity -= drugStock.quantity;
                        drugStock.quantity = 0;
                        drugStock.status = 0;
                    } else {
                        drugStock.quantity -= outStockQuantity;
                        outStockQuantity = 0;
                    }
                    drugStock.drugOutStockId = drugOutStock._id;
                    yield drugStock.save();

                    if (outStockQuantity <= 0) {
                        break;
                    }
                }
                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    elderlyStockList: function (tenantId, elderlyId) {
        var self = this;
        return co(function *() {
            try {
                var tenant, elderly;
                tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
                if (!tenant || tenant.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到养老机构' });
                }
                elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
                if (!elderly || elderly.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到入库药品对应的老人资料' });
                }
                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                    return self.ctx.wrapper.res.error({ message: '当前老人不在院或正在办理出院手续' });
                }
                var drugsInStock = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                    select: 'drugId drug_name quantity mini_unit check_in_time expire_in',
                    where: {
                        status: 1, // 隐式包含了quantity>0
                        elderlyId: elderlyId,
                        tenantId: tenantId
                    },
                    sort: {check_in_time: 1, expire_in: 1}
                });

                return self.ctx.wrapper.res.rows(drugsInStock);
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    elderlyDrugUseWithStockList: function (tenantId, elderlyId) {
        var self = this;
        return co(function *() {
            try {
                var tenant, elderly;
                tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
                if (!tenant || tenant.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到养老机构' });
                }
                elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
                if (!elderly || elderly.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到入库药品对应的老人资料' });
                }
                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                    return self.ctx.wrapper.res.error({ message: '当前老人不在院或正在办理出院手续' });
                }
                var drugUseItems = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugUseItem'], {
                    select: 'drugUseTemplateId drugId name quantity unit',
                    where: {
                        status: 1, // 隐式包含了quantity>0
                        elderlyId: elderlyId,
                        stop_flag: false,
                        tenantId: tenantId
                    }
                }).populate('drugUseTemplateId', 'name order_no');

                var elderlyStockObject = yield self._elderlyStockObject(tenant, elderly);

                var rows = self.ctx._.map(drugUseItems, (o)=>{
                    var obj = o.toObject();
                    obj.stock = elderlyStockObject[o.drugId] || {total: 0, is_danger: true};
                    return obj;
                });

                console.log('elderlyDrugUseWithStockList:', rows);

                return self.ctx.wrapper.res.rows(rows);
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    _elderlyStockObject: function (tenant, elderly){
        var self = this;
        return co(function *() {
            try {

                var where = {
                    status: 1,// 隐式包含了quantity>0
                    elderlyId: elderly._id,
                    tenantId: tenant._id
                }
                if (tenant.other_config.psn_drug_in_stock_expire_date_check_flag) {
                    where.expire_in = {'$gte': self.ctx.moment(self.ctx.moment(), 'YYYY-MM-DD').toDate()};
                }
                var drugsInStock = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                    select: 'quantity mini_unit',
                    where: where
                });

                var drugsInStock = yield self.ctx.modelFactory().model_aggregate(self.ctx.models['psn_drugStock'], [
                    {
                        $match: where
                    },
                    {
                        $group: {
                            _id: {drugId: '$drugId', unit: '$mini_unit'},
                            quantity: {$sum: '$quantity'}
                        }
                    },
                    {
                        $project: {
                            period_value: {
                                $concat: [
                                    {$substr: ["$_id.year", 0, 4]},
                                    "-",
                                    {
                                        $cond: {
                                            if: {$gte: ["$_id.month", 10]},
                                            then: {$substr: ["$_id.month", 0, 2]},
                                            else: {$concat: ["0", {$substr: ["$_id.month", 0, 1]}]}
                                        }
                                    }
                                ]
                            },
                            total: '$quantity',
                            drugId: "$_id.drugId",
                            unit: "$_id.unit"
                        }
                    }
                ]);


                var ret = {}, drugInStock;
                for (var i=0,len = drugsInStock.length;i< len;i++) {
                    drugInStock = drugsInStock[i];
                    ret[drugInStock.drugId] = { total: drugInStock.total, unit_name: D3026[drugInStock.unit].name };
                }


                return ret;
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    elderlyStockSummary: function (tenantId, elderlyId, drugId) {
        var self = this;
        return co(function *() {
            try {
                var tenant, elderly, drug;
                tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
                if (!tenant || tenant.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到养老机构' });
                }
                elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
                if (!elderly || elderly.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到入库药品对应的老人资料' });
                }
                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                    return self.ctx.wrapper.res.error({ message: '当前老人不在院或正在办理出院手续' });
                }
                drug = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugDirectory'], drugId);
                if (!drug || drug.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到药品' });
                }
                var where = {
                    status: 1,// 隐式包含了quantity>0
                    elderlyId: elderlyId,
                    tenantId: tenantId,
                    drugId: drugId
                }
                if (tenant.other_config.psn_drug_in_stock_expire_date_check_flag) {
                    where.expire_in = {'$gte': self.ctx.moment(self.ctx.moment(), 'YYYY-MM-DD').toDate()};
                }
                var drugsInStock = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                    select: 'quantity mini_unit',
                    where: where
                });

                console.log('drugsInStock:', drugsInStock);

                var ret = { total: 0};
                if(drugsInStock.length>0) {
                    ret.total = self.ctx._.reduce(drugsInStock,(total, o)=>{  return total + o.quantity || 0;}, 0);
                    ret.mini_unit = drugsInStock[0].mini_unit;
                    ret.mini_unit_name = drugsInStock[0].mini_unit_name;
                }

                return self.ctx.wrapper.res.ret(ret);
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    modifyStockQuantity: function (operated_by_name, drugStockId, newQuantity) {
        var self = this;
        return co(function *() {
            try {

                var drugStock = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugStock'], drugStockId);
                if (!drugStock || drugStock.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '库存记录不存在或已失效' });
                }

                var oldStockQuantity = drugStock.quantity;
                drugStock.quantity = newQuantity;

                console.log('新增库存修改日志...');
                var drugStockEditLog = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugStockEditLog'], {
                    operated_by_name: operated_by_name,
                    drugStockId: drugStock._id,
                    origin_quantity: oldStockQuantity,
                    revised_quantity: newQuantity,
                    tenantId: drugStock.tenantId
                });

                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    }
};