/**
 * Created by hcl on 17-12-18.
 * 评估管理 ->评估题库
 */
var mongoose = require('mongoose');
var D3044 = require('../../pre-defined/dictionary.json')['D3044'];

module.isloaded = false;

module.exports = function(ctx,name) {
  if (module.isloaded) {
    return mongoose.model(name);
  }
  else {
    module.isloaded = true;

    var evaluationItemSchema = new mongoose.Schema({
      check_in_time: {type: Date, default: Date.now},
      operated_on: {type: Date, default: Date.now},
      status: {type: Number, min: 0, max: 1, default: 1},
      name:{type: String, required: true},//题目标题
      description:{type: String, required: true},//题干
      type:{type: String, minlength: 1, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3044"])},//选项类别：文字，音频，视频
      url:{type:String},//语音或视频资源
      stop_flag: {type: Boolean, default: false},//开通标志
      options: [{
        name: {type: String, required: true},// 选项
        value:{type: String, required: true},//选项内容
        score: {type: Number, required: true, min: 0} //选项分值
      }],
      tenantId: {type: mongoose.Schema.Types.ObjectId} //中央题库与本地题库分离
    }, {
      toObject: {
        virtuals: true
      }
      , toJSON: {
        virtuals: true
      }
    });

    evaluationItemSchema.virtual('type_name').get(function () {
      if (this.type) {
        return D3044[this.type].name;
      }
      return '';
    });

    evaluationItemSchema.pre('update', function (next) {
      this.update({}, {$set: {operated_on: new Date()}});
      next();
    });

    return mongoose.model(name, evaluationItemSchema, name);
  }
}