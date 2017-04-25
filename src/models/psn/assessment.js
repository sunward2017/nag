/**
 * Created by yrm on 17-4-24.
 * 养老机构 评估表（入院评估、定期评估）
 */
var mongoose = require('mongoose');

module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var assessmentSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            elderlyId:{type: mongoose.Schema.Types.ObjectId,required: true,ref:'psn_elderly'},//关联老人
            type:{type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3007"])},//类别：入院评估、定期评估
            current_disease_evaluation:{
                level:{type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3007"])},//病情级别：重度、中度、轻度
                base_on:[String] // D3300 char5
            },//病情
            current_adl:{
                score: {type: Number, default: 0.00},//总分数
                base_on:[{
                    item:{type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3007"])},//日常生活活动项目：大便、小便、爬楼梯、……
                    standard:{type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3007"])},//标准：大便（失禁或昏迷、偶有失禁、控制）、小便（……）、……
                    score:{type: Number, default: 0.00},//每项的分数
                }]
            },//日常生活活动能力
            current_nursing_assessment_grade: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3015"])},//护理评估等级，对应国标的三个等级
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        assessmentSchema.virtual('nursing_assessment_grade_name').get(function () {
            if (this.nursing_assessment_grade) {
                return D3015[this.nursing_assessment_grade].name;
            }
            return '';
        });

        assessmentSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, assessmentSchema, name);
    }
}