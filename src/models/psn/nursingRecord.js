/**
 * Created by zppro on 17-3-27.
 * 养老机构 照护记录
 */
var mongoose = require('mongoose');

var D3017 = require('../../pre-defined/dictionary.json')['D3017'];

module.isloaded = false;


module.exports = function(ctx, name) {
    //console.log(_.rest(ctx.dictionary.keys["D1000"]));
    if (module.isloaded) {
        return mongoose.model(name);
    } else {
        module.isloaded = true;

        var nursingRecordSchema = new mongoose.Schema({
            check_in_time: { type: Date, default: Date.now },
            operated_on: { type: Date, default: Date.now },
            type: { type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3017"]) },
            elderlyId: { type: mongoose.Schema.Types.ObjectId, ref: 'psn_elderly' },
            elderly_name: { type: String },
            roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'psn_room' },
            bed_no: { type: Number, min: 1 },
            gen_batch_no: { type: String, required: true, minlength: 10, maxlength: 10 },
            workItemId: { type: mongoose.Schema.Types.ObjectId }, //根据type 分别是workitemId和drugUseItemId
            category: { type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3019"]) },
            name: { type: String, required: true }, // 支持同个分组的护理计划用药项目合并为一条看护记录
            description: { type: String }, // 支持同个分组的护理计划用药项目合并为一条看护记录
            remark: { type: String, maxLength: 200 },
            duration: { type: Number, default: 0 }, // 完成时长 单为分
            exec_on: { type: Date, required: true },
            // exec_date_string:{type: String, minlength: 8, maxlength: 10}, //按需时不需要设置 2017-3-1(8) 2017-03-27(10)
            // exec_time_string:{type: String, minlength: 2, maxlength: 5}, //按需时不需要设置   :3(2) :30(3) 8:45(4) 08:30(5)
            assigned_workers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'psn_nursingWorker' }], // 分配的护工 可滞后分配 支持多个
            executed_flag: { type: Boolean, default: false }, // 护工开始执行工作项目标识
            confirmed_flag: { type: Boolean, default: false }, // 护工已确认标识
            confirmed_on: { type: Date }, // 护工确认时间
            remind_on: [{ type: Date, required: true }], //提醒时间
            voice_content: { type: String, maxlength: 400 },
            tenantId: { type: mongoose.Schema.Types.ObjectId }
        }, {
            toObject: {
                virtuals: true
            },
            toJSON: {
                virtuals: true
            }
        });
        
        nursingRecordSchema.virtual('exec_on_ts').get(function(){
            if(this.exec_on){
                return ctx.moment(this.exec_on);
            }
            return null;
        });

        nursingRecordSchema.virtual('expire_on').get(function(){
            if(this.exec_on && this.duration){
                return ctx.moment(this.exec_on).add(this.duration, 'm').toDate();
            }
            return null;
        });

        nursingRecordSchema.virtual('expire_on_ts').get(function(){
            if(this.exec_on && this.duration){
                return ctx.moment(this.exec_on).add(this.duration, 'm');
            }
            return null;
        });

        nursingRecordSchema.virtual('remind_on_ts').get(function(){
            return ctx._.map(this.remind_on, function(o){
              return ctx.moment(o);  
            });
        });

        nursingRecordSchema.virtual('type_name').get(function(){
            if (this.type) {
                return D3017[this.type].name;
            }
            return '';
        });

        nursingRecordSchema.pre('update', function(next) {
            this.update({}, { $set: { operated_on: new Date() } });
            next();
        });

        return mongoose.model(name, nursingRecordSchema, name);
    }
}
