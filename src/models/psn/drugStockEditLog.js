/**
 * Created by yrm on 17-4-5.  modified by zppro 2017-6-6
 * 养老机构 药品库存编辑日志
 */
var mongoose = require('mongoose');
module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;
        var drugStockEditLogSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            operated_by_name: {type: String},
            drugStockId: {type: mongoose.Schema.Types.ObjectId,required: true,ref:'psn_drugStock'},//关联库存编号
            origin_quantity:{type:Number},//编辑前的数量
            revised_quantity:{type:Number},//修改后的数量
            tenantId: {type: mongoose.Schema.Types.ObjectId,required: true,ref:'pub_tenant'}//关联机构
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        drugStockEditLogSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, drugStockEditLogSchema, name);
    }
}