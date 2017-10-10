/**
 * Created by hcl on 17-9-21.
 * 养老机构 餐饮管理 -> 餐组
 */
var mongoose = require('mongoose');

module.isloaded = false;

module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var mealSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            name: {type: String, required: true, maxlength: 15},
            meal: [{
                dishItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'psn_mealDish' },
                dish_name: {type: String, required: true, maxlength: 15}
            }], //餐组菜品组成
            price:{type: Number, min: 0}, //餐组价格
            stop_flag: {type: Boolean, default: false},//餐组是否可用
            img:{type:String},
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        mealSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });


        mealSchema.virtual('meal_summary').get(function () {
            if (this.meal && this.meal.length > 0) {
                return ctx._.map(this.meal, (o)=> {
                    return o.dish_name;
                }).join();
            }
            return '';
        });

        return mongoose.model(name, mealSchema, name);
    }
}