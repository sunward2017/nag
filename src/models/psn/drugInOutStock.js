/**
 * Created by yrm on 17-3-23. modified by zppro 2017-6-6
 * 养老机构 出入库实体
 */
var mongoose = require('mongoose');
module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;
        var drugInOutStockSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            in_out_no:{type: String, required: true},//出入库单号
            type:{type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3014"])},
            elderlyId:{type: mongoose.Schema.Types.ObjectId,required: true,ref:'psn_elderly'},//关联老人
            elderly_name: {type: String, required: true, maxlength: 20},
            drugId:{type: mongoose.Schema.Types.ObjectId,ref:'psn_drugDirectory'},//关联药品
            drug_name:{type: String, required: true}, //drugDirectory没有short_name时使用full_name
            quantity:{type:Number, required: true},//最小使用单位 出入库数量
            mini_unit: {type: String, minlength: 5, maxlength: 5, required: true, enum: ctx._.rest(ctx.dictionary.keys["D3026"])},
            expire_in: {type: Date}, //效期 入库记录根据配置使用,出库记录为undefined
            tenantId: {type: mongoose.Schema.Types.ObjectId,required: true,ref:'pub_tenant'}//关联机构
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        drugInOutStockSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, drugInOutStockSchema, name);
    }
}