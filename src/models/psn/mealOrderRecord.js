/**
 * Created by hcl on 17-9-22.
 * 养老机构 餐饮管理 ->老人订餐记录
 */
var mongoose = require('mongoose');

module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var mealOrderRecordSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_by: {type: mongoose.Schema.Types.ObjectId, ref:'pub_user'},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            elderlyId:{type: mongoose.Schema.Types.ObjectId,ref:'psn_elderly'},//关联老人
            elderly_name: {type: String,  maxlength: 20},
            order_date:{type: Date, default: Date.now},
            x_axis:{type: Number, min: 0, required: true},
            y_axis: {type: String, minlength: 5, maxlength: 5, required: true, enum: ctx._.rest(ctx.dictionary.keys["D3040"])}, //早中晚夜轴
            mealId:{type: mongoose.Schema.Types.ObjectId, required: true, ref: 'psn_meal'},
            quantity:{type: Number, required: true,min: 0}, //meal份数
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        mealOrderRecordSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });


        return mongoose.model(name, mealOrderRecordSchema, name);
    }
}