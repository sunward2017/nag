/**
 * Created by zppro on 17-5-8.
 * 平台管理 作业状态
 */
var mongoose = require('mongoose');

module.isloaded = false;


module.exports = function(ctx,name) {
    //console.log(_.rest(ctx.dictionary.keys["D1000"]));
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var jobStatusSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            job_id: {type: String, required: true},
            job_name: {type: String, required: true},
            job_rule: {type: String, required: true},
            last_exec_on: {type: Date}, //最新一次执行时间
            stop_flag: {type: Boolean, default: false},//停用标志 机器是否停用,停用则接触与房间的绑定
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        jobStatusSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, jobStatusSchema, name);
    }
}