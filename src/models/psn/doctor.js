/**
 * Created by hcl on 17-9-30.
 * 养老机构 基础管理 -> 医生管理
 */
var mongoose = require('mongoose');

module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var doctorSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            code: {type: String, required: true, maxlength: 30},
            name: {type: String, required: true, maxlength: 30},
            phone: {type: String, maxlength: 20},
            stop_flag: {type: Boolean, default: false},//停用标志
            userId: {type: mongoose.Schema.Types.ObjectId, ref: 'pub_user'},
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        doctorSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, doctorSchema, name);
    }
}