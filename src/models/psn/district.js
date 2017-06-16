/**
 * Created by zppro on 17-2-15.
 * 养老机构 片区实体（楼房）(移植自fsrok)
 */
var mongoose = require('mongoose');
var D3028 = require('../../pre-defined/dictionary.json')['D3028'];

module.isloaded = false;

module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var districtConfigSchema = new mongoose.Schema({
            elderlys_out_stock_check_mode:{type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3028"])}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        districtConfigSchema.virtual('elderlys_out_stock_check_mode_name').get(function () {
            if (this.elderlys_out_stock_check_mode) {
                return D3028[this.elderlys_out_stock_check_mode].name;
            }
            return '';
        });

        var districtSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            name: {type: String, required: true, maxlength: 30},
            config: districtConfigSchema,
            tenantId: {type: mongoose.Schema.Types.ObjectId,required: true,ref:'pub_tenant'}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        districtSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, districtSchema, name);
    }
}