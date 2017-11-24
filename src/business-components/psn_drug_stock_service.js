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
          return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
        }
        elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], inStockData.elderlyId);
        if (!elderly || elderly.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到入库药品对应的老人资料'});
        }
        if (!elderly.live_in_flag || elderly.begin_exit_flow) {
          return self.ctx.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法入库'});
        }
        var drugs = inStockData.drugs;
        if (!drugs | drugs.length == 0) {
          return self.ctx.wrapper.res.error({message: '无法提供入库药品数据'});
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

        if (drugs.length != drugObjects.length) {
          return self.ctx.wrapper.res.error({message: '入库药品中包含无效的药品记录'});
        }

        var expire_date_check_flag = false;
        if (tenant.other_config) {
          expire_date_check_flag = !!tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
        }

        console.log('新增入库记录...');
        for (var i = 0, len = drugs.length; i < len; i++) {
          drugData = drugs[i];
          drugObject = self.ctx._.find(drugObjects, (o) => {
            return o.id == drugData.drugId;
          });

          if (expire_date_check_flag) {
            drugData.expires_in = expire_date_check_flag ? self.ctx.moment(drugData.expire_in) : undefined;
          }

          console.log('设置药品...', i);
          drugData.drug_name = drugObject.short_name || drugObject.full_name;

          if (expire_date_check_flag) {
            console.log('需要检查效期...');
            if (!drugData.expire_in) {
              return self.ctx.wrapper.res.error({message: '入库药品的需要输入有效期，无法入库'});
            }
          }

          console.log('检查最小使用单位...', i);
          if (!drugObject.mini_unit) {
            console.log('没有设置最小使用单位,入库时设置')
            drugObject.mini_unit = drugData.mini_unit;
            yield drugObject.save();
          } else {
            if (drugObject.mini_unit != drugData.mini_unit) {
              return self.ctx.wrapper.res.error({message: '入库药品的最小使用单位与药品库不一致，无法入库:' + drugData.drug_name});
            }
          }

          console.log('检查数量...', i);
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
        for (var i = 0, len = drugInStock.drugs.length; i < len; i++) {
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
          return self.ctx.wrapper.res.error({message: '入库记录不存在或已失效'});
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
        for (var i = 0, len = drugsInRecord.length; i < len; i++) {
          drugInRecord = drugsInRecord[i];
          drugInStock = self.ctx._.find(drugsInStock, (o) => {
            return o.drugId.toString() == drugInRecord.drugId.toString();
          });
          if (!drugInStock) {
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

        var drugInStockBill = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugInOutStock'], drugInOutStockId);
        if (!drugInStockBill || drugInStockBill.status == 0) {
          return self.ctx.wrapper.res.error({message: '入库记录不存在或已失效'});
        }

        drugInStockBill.type = inStockData.type;
        drugInStockBill.mode = inStockData.mode;
        if (operated_by) {
          drugInStockBill.operated_by = operated_by;
        }

        var drugsInStock = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
          select: 'drugId drug_name quantity mini_unit expire_in',
          where: {
            status: 1,
            drugInStockId: drugInOutStockId,
            tenantId: tenantId
          }
        });

        var drugsInRecord = drugInStockBill.drugs, drugs = inStockData.drugs, drugInRecordIndex, drug, drugInStockIndex,
          drugInStock;
        var toAddStockDrugs = [], toModifyStockDrugs = [], toRemoveStockDrugIds = [];
        for (var i = 0, len = drugs.length; i < len; i++) {
          drug = drugs[i];
          // console.log('in stock data drug:=>', drug);
          drugInRecordIndex = self.ctx._.findIndex(drugsInRecord, (o) => {
            return o.drugId.toString() == drug.drugId;
          });
          drugInStockIndex = self.ctx._.findIndex(drugsInStock, (o) => {
            return o.drugId.toString() == drug.drugId;
          });
          if (drug.to_action == 'a') {
            console.log('药品新增进入库记录', drug.drug_name);
            if (drugInRecordIndex == -1) {
              drugsInRecord.push(drug);
            }
            if (drugInStockIndex == -1) {
              drugInStock = self.ctx._.extend({
                elderlyId: drugInStockBill.elderlyId,
                elderly_name: drugInStockBill.elderly_name,
                drugInStockId: drugInOutStockId,
                tenantId: tenantId
              }, drug);
              toAddStockDrugs.push(drugInStock);
            }
          } else if (drug.to_action == 'm') {
            console.log('在入库记录中的药品信息修改', drug.drug_name);
            if (drugInRecordIndex != -1) {
              drugsInRecord[drugInRecordIndex].quantity = drug.quantity;
              drugsInRecord[drugInRecordIndex].mini_unit = drug.mini_unit;
              drugsInRecord[drugInRecordIndex].expire_in = drug.expire_in;
              // console.log('------', drug.mini_unit, drugsInRecord[drugInRecordIndex].mini_unit)
            }

            if (drugInStockIndex != -1) {
              drugsInStock[drugInStockIndex].quantity = drug.quantity;
              drugsInStock[drugInStockIndex].mini_unit = drug.mini_unit;
              drugsInStock[drugInStockIndex].expire_in = drug.expire_in;
              toModifyStockDrugs.push(drugsInStock[drugInStockIndex]);
            }

          } else if (drug.to_action == 'r') {
            console.log('从入库记录中将药品信息删除', drug.drug_name);
            if (drugInRecordIndex != -1) {
              drugsInRecord.splice(drugInRecordIndex, 1);
            }
            if (drugInStockIndex != -1) {
              toRemoveStockDrugIds.push(drug.drugId);
            }
          }
        }

        console.log('drugInOutStock.drugs:', drugInStockBill.drugs);
        console.log('修改入库记录...');
        yield drugInStockBill.save();

        console.log('更新库存(增加)...');
        if (toAddStockDrugs.length > 0) {
          yield self.ctx.modelFactory().model_bulkInsert(self.ctx.models['psn_drugStock'], {
            rows: toAddStockDrugs
          })
        }

        console.log('更新库存(修改)...');
        for (var i = 0, len = toModifyStockDrugs.length; i < len; i++) {
          yield toModifyStockDrugs[i].save();
        }

        console.log('更新库存(删除)...');
        if (toRemoveStockDrugIds.length > 0) {
          yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_drugStock'], {
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
  allotdrugStockInRecordCheck: function (tenantId, elderlyId) {
    var self = this;
    return co(function *() {
        try {
            var drugsStockStatus = {};
            var drugStock = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                select: 'drugId drug_name quantity mini_unit expire_in drugInStockId',
                where: {
                    status: 1,
                    elderlyId: elderlyId,
                    tenantId: tenantId
                }
            }).populate('drugInStockId', 'type drugs');
            console.log('drugStock list:',drugStock);

            for(var i=0,len=drugStock.length;i<len;i++){
                if(drugStock[i].drugInStockId.type=='A0100'){
                    console.log('drugStock[i].drugInStockId.drugs:',drugStock[i].drugInStockId.drugs);
                    if(drugStock[i].drugInStockId.drugs[0].quantity!=drugStock[i].quantity){
                        drugsStockStatus[drugStock[i]._id]=false;
                    }else {
                        drugsStockStatus[drugStock[i]._id]=true;
                    }
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
  centerInStock: function (tenantId, inStockData, operated_by, open_id) {
    var self = this;
    return co(function *() {
      try {
          var tenant, drugData, drugObject;

          tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
          if (!tenant || tenant.status == 0) {
              return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
          }

          var drugs = inStockData.drugs;
          if (!drugs | drugs.length == 0) {
              return self.ctx.wrapper.res.error({message: '无法提供入库药品数据'});
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

          if (drugs.length != drugObjects.length) {
              return self.ctx.wrapper.res.error({message: '入库药品中包含无效的药品记录'});
          }

          var expire_date_check_flag = false;
          if (tenant.other_config) {
              expire_date_check_flag = !!tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
          }

          console.log('新增入库记录...');
          for (var i = 0, len = drugs.length; i < len; i++) {
              drugData = drugs[i];
              drugObject = self.ctx._.find(drugObjects, (o) => {
                  return o.id == drugData.drugId;
              });

              if (expire_date_check_flag) {
                  drugData.expires_in = expire_date_check_flag ? self.ctx.moment(drugData.expire_in) : undefined;
              }

              console.log('设置药品...', i);
              drugData.drug_name = drugObject.short_name || drugObject.full_name;

              if (expire_date_check_flag) {
                  console.log('需要检查效期...');
                  if (!drugData.expire_in) {
                      return self.ctx.wrapper.res.error({message: '入库药品的需要输入有效期，无法入库'});
                  }
              }

              console.log('检查最小使用单位...', i);
              if (!drugObject.mini_unit) {
                  console.log('没有设置最小使用单位,入库时设置')
                  drugObject.mini_unit = drugData.mini_unit;
                  yield drugObject.save();
              } else {
                  if (drugObject.mini_unit != drugData.mini_unit) {
                      return self.ctx.wrapper.res.error({message: '入库药品的最小使用单位与药品库不一致，无法入库:' + drugData.drug_name});
                  }
              }

              console.log('检查数量...', i);
              if (drugData.quantity == 0) {
                  return self.ctx.wrapper.res.error({message: '入库药品的数量为0，无法入库:' + drugData.drug_name});
              }
          }

          var drugInStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugInOutStock'], {
              code: self.ctx.modelVariables.SERVER_GEN,
              operated_by: operated_by,
              mode: inStockData.mode,
              type: inStockData.type,
              drugs: drugs,
              open_id: open_id,
              tenantId: tenantId
          });

          console.log('更新库存...');
          var drugStockRows = [], drug;
          for (var i = 0, len = drugInStock.drugs.length; i < len; i++) {
              drug = drugInStock.drugs[i];
              drugStockRows.push({
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
  centerOutStock:function (tenantId, outStockData, operated_by, open_id) {
    var self = this;
    return co(function *() {
      try {
        var tenant, elderly;
        tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
        if (!tenant || tenant.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
        }
        elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], outStockData.elderlyId);
        if (!elderly || elderly.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到出库药品对应的老人资料'});
        }
        if (!elderly.live_in_flag || elderly.begin_exit_flow) {
          return self.ctx.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法出库'});
        }
        var expire_date_check_flag = false;
        if (tenant.other_config) {
          expire_date_check_flag = !!tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
        }

        // 按片区配置 获取药品扫码出库方式
        var district = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_district'], elderly.room_value.districtId);
        if (!district || district.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到对应的片区'});
        }

        console.log('新增移库出库记录...');
        var drugOutStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugInOutStock'], {
          code: self.ctx.modelVariables.SERVER_GEN,
          operated_by: operated_by,
          type: 'B0100',
          mode: outStockData.mode,
          elderlyId: elderly._id,
          elderly_name: elderly.name,
          drugs: [outStockData.drug],
          open_id: open_id,
          tenantId: tenantId
        });


        console.log('更新中央库库存...');
        var outStockQuantity, drug, drugStocks,drugStock, drugOutStockIdsInDrugStock, drugOutStockIdIndex;
        drug = drugOutStock.drugs[0];
        outStockQuantity = drug.quantity;
        drugStocks = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
          select: 'quantity mini_unit drugOutStockIds',
          where: {
            status: 1,
            _id:outStockData.drug._id,  //outStockData.drug._id为出库药品在'psn_drugStock'数据库中的_id
            tenantId: tenantId
          },
          sort: {expire_in: 1}
        });
        drugStock = drugStocks[0];
        drugOutStockIdsInDrugStock = drugStock.drugOutStockIds || [];
        if (outStockQuantity == drugStock.quantity) {
          drugStock.status = 0;
        }
        drugStock.quantity -= outStockQuantity;
        drugOutStockIdIndex = self.ctx._.findIndex(drugOutStockIdsInDrugStock, (o) => {
          return o.toString() == drugOutStock._id.toString()
        });
        if (drugOutStockIdIndex == -1) {
          drugOutStockIdsInDrugStock.push(drugOutStock._id);
          drugStock.drugOutStockIds = drugOutStockIdsInDrugStock;
        }
        yield drugStock.save();


          console.log('新增老人库入库记录...');
          var drugInStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugInOutStock'], {
              code: self.ctx.modelVariables.SERVER_GEN,
              operated_by: operated_by,
              mode: outStockData.mode,
              type: outStockData.type,
              elderlyId: outStockData.elderlyId,
              elderly_name: elderly.name,
              drugs: [drug],
              open_id: open_id,
              tenantId: tenantId
          });


          var drugStockRows = [], drug;
          drug = drugInStock.drugs[0];
          console.log('更新老人库存...drugInStock expire_in:',drug.expire_in);
          drugStockRows.push({
              elderlyId: drugInStock.elderlyId,
              elderly_name: drugInStock.elderly_name,
              drugId: drug.drugId,
              drug_name: drug.drug_name,
              quantity: drug.quantity,
              mini_unit: drug.mini_unit,
              expire_in: drug.expire_in,
              drugInStockId: drugInStock._id,
              allotCenterOutStockId:drugOutStock._id,
              tenantId: tenantId
          });

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
  backoutAllotDrug:function (tenantId, drugStockRowData, operated_by) {
      var self = this;
      return co(function *() {
          try {
              var tenant, elderly , quantity=drugStockRowData.quantity;
              tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                  return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
              }
              var allotCenterOutStock = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugInOutStock'], drugStockRowData.allotCenterOutStockId);
              if (!allotCenterOutStock || allotCenterOutStock.status == 0) {
                  return self.ctx.wrapper.res.error({message: '出库记录不存在或已失效'});
              }
              if (operated_by) {
                  allotCenterOutStock.operated_by = operated_by;
              }

              var ret1= yield self.ctx.modelFactory().model_remove(self.ctx.models['psn_drugStock'], {_id:drugStockRowData._id});
              console.log('老人药品库存remove.....ret1:');

              var ret2= yield self.ctx.modelFactory().model_remove(self.ctx.models['psn_drugInOutStock'], {_id:drugStockRowData.drugInStockId._id});
              console.log('老人入库记录remove.....ret2:');

              var ret3= yield self.ctx.modelFactory().model_remove(self.ctx.models['psn_drugInOutStock'], {_id:drugStockRowData.allotCenterOutStockId});
              console.log('中央库出库记录remove.....ret3:');

              console.log('修改中央库药品库存量信息....');
              var drugStockRelatedCenterOutStockRecord = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                  select: 'status drugId drug_name quantity mini_unit expire_in drugOutStockIds',
                  where: {
                      drugOutStockIds: drugStockRowData.allotCenterOutStockId,
                      tenantId: tenantId
                  }
              });
              console.log('drugStockRelatedCenterOutStockRecord', drugStockRelatedCenterOutStockRecord);
              var centerDrugStock = drugStockRelatedCenterOutStockRecord[0];
              var drugStockRelatedCenterOutStockRecordIndex = self.ctx._.findIndex(drugStockRelatedCenterOutStockRecord, (o) => {
                  return o.drugId.toString() == drugStockRowData.drugId._id; // 前台传入数据的drugId因为被populate了 drugStockRowData.drugId
              });
              if (drugStockRelatedCenterOutStockRecordIndex != -1) {
                  console.log('中央库库存量修改(修改药品数量).....');
                  centerDrugStock.quantity += quantity;
                  centerDrugStock.status=1;
                  var drugOutStockIdsInDrugStock = centerDrugStock.drugOutStockIds;
                  var drugOutStockIdIndex = self.ctx._.findIndex(drugOutStockIdsInDrugStock, (o) => {
                      return o.toString() == drugStockRowData.allotCenterOutStockId
                  });
                  if (drugOutStockIdIndex != -1) {
                      console.log('删除中央库相关的出库id...');
                      drugOutStockIdsInDrugStock.splice(drugOutStockIdIndex, 1);
                      centerDrugStock.drugOutStockIds = drugOutStockIdsInDrugStock;
                  }
                  yield centerDrugStock.save();
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
  leftElderlyDrugStockSummary:function (tenantId,page) {
      var self = this;
      return co(function *() {
          try {
              var tenant, elderlys,elderlysDrugStock;
              tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                  return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
              }
              elderlys=yield self.ctx.modelFactory().model_query(self.ctx.models['psn_elderly'], {
                  select: 'name _id room_value',
                  where: {
                      status: 1,
                      live_in_flag:false,
                      tenantId: tenantId
                  },
                  sort: {expire_in: 1}
              });
              console.log('elderlys:',elderlys);

              var elderlyIds=[];
              for(var i=0,len=elderlys.length;i<len;i++){
                  elderlyIds.push(elderlys[i]._id);
              }
              console.log('elderlyIds:',elderlyIds);

              elderlysDrugStock = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                  page:page,
                  select: '_id elderly_name elderlyId drugId drug_name quantity mini_unit expire_in',
                  where: {
                      status: 1,
                      elderlyId:{ $in: elderlyIds}
                  },
                  sort: {elderly_name: 1}
              });
              console.log('elderlysDrugStock:',elderlysDrugStock);

              return self.ctx.wrapper.res.ret(elderlysDrugStock);
          }
          catch (e) {
              console.log(e);
              self.logger.error(e.message);
              return self.ctx.wrapper.res.error(e.message);
          }
      }).catch(self.ctx.coOnError);
  },
  scrapDrug:function (tenantId, scrapDrugData, operated_by, open_id) {
      var self = this;
      return co(function *() {
          try {
              var tenant,elderly,elderlyIds=[],elderlyIndex, outStockDatas=[];
              tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                  return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
              }

              //同一老人下报废药品数据合并
              for(var i=0,len=scrapDrugData.length;i<len;i++){
                if(elderlyIds.indexOf(scrapDrugData[i].elderlyId)==-1){
                    elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], scrapDrugData[i].elderlyId);
                    if (!elderly || elderly.status == 0) {
                        return self.ctx.wrapper.res.error({message: '无法找到出库药品对应的老人资料'});
                    }
                    elderlyIds.push(scrapDrugData[i].elderlyId);
                    outStockDatas.push({elderlyId:scrapDrugData[i].elderlyId,elderly_name:scrapDrugData[i].elderly_name,drugs:[scrapDrugData[i]]});
                }else {
                    elderlyIndex=elderlyIds.indexOf(scrapDrugData[i].elderlyId);
                    outStockDatas[elderlyIndex].drugs.push(scrapDrugData[i]);
                }
              }
              console.log('outStockDatas:',outStockDatas);

              var expire_date_check_flag = false;
              if (tenant.other_config) {
                  expire_date_check_flag = !!tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
              }

              for(var j=0,jLen=outStockDatas.length;j<jLen;j++) {
                  console.log('新增老人药品报废出库记录...');
                  var drugOutStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugInOutStock'], {
                      code: self.ctx.modelVariables.SERVER_GEN,
                      operated_by: operated_by,
                      type: 'B0003',
                      mode: 'A0003',
                      elderlyId: outStockDatas[j].elderlyId,
                      elderly_name: outStockDatas[j].elderly_name,
                      drugs: outStockDatas[j].drugs,
                      open_id: open_id,
                      tenantId: tenantId
                  });

                  console.log('老人报废药品库存清0...');
                  var drug, drugStocks, drugStock,drugOutStockIdsInDrugStock, drugOutStockIdIndex;
                  for (var k = 0, len = outStockDatas[j].drugs.length; k < len; k++) {
                      drug = outStockDatas[j].drugs[k];
                      drugStocks = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                          select: 'quantity mini_unit drugOutStockIds status',
                          where: {
                              _id: drug._id,
                              elderlyId: outStockDatas[j].elderlyId,
                              tenantId: tenantId
                          },
                          sort: {expire_in: 1}
                      });

                      drugStock = drugStocks[0];
                      drugOutStockIdsInDrugStock = drugStock.drugOutStockIds || [];
                      drugStock.quantity = 0;
                      drugStock.status = 0;
                      drugOutStockIdIndex = self.ctx._.findIndex(drugOutStockIdsInDrugStock, (o) => {
                          return o.toString() == drugOutStock._id.toString()
                      });
                      if (drugOutStockIdIndex == -1) {
                          drugOutStockIdsInDrugStock.push(drugOutStock._id);
                          drugStock.drugOutStockIds = drugOutStockIdsInDrugStock;
                      }
                      yield drugStock.save();
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
  allotToCenterStock:function (tenantId, allotDrugData, operated_by, open_id) {
      var self = this;
      return co(function *() {
          try {
              var tenant,elderly,elderlyIds=[],elderlyIndex, inStockDatas=[],drugStockRows = [];
              tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                  return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
              }

              //同一老人下调拨到中央库的药品数据合并
              for(var i=0,len=allotDrugData.length;i<len;i++){
                  if(elderlyIds.indexOf(allotDrugData[i].elderlyId)==-1){
                      elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], allotDrugData[i].elderlyId);
                      if (!elderly || elderly.status == 0) {
                          return self.ctx.wrapper.res.error({message: '无法找到出库药品对应的老人资料'});
                      }
                      elderlyIds.push(allotDrugData[i].elderlyId);
                      inStockDatas.push({elderlyId:allotDrugData[i].elderlyId,elderly_name:allotDrugData[i].elderly_name,drugs:[allotDrugData[i]]});
                  }else {
                      elderlyIndex=elderlyIds.indexOf(allotDrugData[i].elderlyId);
                      inStockDatas[elderlyIndex].drugs.push(allotDrugData[i]);
                  }
              }
              console.log('allotStockDatas:',inStockDatas);

              var expire_date_check_flag = false;
              if (tenant.other_config) {
                  expire_date_check_flag = !!tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
              }

              for(var j=0,jLen=inStockDatas.length;j<jLen;j++) {
                  console.log('新增老人药品调拨入中央库记录...');
                  var drugInStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugInOutStock'], {
                      code: self.ctx.modelVariables.SERVER_GEN,
                      operated_by: operated_by,
                      type: 'A0100',
                      mode: 'A0003',
                      drugs: inStockDatas[j].drugs,
                      open_id: open_id,
                      tenantId: tenantId
                  });

                  console.log('中央库存调整,老人库存清0...');
                  var drug, drugStocks, drugStock,drugOutStockIdsInDrugStock, drugOutStockIdIndex;
                  for (var k = 0, kLen = inStockDatas[j].drugs.length; k < kLen; k++) {
                      drug = inStockDatas[j].drugs[k];
                      //老人库存清0
                      drugStocks = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                          select: 'quantity mini_unit drugOutStockIds status',
                          where: {
                              _id: drug._id,
                              elderlyId: inStockDatas[j].elderlyId,
                              tenantId: tenantId
                          },
                          sort: {expire_in: 1}
                      });
                      drugStock = drugStocks[0];
                      drugOutStockIdsInDrugStock = drugStock.drugOutStockIds || [];
                      drugStock.quantity = 0;
                      drugStock.status = 0;
                      drugOutStockIdIndex = self.ctx._.findIndex(drugOutStockIdsInDrugStock, (o) => {
                          return o.toString() == drugInStock._id.toString()
                      });
                      if (drugOutStockIdIndex == -1) {
                          drugOutStockIdsInDrugStock.push(drugInStock._id);
                          drugStock.drugOutStockIds = drugOutStockIdsInDrugStock;
                      }
                      yield drugStock.save();

                      //中央库存调整
                      drugStockRows.push({
                          drugId: drug.drugId,
                          drug_name: drug.drug_name,
                          quantity: drug.quantity,
                          mini_unit: drug.mini_unit,
                          expire_in: drug.expire_in,
                          drugInStockId: drugInStock._id,
                          tenantId: tenantId
                      });
                  }
              }
              console.log('drugStockRows:',drugStockRows);
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
  outStock: function (tenantId, outStockData, operated_by, open_id) {
    //该方法已经废除
    var self = this;
    return co(function *() {
      try {
        var tenant, elderly;
        tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
        if (!tenant || tenant.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
        }
        elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], outStockData.elderlyId);
        if (!elderly || elderly.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到出库药品对应的老人资料'});
        }
        if (!elderly.live_in_flag || elderly.begin_exit_flow) {
          return self.ctx.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法出库'});
        }
        var expire_date_check_flag = false;
        if (tenant.other_config) {
          expire_date_check_flag = !!tenant.other_config.psn_drug_in_stock_expire_date_check_flag;
        }

        // 按片区配置 获取药品扫码出库方式
        var district = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_district'], elderly.room_value.districtId);
        if (!district || district.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到对应的片区'});
        }

        var elderlys_out_stock_check_mode = DIC.D3028.BY_PERIOD;
        if (district.config && district.config.elderlys_out_stock_check_mode) {
          elderlys_out_stock_check_mode = district.config.elderlys_out_stock_check_mode;
        }

        var drugs = outStockData.drugs;
        if (!drugs || drugs.length == 0) {
          return self.ctx.wrapper.res.error({message: '出库药品不能为空1'});
        }

        if (elderlys_out_stock_check_mode == DIC.D3028.BY_PERIOD) {
          console.log('按时间段一般不可能出现相同药');
          var drugObjects = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugDirectory'], {
            select: 'full_name short_name',
            where: {
              status: 1,
              _id: {
                $in: self.ctx._.map(drugs, (o) => {
                  return o.drugId;
                })
              }
            }
          });
          console.log('drugObjects:', drugObjects);
          if (drugs.length != drugObjects.length) {
            return self.ctx.wrapper.res.error({message: '出库药品中包含无效的药品记录'});
          }
        } else {
          console.log('按天,需要将相同的药合并');
          var grouped = self.ctx._.groupBy(drugs, (o) => {
            return o.drugId;
          });
          console.log('grouped:', grouped);
          var mergedDrugs = [], groupDrugs, toMerge;
          for (var key in grouped) {
            groupDrugs = grouped[key];
            toMerge = groupDrugs[0];
            if (groupDrugs.length > 1) {
              toMerge.quantity = self.ctx._.reduce(groupDrugs, (total, o) => {
                return total + o.quantity;
              }, 0);
            }
            mergedDrugs.push(toMerge);
          }
          console.log('drugs:', drugs.length);
          console.log('mergedDrugs:', mergedDrugs.length);
          drugs = mergedDrugs;
        }

        if (drugs.length == 0) {
          return self.ctx.wrapper.res.error({message: '出库药品不能为空2'});
        }


        console.log('检查库存是否满足出库要求...');
        var elderlyStockObject = yield self._elderlyStockObject(tenant, elderly);
        console.log('elderlyStockObject:', elderlyStockObject);
        var drugData, drugStock;
        for (var i = 0, len = drugs.length; i < len; i++) {
          drugData = drugs[i];
          drugStock = elderlyStockObject[drugData.drugId];
          if (!drugStock) {
            return self.ctx.wrapper.res.error({message: '出库药品' + (drugData.drug_name || '') + '库存为0'});
          }
          if (drugStock.total < drugData.quantity) {
            return self.ctx.wrapper.res.error({message: '出库药品' + (drugData.drug_name || '') + '库存不足'});
          }
        }


        console.log('新增出库记录...');
        var drugOutStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugInOutStock'], {
          code: self.ctx.modelVariables.SERVER_GEN,
          operated_by: operated_by,
          type: outStockData.type,
          mode: outStockData.mode,
          elderlyId: elderly._id,
          elderly_name: elderly.name,
          drugs: drugs,
          open_id: open_id,
          tenantId: tenantId
        });

        console.log('更新库存...');
        var outStockQuantity, drug, drugStocks, drugOutStockIdsInDrugStock, drugOutStockIdIndex;
        for (var i = 0, len = drugOutStock.drugs.length; i < len; i++) {
          drug = drugOutStock.drugs[i];

          outStockQuantity = drug.quantity;
          drugStocks = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
            select: 'quantity mini_unit drugOutStockIds',
            where: {
              status: 1,
              drugId: drug.drugId,
              elderlyId: elderly._id,
              tenantId: tenantId
            },
            sort: {expire_in: 1}
          });
          for (var j = 0, jLen = drugStocks.length; j < jLen; j++) {
            drugStock = drugStocks[j];
            drugOutStockIdsInDrugStock = drugStock.drugOutStockIds || [];
            if (outStockQuantity >= drugStock.quantity) {
              outStockQuantity -= drugStock.quantity;
              drugStock.quantity = 0;
              drugStock.status = 0;
            } else {
              drugStock.quantity -= outStockQuantity;
              outStockQuantity = 0;
            }

            drugOutStockIdIndex = self.ctx._.findIndex(drugOutStockIdsInDrugStock, (o) => {
              return o.toString() == drugOutStock._id.toString()
            });
            if (drugOutStockIdIndex == -1) {
              drugOutStockIdsInDrugStock.push(drugOutStock._id);
              drugStock.drugOutStockIds = drugOutStockIdsInDrugStock;
            }

            yield drugStock.save();

            if (outStockQuantity <= 0) {
              break;
            }
          }
        }
        console.log('如果有药品不足,则生成通知...');
        var lowStockDrugStats = [], drugStockStat;
        for (var drugId in elderlyStockObject) {
          drugStockStat = elderlyStockObject[drugId];
          if (drugStockStat.is_warning) {
            lowStockDrugStats.push(drugStockStat);
          }
        }
        if (lowStockDrugStats.length > 0) {
          self.ctx.pub_alarm_service.saveLowStockDrugsAlarmForElderly(lowStockDrugStats, elderly)
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
  _getTenantAndElderly: function (tenantId, elderlyId) {
    var self = this;
    return co(function *() {
      try {
        var tenant, elderly;
        tenantId && ( tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId));
        if (!tenant || tenant.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
        }
        elderlyId && (elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId));
        if (!elderly || elderly.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到出库药品对应的老人资料'});
        }
        if (!elderly.live_in_flag || elderly.begin_exit_flow) {
          return self.ctx.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法出库'});
        }

        return self.ctx.wrapper.res.ret({t: tenant, e: elderly});
      }
      catch (e) {
        console.log(e);
        self.logger.error(e.message);
        return self.ctx.wrapper.res.error(e.message);
      }
    }).catch(self.ctx.coOnError);
  },
  outStockByPeriod: function (tenantId, outStockData, operated_by, open_id) {
    var self = this;
    return co(function *() {
      try {
        console.log('outStockByPeriod---', outStockData);
        var tae = yield self._getTenantAndElderly(tenantId, outStockData.elderlyId);
        if(!tae.success){
          return tae
        }
        var tenant = tae.ret.t, elderly = tae.ret.e;

        var drugs = outStockData.drugs;
        if (!drugs || drugs.length == 0) {
          return self.ctx.wrapper.res.error({message: 'outStockByPeriod:出库药品不能为空'});
        }



        /* 此处将出库药品和药品目录再次对比,考虑到性能原因,将检测前置到客户端
         console.log('按时间段一般不可能出现相同药');
        var drugTotals = yield self.ctx.modelFactory().model_totals(self.ctx.models['psn_drugDirectory'], {
          status: 1,
          _id: {
            $in: self.ctx._.map(drugs, (o) => {
              return o.drugId;
            })
          }
        });
        if (drugs.length != drugTotals) {
          return self.ctx.wrapper.res.error({message: 'outStockByPeriod:出库药品中包含无效的药品记录'});
        }
        */
        return yield self._outStockAtom(tenant, elderly, outStockData.type, outStockData.mode, outStockData.drugs, operated_by, open_id);
      }
      catch (e) {
        console.log(e);
        self.logger.error(e.message);
        return self.ctx.wrapper.res.error(e.message);
      }
    }).catch(self.ctx.coOnError);
  },
  outStockByDay: function (tenantId, outStockType, outStockMode, operated_by, open_id) {
    var self = this;
    return co(function *() {
      try {
        var tae = yield self._getTenantAndElderly(tenantId, outStockData.elderlyId);
        if (!tae.success) {
          return tae
        }
        var tenant = tae.ret.t, elderly = tae.ret.e;
        var drugs = [];

        //获取用药计划
        var elderlyDrugUseItems = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugUseItem'], {
          select: 'drugId name quantity unit repeat_values',
          where: {
            status: 1,
            elderlyId: elderly._id,
            repeat_type: 'A0003',
            stop_flag: false,
            tenantId: tenantId
          }
        });

        var drugs = self.ctx._.map(elderlyDrugUseItems, o => ({
          drugId: o.drugId,
          drug_name: o.name, //drugDirectory没有short_name时使用full_name
          quantity: (o.repeat_values || []).length * o.quantity,
          mini_unit: o.unit
        }));

        console.log('drugs:', drugs)

        return yield self._outStockAtom(tenant, elderly, outStockType, outStockMode, drugs, operated_by, open_id);
      }
      catch (e) {
        console.log(e);
        self.logger.error(e.message);
        return self.ctx.wrapper.res.error(e.message);
      }
    }).catch(self.ctx.coOnError);
  },
  _outStockAtom: function (tenant, elderly, outStockType, outStockMode, drugs, operated_by, open_id) {
    var self = this;
    return co(function *() {
      try {
        if (!drugs || drugs.length == 0) {
          return self.ctx.wrapper.res.error({message: '_outStockAtom:出库药品不能为空'});
        }

        console.log('检查库存是否满足出库要求...', tenant);
        var elderlyStockObject = yield self._elderlyStockObject(tenant, elderly);
        console.log('elderlyStockObject:', elderlyStockObject);
        var drugData, drugStock, drugIds;
        for (var i = 0, len = drugs.length; i < len; i++) {
          drugData = drugs[i];
          drugIds.push(drugData.drugId.toString())
          drugStock = elderlyStockObject[drugData.drugId];
          if (!drugStock) {
            return self.ctx.wrapper.res.error({message: '出库药品' + (drugData.drug_name || '') + '库存为0'});
          }
          if (drugStock.total < drugData.quantity) {
            return self.ctx.wrapper.res.error({message: '出库药品' + (drugData.drug_name || '') + '库存不足'});
          }
        }


        console.log('新增出库记录...');
        var drugOutStock = yield self.ctx.modelFactory().model_create(self.ctx.models['psn_drugInOutStock'], {
          code: self.ctx.modelVariables.SERVER_GEN,
          operated_by: operated_by,
          type: outStockType,
          mode: outStockMode,
          elderlyId: elderly._id,
          elderly_name: elderly.name,
          drugs: drugs,
          open_id: open_id,
          tenantId: tenant._id
        });

        console.log('更新库存...');
        var outStockQuantity, drug, drugStocks, drugOutStockIdsInDrugStock, drugOutStockIdIndex;
        for (var i = 0, len = drugOutStock.drugs.length; i < len; i++) {
          drug = drugOutStock.drugs[i];

          outStockQuantity = drug.quantity;
          drugStocks = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
            select: 'quantity mini_unit drugOutStockIds',
            where: {
              status: 1,
              drugId: drug.drugId,
              elderlyId: elderly._id,
              tenantId: tenant._id
            },
            sort: {expire_in: 1}
          });
          for (var j = 0, jLen = drugStocks.length; j < jLen; j++) {
            drugStock = drugStocks[j];
            drugOutStockIdsInDrugStock = drugStock.drugOutStockIds || [];
            if (outStockQuantity >= drugStock.quantity) {
              outStockQuantity -= drugStock.quantity;
              drugStock.quantity = 0;
              drugStock.status = 0;
            } else {
              drugStock.quantity -= outStockQuantity;
              outStockQuantity = 0;
            }

            drugOutStockIdIndex = self.ctx._.findIndex(drugOutStockIdsInDrugStock, (o) => {
              return o.toString() == drugOutStock._id.toString()
            });
            if (drugOutStockIdIndex == -1) {
              drugOutStockIdsInDrugStock.push(drugOutStock._id);
              drugStock.drugOutStockIds = drugOutStockIdsInDrugStock;
            }

            yield drugStock.save();

            if (outStockQuantity <= 0) {
              break;
            }
          }
        }
        console.log('如果有药品不足,则生成通知...');
        var lowStockDrugStats = [], drugStockStat;
        for (var drugId in elderlyStockObject) {
          drugStockStat = elderlyStockObject[drugId];
          if (drugStockStat.is_warning) {
            //判断库存不足后还需要判断该药没有被停用,还在出库
            if (self.ctx._.contains(drugIds, drugId.toString())) {
              lowStockDrugStats.push(drugStockStat);
            }
          }
        }
        if (lowStockDrugStats.length > 0) {

          console.log('准备生成通知...', lowStockDrugStats);
          var retid = yield self.ctx.pub_alarm_service.saveLowStockDrugsAlarmForElderly(lowStockDrugStats, elderly);
          if(!retid){
            return self.ctx.wrapper.res.default('出库成功,但是生成通知失败,请检查通知模版是否有不符合的模版字段');
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
  updateOutStock: function (tenantId, drugInOutStockId, outStockData, operated_by) {
    var self = this;
    return co(function *() {
      try {

        var tenant, elderly;
        tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
        if (!tenant || tenant.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
        }
        elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], outStockData.elderlyId);
        if (!elderly || elderly.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到出库药品对应的老人资料'});
        }
        if (!elderly.live_in_flag || elderly.begin_exit_flow) {
          return self.ctx.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法出库'});
        }

        var drugOutStock = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugInOutStock'], drugInOutStockId);
        if (!drugOutStock || drugOutStock.status == 0) {
          return self.ctx.wrapper.res.error({message: '出库记录不存在或已失效'});
        }

        drugOutStock.type = outStockData.type;
        drugOutStock.mode = outStockData.mode;
        if (operated_by) {
          drugOutStock.operated_by = operated_by;
        }

        var drugStockRelatedOutStockRecord = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
          select: 'status drugId drug_name quantity mini_unit expire_in',
          where: {
            drugOutStockIds: drugInOutStockId,
            tenantId: tenantId
          }
        });

        var elderlyStockObject = yield self._elderlyStockObject(tenant, elderly);

        var drugsInRecord = drugOutStock.drugs, drugs = outStockData.drugs, drugInRecordIndex, drugData,
          drugStockRelatedOutStockRecordIndex, drugStock, old_quantity, new_quantity;
        var toAddStockDrugs = [], toModifyStockDrugs = [], toRemoveStockDrugs = [];
        for (var i = 0, len = drugs.length; i < len; i++) {
          drugData = drugs[i];
          drugStock = elderlyStockObject[drugData.drugId];
          drugInRecordIndex = self.ctx._.findIndex(drugsInRecord, (o) => {
            return o.drugId.toString() == drugData.drugId;
          });
          drugStockRelatedOutStockRecordIndex = self.ctx._.findIndex(drugStockRelatedOutStockRecord, (o) => {
            return o.drugId.toString() == drugData.drugId;
          });
          if (drugData.to_action == 'a') {
            console.log('药品加入到出库记录中,检查该药品库存是否满足', drugData.drug_name);
            if (!drugStock) {
              return self.ctx.wrapper.res.error({message: '新增出库药品' + (drugData.drug_name || '') + '库存为0'});
            }
            if (drugStock.total < drugData.quantity) {
              return self.ctx.wrapper.res.error({message: '新增出库药品' + (drugData.drug_name || '') + '库存不足'});
            }
            if (drugInRecordIndex == -1) {
              drugsInRecord.push(drugData);
            }
            if (drugStockRelatedOutStockRecordIndex == -1) {
              console.log('库存量修改(新增一种药品)', drugData.drug_name);
              toAddStockDrugs.push(drugData);
            }
          } else if (drugData.to_action == 'm') {
            console.log('在出库记录中的药品信息修改', drugData.drug_name);
            if (drugInRecordIndex != -1) {
              // 计算
              var stockQuantityInFact;
              if (!drugStock) {
                stockQuantityInFact = drugsInRecord[drugInRecordIndex].quantity;
              } else {
                stockQuantityInFact = drugStock.total + drugsInRecord[drugInRecordIndex].quantity;
              }
              if (stockQuantityInFact < drugData.quantity) {
                return self.ctx.wrapper.res.error({message: '修改出库药品' + (drugData.drug_name || '') + '库存不足'});
              }

              old_quantity = drugsInRecord[drugInRecordIndex].quantity;
              new_quantity = drugData.quantity;

              drugsInRecord[drugInRecordIndex].quantity = drugData.quantity;
              drugsInRecord[drugInRecordIndex].mini_unit = drugData.mini_unit;
              drugsInRecord[drugInRecordIndex].expire_in = drugData.expire_in;
            }

            if (drugStockRelatedOutStockRecordIndex != -1) {
              console.log('库存量修改(修改药品数量)', drugData.drug_name);
              if (old_quantity != new_quantity) {
                toModifyStockDrugs.push({
                  drugId: drugData.drugId,
                  old_quantity: old_quantity,
                  new_quantity: new_quantity
                });
              }
            }

          } else if (drugData.to_action == 'r') {
            console.log('从出库记录中将药品信息删除', drugData.drug_name);
            if (drugInRecordIndex != -1) {
              drugsInRecord.splice(drugInRecordIndex, 1);
            }
            if (drugStockRelatedOutStockRecordIndex != -1) {
              console.log('库存回滚', drugData.drug_name);
              toRemoveStockDrugs.push(drugData);
            }
          }
        }

        console.log('drugInOutStock.drugs:', drugOutStock.drugs);
        console.log('修改入库记录...');
        yield drugOutStock.save();

        console.log('toAddStockDrugs:', toAddStockDrugs);
        console.log('toModifyStockDrugs:', toModifyStockDrugs);
        console.log('toRemoveStockDrugs:', toRemoveStockDrugs);


        var drugStocksForElderly, drugOutStockIdsInDrugStock, outStockQuantity, rollbackStockQuantity;
        var toRollbackItemQuantity, drugStockInBill, drugOutStockIdIndex, isRemoveStockInOutIdFromStockItem;
        if (toAddStockDrugs.length > 0) {
          console.log('更新库存(新增药品)...');
          for (var i = 0, len = toAddStockDrugs.length; i < len; i++) {
            drugData = toAddStockDrugs[i];
            outStockQuantity = drugData.quantity;
            drugStocksForElderly = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
              select: 'quantity mini_unit drugOutStockIds',
              where: {
                status: 1,
                drugId: drugData.drugId,
                elderlyId: elderly._id,
                tenantId: tenantId
              },
              sort: {expire_in: 1}
            });

            console.log('drugStocksForElderly:', drugStocksForElderly);

            for (var j = 0, jLen = drugStocksForElderly.length; j < jLen; j++) {
              drugStock = drugStocksForElderly[j];
              drugOutStockIdsInDrugStock = drugStock.drugOutStockIds || [];
              if (outStockQuantity >= drugStock.quantity) {
                outStockQuantity -= drugStock.quantity;
                drugStock.quantity = 0;
                drugStock.status = 0;
              } else {
                drugStock.quantity -= outStockQuantity;
                outStockQuantity = 0;
              }

              drugOutStockIdIndex = self.ctx._.findIndex(drugOutStockIdsInDrugStock, (o) => {
                return o.toString() == drugInOutStockId
              });
              if (drugOutStockIdIndex == -1) {
                drugOutStockIdsInDrugStock.push(drugOutStock._id);
                drugStock.drugOutStockIds = drugOutStockIdsInDrugStock;
              }

              console.log('insert drugStock:', drugStock);

              yield drugStock.save();

              if (outStockQuantity <= 0) {
                break;
              }
            }
          }
        }


        if (toModifyStockDrugs.length > 0) {
          console.log('更新库存(修改药品数量)...');
          var isRollback;
          for (var i = 0, len = toModifyStockDrugs.length; i < len; i++) {
            drugData = toModifyStockDrugs[i];
            isRollback = drugData.old_quantity > drugData.new_quantity;
            if (isRollback) {
              rollbackStockQuantity = drugData.old_quantity - drugData.new_quantity;

              drugStocksForElderly = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                select: 'quantity mini_unit drugInStockId drugOutStockIds',
                where: {
                  drugId: drugData.drugId,
                  elderlyId: elderly._id,
                  drugOutStockIds: drugInOutStockId,
                  tenantId: tenantId
                },
                sort: {expire_in: -1} //补偿应该是倒序
              }).populate('drugInStockId', 'drugs');

              for (var j = 0, jLen = drugStocksForElderly.length; j < jLen; j++) {
                drugStock = drugStocksForElderly[j];
                drugStockInBill = self.ctx._.find(drugStock.drugInStockId.drugs, (o) => {
                  return o.drugId.toString() == drugData.drugId
                });
                if (drugStockInBill) {
                  toRollbackItemQuantity = drugStockInBill.quantity - drugStock.quantity;
                  if (rollbackStockQuantity >= toRollbackItemQuantity) {
                    rollbackStockQuantity -= toRollbackItemQuantity;
                    drugStock.quantity += toRollbackItemQuantity;
                    isRemoveStockInOutIdFromStockItem = true;
                  } else {
                    drugStock.quantity += rollbackStockQuantity;
                    rollbackStockQuantity = 0;
                    isRemoveStockInOutIdFromStockItem = false;
                  }
                  drugStock.status = 1;
                  if (isRemoveStockInOutIdFromStockItem) {
                    drugOutStockIdsInDrugStock = drugStock.drugOutStockIds;
                    drugOutStockIdIndex = self.ctx._.findIndex(drugOutStockIdsInDrugStock, (o) => {
                      return o.toString() == drugInOutStockId
                    });
                    if (drugOutStockIdIndex != -1) {
                      drugOutStockIdsInDrugStock.splice(drugOutStockIdIndex, 1);
                      drugStock.drugOutStockIds = drugOutStockIdsInDrugStock;
                    }
                  }
                  yield drugStock.save();

                  if (rollbackStockQuantity <= 0) {
                    break;
                  }
                }
              }
            } else {
              outStockQuantity = drugData.new_quantity - drugData.old_quantity;
              drugStocksForElderly = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                select: 'quantity mini_unit drugOutStockIds',
                where: {
                  status: 1,
                  drugId: drugData.drugId,
                  elderlyId: elderly._id,
                  tenantId: tenantId
                },
                sort: {expire_in: 1}
              });

              for (var j = 0, jLen = drugStocksForElderly.length; j < jLen; j++) {
                drugStock = drugStocksForElderly[j];
                drugOutStockIdsInDrugStock = drugStock.drugOutStockIds || [];
                if (outStockQuantity >= drugStock.quantity) {
                  outStockQuantity -= drugStock.quantity;
                  drugStock.quantity = 0;
                  drugStock.status = 0;
                } else {
                  drugStock.quantity -= outStockQuantity;
                  outStockQuantity = 0;
                }

                drugOutStockIdIndex = self.ctx._.findIndex(drugOutStockIdsInDrugStock, (o) => {
                  return o.toString() == drugInOutStockId
                });
                if (drugOutStockIdIndex == -1) {
                  drugOutStockIdsInDrugStock.push(drugOutStock._id);
                  drugStock.drugOutStockIds = drugOutStockIdsInDrugStock;
                }

                yield drugStock.save();

                if (outStockQuantity <= 0) {
                  break;
                }
              }
            }
          }
        }


        if (toRemoveStockDrugs.length > 0) {
          console.log('更新库存(回滚药品数量)...');
          for (var i = 0, len = toRemoveStockDrugs.length; i < len; i++) {
            drugData = toRemoveStockDrugs[i];
            rollbackStockQuantity = drugData.quantity;
            drugStocksForElderly = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
              select: 'quantity mini_unit drugInStockId drugOutStockIds',
              where: {
                drugId: drugData.drugId,
                elderlyId: elderly._id,
                drugOutStockIds: drugInOutStockId,
                tenantId: tenantId
              },
              sort: {expire_in: -1} //补偿应该是倒序
            }).populate('drugInStockId', 'drugs');

            for (var j = 0, jLen = drugStocksForElderly.length; j < jLen; j++) {
              drugStock = drugStocksForElderly[j];
              drugStockInBill = self.ctx._.find(drugStock.drugInStockId.drugs, (o) => {
                return o.drugId.toString() == drugData.drugId
              });
              if (drugStockInBill) {
                toRollbackItemQuantity = drugStockInBill.quantity - drugStock.quantity;
                if (rollbackStockQuantity >= toRollbackItemQuantity) {
                  rollbackStockQuantity -= toRollbackItemQuantity;
                  drugStock.quantity += toRollbackItemQuantity;
                } else {
                  drugStock.quantity += rollbackStockQuantity;
                  rollbackStockQuantity = 0;
                }

                isRemoveStockInOutIdFromStockItem = true; //删除要必定是从对应的库存条目中移除出库单Id
                drugStock.status = 1;

                if (isRemoveStockInOutIdFromStockItem) {
                  drugOutStockIdsInDrugStock = drugStock.drugOutStockIds;
                  drugOutStockIdIndex = self.ctx._.findIndex(drugOutStockIdsInDrugStock, (o) => {
                    return o.toString() == drugInOutStockId
                  });
                  if (drugOutStockIdIndex != -1) {
                    drugOutStockIdsInDrugStock.splice(drugOutStockIdIndex, 1);
                    drugStock.drugOutStockIds = drugOutStockIdsInDrugStock;
                  }
                }

                yield drugStock.save();

                if (rollbackStockQuantity <= 0) {
                  break;
                }
              }
            }
          }
        }


        console.log('修改时不去生成药品不足通知,...');
        // 修改时要按照库存+出库药品数量来计算剩余天数
        // var lowStockDrugStats = [], drugStockStat;
        // for(var drugId in elderlyStockObject) {
        //     drugStockStat = elderlyStockObject[drugId];
        //     if(drugStockStat.is_warning) {
        //         lowStockDrugStats.push(drugStockStat);
        //     }
        // }
        // if(lowStockDrugStats.length>0){
        //     self.ctx.pub_alarm_service.saveLowStockDrugsAlarmForElderly(lowStockDrugStats, elderly)
        // }

        return self.ctx.wrapper.res.default();
      }
      catch (e) {
        console.log(e);
        self.logger.error(e.message);
        return self.ctx.wrapper.res.error(e.message);
      }
    }).catch(self.ctx.coOnError);
  },
  updateMiniUnitOfDrugStockItem: function (tenantId, elderlyId, drugStockId, new_mini_unit, operated_by) {
    var self = this;
    return co(function *() {
      try {

        var drugStockItem = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugStock'], drugStockId);
        if (!drugStockItem || drugStockItem.status == 0) {
          return self.ctx.wrapper.res.error({message: '库存记录不存在或已失效'});
        }
        if (drugStockItem.tenantId.toString() != tenantId) {
          return self.ctx.wrapper.res.error({message: '库存记录所属机构不一致'});
        }
        if (drugStockItem.elderlyId.toString() != elderlyId) {
          return self.ctx.wrapper.res.error({message: '库存记录所属机构下的老人不一致'});
        }
        if (drugStockItem.mini_unit == new_mini_unit) {
          return self.ctx.wrapper.res.error({message: '库存记录最小单位没有变化,无需修改'});
        }
        var drugIdOfStockItem = drugStockItem.drugId.toString();
        var drugInStockId = drugStockItem.drugInStockId;
        var drugOutStockIds = drugStockItem.drugOutStockIds;
        drugStockItem.mini_unit = new_mini_unit;
        if (operated_by) {
          drugStockItem.operated_by = operated_by;
        }
        yield drugStockItem.save()

        console.log('查找库存记录对应的入库单,修改入库记录中的最小单位,...');
        var drugInStock = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugInOutStock'], drugInStockId);
        var inDrugs = drugInStock.drugs;
        for(var i=0, len = inDrugs.length;i<len; i++){
          if(inDrugs[i].drugId.toString() == drugIdOfStockItem){
            inDrugs[i].mini_unit = new_mini_unit;
          }
        }
        yield drugInStock.save()

        console.log('查找库存记录对应的出库单,修改入库记录中的最小单位,...');
        var drugOutStocks = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugInOutStock'], {
          select: 'drugs',
          where: {
            _id: {$in: drugOutStockIds},
            elderlyId: elderlyId,
            tenantId: tenantId
          }
        });

        var drugOutStock, outDrugs;
        for(var i=0, iLen = drugOutStocks.length;i<iLen; i++){
          drugOutStock = drugOutStocks[i];
          outDrugs = drugOutStock.drugs;
          for(var j=0, jLen = outDrugs.length;j<jLen; j++){
            if(outDrugs[j].drugId.toString() == drugIdOfStockItem){
              outDrugs[j].mini_unit = new_mini_unit;
            }
          }
          yield drugOutStock.save()
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
  queryCenterStockAllotRecords:function (tenantId,page) {
      var self = this;
      return co(function *() {
          try {
              var tenant,allotRecords,allotInItems;
              tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                  return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
              }

              allotRecords = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugInOutStock'], {
                  page:page,
                  where: {
                      status:1,
                      $or:[
                          {$and:[
                              {type:'A0100'},
                              {elderlyId:{$in: [null, undefined]}}
                              ]
                          },
                          {type:'B0100'}
                          ],
                      tenantId: tenantId
                  },
                  sort: {check_in_time: -1}
              });
              console.log('allotRecords:',allotRecords);

              for(var i=0,len=allotRecords.length;i<len;i++){
                  if(!allotRecords[i].elderlyId){
                      allotInItems = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
                          select: 'elderly_name drugOutStockIds',
                          where: {
                              drugOutStockIds:allotRecords[i]._id
                          }
                      });
                      console.log('allotInItems:',allotInItems);
                      allotRecords[i].elderly_name=allotInItems[0].elderly_name;
                      // console.log('allotRecords[i]:',allotRecords[i]);
                  }
              }
              return self.ctx.wrapper.res.ret(allotRecords);
          }
          catch (e) {
              console.log(e);
              self.logger.error(e.message);
              return self.ctx.wrapper.res.error(e.message);
          }
      }).catch(self.ctx.coOnError);
  },
  elderlyStockList: function (tenantId, elderlyId) {//同类药品不合并显示
    var self = this;
    return co(function *() {
      try {
        // var tenant, elderly;
        // tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
        // if (!tenant || tenant.status == 0) {
        //     return self.ctx.wrapper.res.error({ message: '无法找到养老机构' });
        // }
        // elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
        // if (!elderly || elderly.status == 0) {
        //     return self.ctx.wrapper.res.error({ message: '无法找到入库药品对应的老人资料' });
        // }
        // if (!elderly.live_in_flag || elderly.begin_exit_flow) {
        //     return self.ctx.wrapper.res.error({ message: '当前老人不在院或正在办理出院手续' });
        // }
        var drugsInStock = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugStock'], {
          select: 'drugId drug_name quantity mini_unit check_in_time expire_in drugInStockId allotCenterOutStockId',
          where: {
            status: 1, // 隐式包含了quantity>0
            elderlyId: elderlyId,
            tenantId: tenantId
          },
          sort: {check_in_time: 1, expire_in: 1}
        }).populate('drugInStockId', 'type').populate('drugId', 'full_name');

        return self.ctx.wrapper.res.rows(drugsInStock);
      }
      catch (e) {
        console.log(e);
        self.logger.error(e.message);
        return self.ctx.wrapper.res.error(e.message);
      }
    }).catch(self.ctx.coOnError);
  },
  elderlyDrugUseMergedWithStockList: function (tenantId, elderlyId) {
    var self = this;
    return co(function *() {
      try {
        var tae = yield self._getTenantAndElderly(tenantId, elderlyId);
        if (!tae.success) {
          return tae
        }
        var tenant = tae.ret.t, elderly = tae.ret.e;

        //按天汇总
        var drugUseItemsOfDay = yield self.ctx.modelFactory().model_aggregate(self.ctx.models['psn_drugUseItem'], [
          {
            $match: {
              status: 1, // 隐式包含了quantity>0
              repeat_type: DIC.D0103.TIME_IN_DAY,
              elderlyId: elderly._id,
              stop_flag: false,
              tenantId: tenant._id
            }
          },
          {
            $project: {
              drugId: 1,
              repeat_count: {$cond: {if: {$eq: [{$size: '$repeat_values'}, 0]}, then: 1, else: {$size: '$repeat_values'}}},
              quantity: 1,
              unit: 1,
              description: 1
            }
          },
          {
            $group: {
              _id: {drugId:'$drugId', unit: '$unit'},
              description: {$first: '$description'},
              quantity: {$sum: {$multiply: [ "$repeat_count", "$quantity" ]}}
            }
          },
          {
            $lookup: {
              from: "psn_drugDirectory",
              localField: "_id.drugId",
              foreignField: "_id",
              as: "drug"
            }
          },
          {
            $unwind: '$drug'
          },
          {
            $project: {
              _id: 0,
              drugId: '$_id.drugId',
              mini_unit: '$_id.unit',
              name: '$drug.full_name',
              img: '$drug.img',
              description: 1,
              quantity: 1,
            }
          }
        ]);
        // console.log('drugUseItemsOfDay:', drugUseItemsOfDay);
        //按周汇总
        var weekDay = self.ctx.moment().day();
        // console.log('weekDay:', weekDay);
        var drugUseItemsOfWeek = yield self.ctx.modelFactory().model_aggregate(self.ctx.models['psn_drugUseItem'], [
          {
            $match: {
              status: 1, // 隐式包含了quantity>0
              repeat_type: DIC.D0103.DAY_IN_WEEK,
              elderlyId: elderly._id,
              stop_flag: false,
              tenantId: tenant._id
            }
          },
          {
            $project: {
              drugId: 1,
              quantity: 1,
              unit: 1,
              description: 1,
              repeat_week_day: {
                $size: {
                  $filter: {
                    input: "$repeat_values",
                    as: "repeat_value",
                    cond: {$eq: ["$$repeat_value", weekDay]}
                  }
                }
              }
            }
          },
          {
            $match: {
              repeat_week_day: {$gt: 0}
            }
          },
          {
            $group: {
              _id: {drugId:'$drugId', unit: '$unit'},
              // repeat_week_day:  {$first: '$repeat_week_day'},
              description: {$first: '$description'},
              quantity: {$sum: '$quantity'}
            }
          },
          {
            $lookup: {
              from: "psn_drugDirectory",
              localField: "_id.drugId",
              foreignField: "_id",
              as: "drug"
            }
          },
          {
            $unwind: '$drug'
          },
          {
            $project: {
              _id: 0,
              drugId: '$_id.drugId',
              mini_unit: '$_id.unit',
              name: '$drug.full_name',
              img: '$drug.img',
              // repeat_week_day: 1,
              description: 1,
              quantity: 1,
            }
          }
        ]);
        // console.log('drugUseItemsOfWeek:', drugUseItemsOfWeek);
        var elderlyStockObject = yield self._elderlyStockObject(tenant, elderly);

        self.ctx._.each(drugUseItemsOfWeek, (o) => {
          if(o.quantity > 0) {
            var row = self.ctx._.find(drugUseItemsOfDay, (o2)=> o2.drugId.toString() == o.drugId.toString());
            if(row){
              row.quantity += o.quantity
            } else {
              drugUseItemsOfDay.push(o);
            }
          }
        });

        var rows = self.ctx._.map(drugUseItemsOfDay, (o) => {
          o.stock_num = (elderlyStockObject[o.drugId] || { total:0 }).total;
          // console.log('map -> ',o)
          return o;
        });

        // console.log('elderlyDrugUseMergedWithStockList:', rows);

        return self.ctx.wrapper.res.rows(rows);
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
          return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
        }
        elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
        if (!elderly || elderly.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到入库药品对应的老人资料'});
        }
        if (!elderly.live_in_flag || elderly.begin_exit_flow) {
          return self.ctx.wrapper.res.error({message: '当前老人不在院或正在办理出院手续'});
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

        var rows = self.ctx._.map(drugUseItems, (o) => {
          var obj = o.toObject();
          obj.stock = elderlyStockObject[o.drugId] || {total: 0, is_danger: true, is_warning: false};
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
  elderlyStockQuery: function (tenantId, elderlyId, keyword,statusFlag) { //同类药品合并显示
    var self = this;
    return co(function *() {
      try {

        var tenant, elderly;
        tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
        if (!tenant || tenant.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
        }
        elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
        if (!elderly || elderly.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到入库药品对应的老人资料'});
        }
        if (!elderly.live_in_flag || elderly.begin_exit_flow) {
          return self.ctx.wrapper.res.error({message: '当前老人不在院或正在办理出院手续'});
        }
        var where = {
          elderlyId: elderly._id,
          tenantId: tenant._id
        };
        if(!statusFlag){
          where.status=1; // 隐式包含了quantity>0
        }
        if (tenant.other_config.psn_drug_in_stock_expire_date_check_flag) {
          where.expire_in = {'$gte': self.ctx.moment(self.ctx.moment(), 'YYYY-MM-DD').toDate()};
        }
        if (keyword) {
          var keywordReg = new RegExp(keyword);
          where.drug_name = keywordReg;
        }
        var drugsInStock = yield self.ctx.modelFactory().model_aggregate(self.ctx.models['psn_drugStock'], [
          {
            $match: where
          },

          {
            $group: {
              _id: {drugId: '$drugId', unit: '$mini_unit'},
              drugId: {$first: "$drugId"},
              unit: {$first: "$mini_unit"},
              quantity: {$sum: '$quantity'},
              min_expire_in: {$min: '$expire_in'}
            }
          },
          {
            $lookup: {
              from: "psn_drugDirectory",
              localField: "drugId",
              foreignField: "_id",
              as: "drug"
            }
          },
          {$unwind: {path: "$drug"}},
          {
            $project: {
              total: '$quantity',
              min_expire_in: {$dateToString: {format: "%Y-%m-%d", date: '$min_expire_in'}},
              drugId: "$_id.drugId",
              unit: "$_id.unit",
              drug: "$drug",
              _id: false
            }
          }
        ]);
        var rows = [];
        if (drugsInStock.length > 0) {
          var drugUseOneDayObject = yield self._elderlyDrugUseOneDay(tenant, elderly), drugInStock,
            drugUseOneDayQuantity;
          for (var i = 0, len = drugsInStock.length; i < len; i++) {
            drugInStock = JSON.parse(JSON.stringify(drugsInStock[i]));
            drugInStock = self.ctx.util.flatten(drugInStock);
            drugInStock.unit_name = D3026[drugInStock.unit].name;
            rows.push(drugInStock);
            if (drugUseOneDayObject[drugInStock.drugId]) {
              drugUseOneDayQuantity = drugUseOneDayObject[drugInStock.drugId].total;
              drugInStock.total_days = Math.floor(drugInStock.total / drugUseOneDayQuantity);
            }
          }
        }
        // console.log('rows :', rows)

        return self.ctx.wrapper.res.rows(rows);
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
          return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
        }
        elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
        if (!elderly || elderly.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到入库药品对应的老人资料'});
        }
        if (!elderly.live_in_flag || elderly.begin_exit_flow) {
          return self.ctx.wrapper.res.error({message: '当前老人不在院或正在办理出院手续'});
        }
        drug = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugDirectory'], drugId);
        if (!drug || drug.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到药品'});
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


        var ret = {total: 0};
        if (drugsInStock.length > 0) {
          ret.total = self.ctx._.reduce(drugsInStock, (total, o) => {
            return total + o.quantity || 0;
          }, 0);

          ret.unit = drugsInStock[0].mini_unit;
          ret.unit_name = drugsInStock[0].mini_unit_name;
          if (ret.total <= 0) {
            ret.is_danger = true;
            ret.is_warning = false;
          } else {
            var stock_alarm_low_day = tenant.other_config.psn_drug_stock_alarm_low_day || self.ctx.modelVariables.DEFAULTS.TENANT_DRUG_STOCK_ALARM_LOW_DAY;
            var drugUseOneDay = yield self._elderlyDrugUseOneDayForOneDrug(tenant, elderly, drugId);


            var canUseDays = Math.floor(ret.total / drugUseOneDay.total);
            ret.is_danger = false;
            ret.is_warning = canUseDays <= stock_alarm_low_day;
            ret.canUseDays = canUseDays;

            if (drugUseOneDay.unit && ret.unit != drugUseOneDay.unit) {
              return self.ctx.wrapper.res.ret(ret, '最小用量单位不一致');
            }
          }
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
          return self.ctx.wrapper.res.error({message: '库存记录不存在或已失效'});
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
  },
  _elderlyStockObject2: function (tenantId, elderlyId) {
    var self = this;
    return co(function *() {
      try {
        var tenant, elderly;
        tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
        if (!tenant || tenant.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到养老机构'});
        }
        elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
        if (!elderly || elderly.status == 0) {
          return self.ctx.wrapper.res.error({message: '无法找到入库药品对应的老人资料'});
        }
        if (!elderly.live_in_flag || elderly.begin_exit_flow) {
          return self.ctx.wrapper.res.error({message: '当前老人不在院或正在办理出院手续'});
        }

        var elderlyStockObject = yield self._elderlyStockObject(tenant, elderly);
        // console.log('_elderlyStockObject2:', elderlyStockObject);
        return elderlyStockObject;
      }
      catch (e) {
        console.log(e);
        self.logger.error(e.message);
        return self.ctx.wrapper.res.error(e.message);
      }
    }).catch(self.ctx.coOnError);
  },
  _elderlyStockObject: function (tenant, elderly) {
    var self = this;
    return co(function *() {
      try {

        var drugsInStock = yield self._elderlyStockListAsSameDrugMerged(tenant, elderly);

        // 获取药品低库存警戒线
        var stock_alarm_low_day = tenant.other_config.psn_drug_stock_alarm_low_day || self.ctx.modelVariables.DEFAULTS.TENANT_DRUG_STOCK_ALARM_LOW_DAY;
        var drugUseOneDayObject = yield self._elderlyDrugUseOneDay(tenant, elderly);
        console.log('drugUseOneDayObject:', drugUseOneDayObject)
        var canUseDays, drugUseOneDay;
        var ret = {}, drugInStock, alarm_low_quantity;
        for (var i = 0, len = drugsInStock.length; i < len; i++) {
          drugInStock = drugsInStock[i];
          drugUseOneDay = drugUseOneDayObject[drugInStock.drugId]
          if (drugUseOneDay) {
            canUseDays = Math.floor(drugInStock.total / drugUseOneDay.total);
          } else {
            // 用药计划中没有当前药品
            canUseDays = -1;
          }

          ret[drugInStock.drugId] = {
            drug_name: drugInStock.drug_name,
            total: drugInStock.total,
            canUseDays: canUseDays,
            is_warning: drugInStock.total > 0 && canUseDays > 0 && canUseDays <= stock_alarm_low_day,
            is_danger: drugInStock.total <= 0,
            unit_name: D3026[drugInStock.unit].name
          };
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
  _elderlyStockListAsSameDrugMerged: function (tenant, elderly) {
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
        var drugsInStock = yield self.ctx.modelFactory().model_aggregate(self.ctx.models['psn_drugStock'], [
          {
            $match: where
          },
          // {
          //   $group: {
          //     _id: {drugId: '$drugId', drug_name: '$drug_name', unit: '$mini_unit'},
          //     quantity: {$sum: '$quantity'}
          //   }
          // },
          /// 修复当是同一个drugId但是因为改名导致drug_name不一致产生groupBy不一致
          {
            $group: {
              _id: {drugId: '$drugId', unit: '$mini_unit'},
              quantity: {$sum: '$quantity'}
            }
          },
          {
            $lookup: {
              from: "psn_drugDirectory",
              localField: "_id.drugId",
              foreignField: "_id",
              as: "drug"
            }
          },
          {
            $unwind: '$drug'
          },
          {
            $project: {
              total: '$quantity',
              drugId: "$_id.drugId",
              drug_name: "$drug.full_name",
              unit: "$_id.unit"
            }
          }
        ]);

        return drugsInStock;
      }
      catch (e) {
        console.log(e);
        self.logger.error(e.message);
        return self.ctx.wrapper.res.error(e.message);
      }
    }).catch(self.ctx.coOnError);
  },
  _elderlyDrugUseOneDayForOneDrug: function (tenant, elderly, drugId) {
    var self = this;
    return co(function *() {
      try {
        var where = {
          status: 1,// 隐式包含了quantity>0
          stop_flag: false, //停用的不计算
          elderlyId: elderly._id,
          drugId: drugId,
          tenantId: tenant._id
        };
        var drugsInStock = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_drugUseItem'], {
          select: 'drugId name quantity unit',
          where: where
        });

        var drugInStock, total = 0, unit;
        for (var i = 0, len = drugsInStock.length; i < len; i++) {
          drugInStock = drugsInStock[i];
          total += drugInStock.quantity;
          if (!unit) {
            unit = drugInStock.unit;
          } else {
            if (unit != drugInStock.unit) {
              return self.ctx.wrapper.res.error('药品' + (drugInStock.name || drugInStock.drugId.toString()) + "用药计划中同一药品单位不一致");
            }
          }
        }
        return {total: total, unit: unit, unit_name: (D3026[unit] || {}).name};
        ;
      }
      catch (e) {
        console.log(e);
        self.logger.error(e.message);
        return self.ctx.wrapper.res.error(e.message);
      }
    }).catch(self.ctx.coOnError);
  },
  _elderlyDrugUseOneDay: function (tenant, elderly) {
    var self = this;
    return co(function *() {
      try {
        var where = {
          status: 1,// 隐式包含了quantity>0
          elderlyId: elderly._id,
          tenantId: tenant._id
        };
        var drugsUseOneDay = yield self.ctx.modelFactory().model_aggregate(self.ctx.models['psn_drugUseItem'], [
          {
            $match: where
          },
          {
            $group: {
              _id: {drugId: '$drugId', unit: '$unit'},
              quantity: {$sum: '$quantity'}
            }
          },
          {
            $project: {
              total: '$quantity',
              drugId: "$_id.drugId",
              unit: "$_id.unit"
            }
          }
        ]);

        var ret = {}, drugInStock;
        for (var i = 0, len = drugsUseOneDay.length; i < len; i++) {
          drugInStock = drugsUseOneDay[i];
          // console.log('drugInStock.unit:', drugInStock.unit)
          ret[drugInStock.drugId] = {
            total: drugInStock.total,
            unit: drugInStock.unit,
            unit_name: (D3026[drugInStock.unit] || {}).name || ''
          };
        }
        return ret;
      }
      catch (e) {
        console.log(e);
        self.logger.error(e.message);
        return self.ctx.wrapper.res.error(e.message);
      }
    }).catch(self.ctx.coOnError);
  }
};