/**
 * Created by zppro on 17-3-8.
 * 公共 离床监测设备
 */
var mongoose = require('mongoose');
var D3009 = require('../../pre-defined/dictionary.json')['D3009'];

module.isloaded = false;


module.exports = function(ctx,name) {
    //console.log(_.rest(ctx.dictionary.keys["D1000"]));
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var bedMonitorSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            code: {type: String, required: true, maxlength: 30},
            name: {type: String, required: true, maxlength: 100},
            mac: {type: String, required: true, minlength:12, maxlength: 12},
            device_status: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3009"])},//设备状态 在线 离线
            stop_flag: {type: Boolean, default: false},//停用标志 机器是否停用,停用则接触与房间床位的绑定
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        bedMonitorSchema.virtual('device_status_name').get(function () {
            if (this.device_status) {
                return D3009[this.device_status].name;
            }
            return '';
        });

        bedMonitorSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, bedMonitorSchema, name);
    }
}