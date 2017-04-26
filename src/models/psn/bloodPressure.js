var mongoose = require('mongoose');
module.isloaded = false;
var D3018 = require('../../pre-defined/dictionary.json')['D3018'];

module.exports = function(ctx, name) {
    if (module.isloaded) {
        return mongoose.model(name);
    } else {
        module.isloaded = true;
        var bloodPressureSchema = new mongoose.Schema({
            check_in_time: { type: Date, default: Date.now },
            operated_on: { type: Date, default: Date.now },
            status: { type: Number, min: 0, max: 1, default: 1 },
            elderlyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'psn_elderly' }, //关联老人
            elderly_name: { type: String, maxlength: 20 },
            operate_on: { type: Date, default: Date.now },
            systolic_blood_pressure: { type: Number, min: 0, max: 250 }, // 收缩压
            diastolic_blood_pressure: { type: Number, min: 0, max: 250 },// 舒张压 
            drugId:{type: mongoose.Schema.Types.ObjectId,required: true,ref:'psn_drugDirectory'}, //关联药品
            blood_pressure_level: { type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3018"]) },
            current_symptoms: { type: String },//当前症状
            tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'pub_tenant' } //关联机构
        }, {
            toObject: {
                virtuals: true
            },
            toJSON: {
                virtuals: true
            }
        });

        bloodPressureSchema.virtual('blood_pressure_level_name').get(function () {
            if (this.blood_pressure_level) {
                return D3018[this.blood_pressure_level].name;
            }
            return '';
        });
 
        bloodPressureSchema.pre('update', function(next) {
            this.update({}, { $set: { test_on: new Date() } });
            next();
        });

        return mongoose.model(name, bloodPressureSchema, name);
    }
}
