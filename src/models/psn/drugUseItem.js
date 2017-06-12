/**
 * Created by zppro on 17-4-7.
 * 养老机构 用药项目
 */
var mongoose = require('mongoose');
var D0103 = require('../../pre-defined/dictionary.json')['D0103'];
var D0104 = require('../../pre-defined/dictionary.json')['D0104'];
var D3026 = require('../../pre-defined/dictionary.json')['D3026'];
var DIC = require('../../pre-defined/dictionary-constants.json');

module.isloaded = false;

module.exports = function(ctx,name) {
    //console.log(_.rest(ctx.dictionary.keys["D1000"]));
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var drugUseItemSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            elderlyId: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'psn_elderly'},
            elderly_name: {type: String},
            stop_flag: {type: Boolean, default: false},//停用标志
            stoped_on: {type: Date},
            drugId:{type: mongoose.Schema.Types.ObjectId,required: true,ref:'psn_drugDirectory'},//关联药品
            drug_no:{type: String,},// 药品编码
            barcode:{type: String,},// 药品编码
            name:{type: String}, //因为药品名称在实际使用中通常会用简称代替,因此此冗余已经无用
            description:{type: String},
            quantity:{type:Number},// 一般来说用药使用标准模版,即吃药严格按照时刻来执行,因此此处的数量代表按照医嘱的一次用药量
            unit: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3026"])}, //用药单位,理论上需要和库存的最小单位保持一致
            drugUseTemplateId:{type: mongoose.Schema.Types.ObjectId,ref:'psn_drugUseTemplate'},//关联用药模版
            duration: {type: Number, default: 0}, // 完成时长 单为分
            repeat_type: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D0103"])},
            repeat_values: [{type: Number, min: 0, max: 365, default: 0}],
            repeat_start: {type: String, minlength: 1, maxlength: 5, default: '*'},
            confirm_flag: {type: Boolean, default: false}, // 需要护工确认标识
            remind_flag: {type: Boolean, default: false}, // 需要提醒标识
            remind_mode: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D0104"])},
            remind_times: {type: Number}, // 提醒次数
            fee_flag: {type: Boolean, default: false}, // 是否需要收费
            fee: {type: Number}, // 费用
            voice_template:{type:String,maxlength:400},
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        drugUseItemSchema.virtual('repeat_type_name').get(function () {
            if (this.repeat_type) {
                return D0103[this.repeat_type].name;
            }
            return '';
        });

        drugUseItemSchema.virtual('remind_mode_name').get(function () {
            if (this.remind_mode) {
                return D0104[this.remind_mode].name;
            }
            return '';
        });
        drugUseItemSchema.virtual('work_item_category').get(function () {
            return DIC.D3019.TAKE_DRUG;
        });

        drugUseItemSchema.virtual('unit_name').get(function () {
            if (this.unit) {
                return D3026[this.unit].name;
            }
            return '';
        });

        drugUseItemSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, drugUseItemSchema, name);
    }
}