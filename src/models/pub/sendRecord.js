/**
 * Created by zppro on 17-6-29.
 * 公共 发送记录
 */
var mongoose = require('mongoose');

module.isloaded = false;

module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var sendRecordSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            service_provider: {type: String, required: true},
            send_content: {type: String, required: true},
            send_to: {type: String, required: true},
            send_result: {type: String},
            alarmId: {type: mongoose.Schema.Types.ObjectId, ref: 'pub_alarm'},
            tenantId: {type: mongoose.Schema.Types.ObjectId , ref: 'pub_tenant'}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        sendRecordSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, sendRecordSchema, name);
    }
}