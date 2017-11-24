/**
 * Created by hcl on 17-9-21.
 * 养老机构 餐饮管理 -> 菜品
 */
var mongoose = require('mongoose');
var D3039 = require('../../pre-defined/dictionary.json')['D3039'];

module.isloaded = false;

module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var dishItemSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            name: {type: String, required: true, maxlength: 15}, //菜品名称
            nature: {type: String, minlength: 5, maxlength: 5, required: true, enum: ctx._.rest(ctx.dictionary.keys["D3039"])}, //荤素
            price: {type: Number, required: true,min: 0}, //菜品价格
            stop_flag: {type: Boolean, default: false},//是否可用
            img:{type:String},
            py: {type: String},//拼音首字母，用于排序
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        dishItemSchema.virtual('nature_name').get(function () {
            if (this.nature) {
                return D3039[this.nature].name;
            }
            return '';
        });

        dishItemSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, dishItemSchema, name);
    }
}