/**
 * Created by yrm on 17-3-23. modified by zppro 2017-6-6
 * 养老机构 出入库实体
 */
var mongoose = require('mongoose');
var D3014 = require('../../pre-defined/dictionary.json')['D3014'];
var D3026 = require('../../pre-defined/dictionary.json')['D3026'];
var D3027 = require('../../pre-defined/dictionary.json')['D3027'];

module.isloaded = false;


module.exports = function(ctx,name) {
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var drugInSubDocSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            drugId:{type: mongoose.Schema.Types.ObjectId,ref:'psn_drugDirectory'},//关联药品
            drug_name:{type: String, required: true}, //drugDirectory没有short_name时使用full_name
            quantity:{type:Number, required: true},//最小使用单位 出入库数量
            mini_unit: {type: String, minlength: 5, maxlength: 5, required: true, enum: ctx._.rest(ctx.dictionary.keys["D3026"])},
            expire_in: {type: Date}, //效期 入库记录根据配置使用,出库记录为undefined
        });

        drugInSubDocSchema.virtual('mini_unit_name').get(function () {
            if (this.mini_unit) {
                return D3026[this.mini_unit].name;
            }
            return '';
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        var drugInOutStockSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            operated_by: {type: mongoose.Schema.Types.ObjectId, ref:'pub_user'},
            status: {type: Number, min: 0, max: 1, default: 1},
            code:{type: String, required: true},//出入库单号
            type:{type: String, minlength: 5, maxlength: 5, required: true,  enum: ctx._.rest(ctx.dictionary.keys["D3014"])},
            mode:{type: String, minlength: 5, maxlength: 5, required: true,  enum: ctx._.rest(ctx.dictionary.keys["D3027"])},
            elderlyId:{type: mongoose.Schema.Types.ObjectId,required: true,ref:'psn_elderly'},//关联老人
            elderly_name: {type: String, required: true, maxlength: 20},
            drugs: [drugInSubDocSchema],
            open_id: {type: String}, // mode == A0001时填入
            tenantId: {type: mongoose.Schema.Types.ObjectId,required: true,ref:'pub_tenant'}//关联机构
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        drugInOutStockSchema.pre('validate', function (next) {
            if (this.code == ctx.modelVariables.SERVER_GEN) {
                var self = this;
                if (this.type) {
                    var seqId = this.type.substr(0, 1) == 'A' ? ctx.modelVariables.SEQUENCE_DEFS.STOCK_IN_CODE : ctx.modelVariables.SEQUENCE_DEFS.STOCK_OUT_CODE;
                    ctx.sequenceFactory.getSequenceVal(seqId, null, this.tenantId).then(function(ret){
                        self.code = ret;
                        console.log('drugInOutStock code:', self.code);
                        next();
                    });
                }
                else{
                    next();
                }
            }
            else{
                next();
            }

        });

        drugInOutStockSchema.virtual('type_name').get(function () {
            if (this.type) {
                return D3014[this.type].name;
            }
            return '';
        });

        drugInOutStockSchema.virtual('mode_name').get(function () {
            if (this.mode) {
                return D3027[this.mode].name;
            }
            return '';
        });

        drugInOutStockSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, drugInOutStockSchema, name);
    }
}