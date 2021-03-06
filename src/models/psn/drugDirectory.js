/**
 * Created by yrm on 17-3-21.
 * 养老机构 药品实体
 */
var mongoose = require('mongoose');
var D3026 = require('../../pre-defined/dictionary.json')['D3026'];

module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;
        var drugDirectorySchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            barcode:{type: String}, //条形码 added by zppro 2017.5.16
            img:{type: String},//
            drug_no:{type: String},// 药品编码
            full_name:{type: String},
            short_name:{type: String},
            alias:{type: String},
            english_name:{type: String},
            indications_function:{type: String},//药品功能主治（适用症）
            otc_flag:{type: Boolean},
            health_care_flag:{type: Boolean},
            usage:{type: String},
            price:{type: String},
            specification:{type: String},//药品规格
            vender:{type: String},//厂家 added by zppro 2017.5.12
            dosage_form:{type: String}, //剂型 added by zppro 2017.5.12
            special_individuals:{type: String}, //特殊人群用药 added by zppro 2017.5.12
            mini_unit: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3026"])}, //added by zppro 2017-6-2 最小消耗单位 计算库存使用
            drugSourceId: {type: mongoose.Schema.Types.ObjectId,ref:'pub_drug'},//关联公共的药品库
            tenantId: {type: mongoose.Schema.Types.ObjectId,required: true,ref:'pub_tenant'}//关联机构
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        drugDirectorySchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        drugDirectorySchema.virtual('mini_unit_name').get(function () {
            if (this.mini_unit) {
                return D3026[this.mini_unit].name;
            }
            return '';
        });

        return mongoose.model(name, drugDirectorySchema, name);
    }
}