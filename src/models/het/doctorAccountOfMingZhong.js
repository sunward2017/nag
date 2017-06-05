/**
 * Created by zppro on 17-6-5.
 *  铭众生命体征一体机医生账号实体
 */
var mongoose = require('mongoose');
module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var doctorAccountOfMingZhongSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            name: {type: String, required: true}, // 对外部的member_name
            password: {type: String, required: true}, //暂时不hash
            access_token: {type: String}, //
            elderly_users:[{
                syncid: {type: String},
                nickname: {type: String},
                phone: {type: String}
            }],
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        });

        doctorAccountOfMingZhongSchema.pre('update', function (next) {
            this.update({}, {$set: {last_check_in_time: new Date()}});
            next();
        });

        return mongoose.model(name, doctorAccountOfMingZhongSchema, name);
    }
}