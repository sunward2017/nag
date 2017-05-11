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
            code: {type: String,required: true, minlength: 6, maxlength: 6},
            elderlyId:{type: mongoose.Schema.Types.ObjectId,required: true,ref:'psn_elderly'},//关联老人
            elderly_name: {type: String, required: true, maxlength: 20},
            type:{type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3020"])},//类别：入院评估、定期评估
            current_disease_evaluation:{
                level:{type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3021"])},//病情级别：重度、中度、轻度
                base_on:[String] // D3021 char5
            },//病情
            current_adl:{
                score: {type: Number, default: 0.00},//总分数
                base_on:[{
                    item:{type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3023"])},//日常生活活动项目：大便、小便、爬楼梯、……
                    standard:{type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3024"])},//标准：大便（失禁或昏迷、偶有失禁、控制）、小便（……）、……
                    score:{type: Number, default: 0.00},//每项的分数
                }]
            },//日常生活活动能力
            current_nursing_assessment_grade: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3015"])},//评估等级，对应国标的三个等级
            current_nursing_assessment_grade_name:{type:String},
            nursingLevelId: {type: mongoose.Schema.Types.ObjectId, ref: 'psn_nursingLevel'},//评估等级
            current_nursing_level_name:{type:String},
            time:{type: Date, default: Date.now},//评估时间
            reason:{type:String},//评估原因
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        assessmentSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        assessmentSchema.pre('validate', function (next) {
            if (this.code == ctx.modelVariables.SERVER_GEN) {
                //考虑到并发几乎不可能发生，所以将订单编号设定为
                //order.type+[年2月2日2]+6位随机数
                var self = this;
                if (this.tenantId) {
                    console.log(ctx.modelVariables.SEQUENCE_DEFS.ASSESSMENT);
                    console.log(this.tenantId)
                    ctx.sequenceFactory.getSequenceVal(ctx.modelVariables.SEQUENCE_DEFS.ASSESSMENT, null, this.tenantId).then(function(ret){

                        self.code = ret;
                        console.log(self);
                        next();
                    });
                    console.log('aaaa')
                    //var tenantModel = require('../pub/tenant')(ctx, 'pub_tenant');
                    //tenantModel.findById(this.tenantId,function(err,tenant){
                    //
                    //    tenant.needRefreshToken();
                    //    self.code = tenant.token + '-' + ctx.moment().format('YYMMDD') + ctx.util.randomN(6);
                    //
                    //    next();
                    //});
                }
                else{
                    next();
                }
            }
            else{
                next();
            }

        });

        return mongoose.model(name, assessmentSchema, name);
    }
}