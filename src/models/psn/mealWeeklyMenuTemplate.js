/**
 * Created by hcl on 17-9-21.
 * 养老机构 餐饮管理 ->周餐组模板
 */
var mongoose = require('mongoose');

module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var mealWeeklyMenuTemplateSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            name: {type: String, required: true, maxlength: 20}, //模板名称
            stop_flag: {type: Boolean, default: false},//停用标志 模版是否停用,当模版中的餐组停用或者菜品停用或变化
            content:[{
                x_axis: {type: Number, min: 0, required: true},
                y_axis: {type: String, minlength: 5, maxlength: 5, required: true, enum: ctx._.rest(ctx.dictionary.keys["D3040"])}, //早中晚夜轴
                aggr_value: {
                    mealId:{type: mongoose.Schema.Types.ObjectId, required: true, ref: 'psn_meal'},
                    quantity: {type: Number} //餐组剩余数量
                }
            }],
            description:{type: String,  maxlength: 50}, //模板描述
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });


        mealWeeklyMenuTemplateSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, mealWeeklyMenuTemplateSchema, name);
    }
}