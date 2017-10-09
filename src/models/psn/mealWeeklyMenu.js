/**
 * Created by hcl on 17-9-21.
 * 养老机构 餐饮管理 ->周餐组表
 */
var mongoose = require('mongoose');
var D3040 = require('../../pre-defined/dictionary.json')['D3040'];

module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var mealWeeklyMenuSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            x_axis: {type: Date, required: true}, //时间轴
            y_axis: {type: String, minlength: 5, maxlength: 5, required: true, enum: ctx._.rest(ctx.dictionary.keys["D3040"])}, //早中晚夜轴
            aggr_value: {
                mealId:{type: mongoose.Schema.Types.ObjectId, required: true, ref: 'psn_meal'},
                quantity: {type: Number, min: 0,default: 1} //餐组剩余数量
            },
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        mealWeeklyMenuSchema.virtual('x_axis_value').get(function () {
            return ctx.moment(this.x_axis).day();
        });

        mealWeeklyMenuSchema.virtual('y_axis_value').get(function () {
            if (this.y_axis) {
                return D3040[this.y_axis].name;
            }
            return '';
        });

        mealWeeklyMenuSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, mealWeeklyMenuSchema, name);
    }
}