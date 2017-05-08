/**
 * Created by zppro on 17-5-8.
 * 养老机构 护理机器人
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

        var robotSchema = new mongoose.Schema({
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

        robotSchema.virtual('robot_status_name').get(function () {
            if (this.robot_status) {
                return D3009[this.robot_status].name;
            }
            return '';
        });

        robotSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, robotSchema, name);
    }
}