/**
 * Created by zppro on 17-5-8.
 * 养老机构 护理记录历史
 */
var mongoose = require('mongoose');

module.isloaded = false;


module.exports = function(ctx, name) {
    //console.log(_.rest(ctx.dictionary.keys["D1000"]));
    if (module.isloaded) {
        return mongoose.model(name);
    } else {
        module.isloaded = true;

        var nursingRecordHistorySchema = new mongoose.Schema({
            type: { type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3017"]) },
            check_in_time: { type: Date, default: Date.now },
            operated_on: { type: Date, default: Date.now },
            elderlyId: { type: mongoose.Schema.Types.ObjectId, ref: 'psn_elderly' },
            elderly_name: { type: String },
            roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'psn_room' },
            bed_no: { type: Number, min: 1 },
            gen_batch_no: { type: String, required: true, minlength: 10, maxlength: 10 },
            workItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'psn_workItem' },
            category: { type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3019"]) },
            name: { type: String, required: true, maxlength: 100 },
            description: { type: String, maxLength: 400 },
            remark: { type: String, maxLength: 200 },
            duration: { type: Number, default: 0 }, // 完成时长 单为分
            exec_on: { type: Date, required: true },
            assigned_workers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'psn_nursingWorker' }], // 分配的护工 可滞后分配 支持多个
            executed_flag: { type: Boolean, default: false }, // 护工开始执行工作项目标识
            confirmed_flag: { type: Boolean, default: false }, // 护工已确认标识
            confirmed_on: { type: Date }, // 护工确认时间
            remind_on: [{ type: Date, required: true }], //提醒时间
            voice_content: { type: String, maxlength: 400 },
            archived_on: { type: Date, required: true }, // 归档时间
            tenantId: { type: mongoose.Schema.Types.ObjectId }
        }, {
            toObject: {
                virtuals: true
            },
            toJSON: {
                virtuals: true
            }
        });

        nursingRecordHistorySchema.virtual('expire_on').get(function(){
            if(this.exec_on && this.duration){
                return ctx.moment(this.exec_on).add(this.duration, 'm').toDate();
            }
            return null;
        });

        nursingRecordHistorySchema.pre('update', function(next) {
            this.update({}, { $set: { operated_on: new Date() } });
            next();
        });

        return mongoose.model(name, nursingRecordHistorySchema, name);
    }
}
