/**
 * Created by zppro on 17-5-12.
 * 公共 药品
 */
var mongoose = require('mongoose');
module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;
        var drugSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            barcode:{type: Number, min: 13, max: 13}, //条形码
            name:{type: String, required: true}, //名称
            reference_price:{type: Number}, //参考价
            vender:{type: String},//厂家
            dosage_form:{type: String}, //剂型
            audit_on: {type: Date}, //批准日期
            approval_no: {type: String}, //批准文号
            short_name:{type: String},
            alias:{type: String},
            english_name:{type: String},
            specification:{type: String},//药品规格
            usage:{type: String}, //用法
            indications_function:{type: String},//药品功能主治（适用症）
            special_individuals:{type: String}, //特殊人群用药
            otc_flag:{type: Boolean}, // 是否处方药
            medical_insurance_flag:{type: Boolean}, // 是否进医保
            store: {type: String}, // 存储
            class_one: {type: String}, //大类
            class_two: {type: String} //二类
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        drugSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, drugSchema, name);
    }
}