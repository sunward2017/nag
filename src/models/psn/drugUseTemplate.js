/**
 * Created by zppro on 17-5-31.
 * 养老机构 用药模版
 */
var mongoose = require('mongoose');
var D0103 = require('../../pre-defined/dictionary.json')['D0103'];
var D0104 = require('../../pre-defined/dictionary.json')['D0104'];
var DIC = require('../../pre-defined/dictionary-constants.json');

module.isloaded = false;

module.exports = function(ctx,name) {
    //console.log(_.rest(ctx.dictionary.keys["D1000"]));
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var drugUseTemplateSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            name:{type: String, required: true},
            description:{type: String},
            duration: {type: Number, default: 0}, // 完成时长 单为分
            repeat_type: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D0103"])},
            repeat_values: [{type: Number, min: 0, max: 365, default: 0}],
            repeat_start: {type: String, minlength: 1, maxlength: 5, default: '*'},
            confirm_flag: {type: Boolean, default: false}, // 需要护工确认标识
            remind_flag: {type: Boolean, default: false}, // 需要提醒标识
            remind_mode: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D0104"])},
            remind_times: {type: Number}, // 提醒次数
            voice_template:{type:String,maxlength:400},
            order_no:  {type: Number, default: 0}, // 提醒次数
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        drugUseTemplateSchema.virtual('repeat_type_name').get(function () {
            if (this.repeat_type) {
                return D0103[this.repeat_type].name;
            }
            return '';
        });

        drugUseTemplateSchema.virtual('remind_mode_name').get(function () {
            if (this.remind_mode) {
                return D0104[this.remind_mode].name;
            }
            return '';
        });
        drugUseTemplateSchema.virtual('work_item_category').get(function () {
            return DIC.D3019.TAKE_DRUG;
        });


        drugUseTemplateSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, drugUseTemplateSchema, name);
    }
}