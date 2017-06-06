/**
 * Created by zppro on 17-6-6.
 */
var co = require('co');
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
    inStock: function (tenantId, inStockData) {
        var self = this;
        return co(function *() {
            try {
                var tenant, drug, elderly;
                
                tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
                if (!tenant || tenant.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到养老机构' });
                }
                drug = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugDirectory'], inStockData.drugId);
                if (!drug || drug.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无效的入库药品' });
                }
                elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], inStockData.elderlyId);
                if (!elderly || elderly.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到入库药品对应的老人资料' });
                }
                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                    return self.ctx.wrapper.res.error({ message: '当前老人不在院或正在办理出院手续，无法入库' });
                }
                
                //设置最小使用单位
                console.log('检查最小使用单位...');
                if (!drug.mini_unit) {
                    console.log('没有设置最小使用单位,入库时设置')
                    drug.mini_unit = inStockData.mini_unit;
                    yield drug.save();
                } else {
                    if (drug.mini_unit != inStockData.mini_unit) {
                        return self.ctx.wrapper.res.error({ message: '入库药品的最小使用单位与药品库不一致，无法入库' });
                    }
                }

                var expire_date_check_flag = false;
                if(tenant.other_config) {
                    expire_date_check_flag = !!tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
                }
                if(expire_date_check_flag) {
                    console.log('需要检查效期...');
                    if (!inStockData.expire_in) {
                        return self.ctx.wrapper.res.error({ message: '入库药品的需要输入有效期，无法入库' });
                    }
                }


                console.log('新增入库记录...');
                var drugInStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugInOutStock'], {
                    type: inStockData.type,
                    elderlyId: inStockData.elderlyId,
                    elderly_name: elderly.name,
                    drugId: inStockData.drugId,
                    drug_name: drug.short_name || drug.full_name,
                    quantity: inStockData.quantity,
                    mini_unit: inStockData.mini_unit,
                    expire_in: expire_date_check_flag ? self.ctx.moment(inStockData.expire_in) : undefined,
                    tenantId: tenantId
                });

                console.log('更新库存...');
                var drugStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugStock'], {
                    elderlyId: drugInStock.elderlyId,
                    elderly_name: drugInStock.elderly_name,
                    drugId: drugInStock.drugId,
                    drug_name: drugInStock.drug_name,
                    quantity: drugInStock.quantity,
                    mini_unit: drugInStock.mini_unit,
                    expire_in: drugInStock.expire_in,
                    drugInStockId: drugInStock._id,
                    tenantId: tenantId
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