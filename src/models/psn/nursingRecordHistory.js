/**
 * Created by zppro on 17-5-8.
 * 养老机构 护理记录历史
 */
var mongoose = require('mongoose');

var D3017 = require('../../pre-defined/dictionary.json')['D3017'];
var D3019 = require('../../pre-defined/dictionary.json')['D3019'];

module.isloaded = false;


module.exports = function(ctx, name) {
    //console.log(_.rest(ctx.dictionary.keys["D1000"]));
    if (module.isloaded) {
        return mongoose.model(name);
    } else {
        module.isloaded = true;

        var nursingRecordHistorySchema = new mongoose.Schema({
            check_in_time: { type: Date, default: Date.now },
            operated_on: { type: Date, default: Date.now },
            type: { type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3017"]) },
            elderlyId: { type: mongoose.Schema.Types.ObjectId, ref: 'psn_elderly' }, //因为历史表数据巨大,尽量不用populate
            elderly_name: { type: String },
            roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'psn_room' },
            bed_no: { type: Number, min: 1 },
            gen_batch_no: { type: String, required: true, minlength: 10, maxlength: 10 },
            workItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'psn_workItem' }, //因为历史表数据巨大,尽量不用populate
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
            archived_on: { type: Date, default: Date.now }, // 归档时间
            tenantId: { type: mongoose.Schema.Types.ObjectId }
        }, {
            toObject: {
                virtuals: true
            },
            toJSON: {
                virtuals: true
            }
        });

        nursingRecordHistorySchema.virtual('type_name').get(function(){
            if (this.type) {
                return D3017[this.type].name;
            }
            return '';
        });

        nursingRecordHistorySchema.virtual('category_name').get(function(){
            if (this.category) {
                return D3019[this.category].name;
            }
            return '';
        });

        return mongoose.model(name, nursingRecordHistorySchema, name);
    }
}
