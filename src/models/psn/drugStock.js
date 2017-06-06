/**
 * Created by yrm on 17-3-21. modified by zppro 2017-6-6
 * 养老机构 药品库存
 */
var mongoose = require('mongoose');
module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;
        var drugStockSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            elderlyId:{type: mongoose.Schema.Types.ObjectId,required: true,ref:'psn_elderly'},//关联老人
            elderly_name: {type: String, required: true, maxlength: 20},
            drugId:{type: mongoose.Schema.Types.ObjectId,ref:'psn_drugDirectory'},//关联药品
            drug_name:{type: String, required: true}, //drugDirectory没有short_name时使用full_name
            quantity:{type:Number, required: true},//最小使用单位 当前库存量
            mini_unit: {type: String, minlength: 5, maxlength: 5, required: true, enum: ctx._.rest(ctx.dictionary.keys["D3026"])},
            expire_in: {type: Date}, //效期
            drugInStockId:{type: mongoose.Schema.Types.ObjectId,ref:'psn_drugInOutStock'},//关联入库单Id
            drugOutStockId:{type: mongoose.Schema.Types.ObjectId,ref:'psn_drugInOutStock'},//关联出库单Id
            tenantId: {type: mongoose.Schema.Types.ObjectId,required: true,ref:'pub_tenant'}//关联机构
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        drugStockSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, drugStockSchema, name);
    }
}