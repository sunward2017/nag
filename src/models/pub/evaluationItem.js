/**
 * Created by hcl on 17-12-18.
 * 评估管理 ->评估题库
 */
var mongoose = require('mongoose');

module.isloaded = false;

module.exports = function(ctx,name) {
  if (module.isloaded) {
    return mongoose.model(name);
  }
  else {
    module.isloaded = true;

    var evaluationTopicsSchema = new mongoose.Schema({
      check_in_time: {type: Date, default: Date.now},
      operated_on: {type: Date, default: Date.now},
      status: {type: Number, min: 0, max: 1, default: 1},
      topic:{type: String, required: true},//题目
      url:{type:String},//语音或视频资源
      stop_flag: {type: Boolean, default: false},//开通标志
      // system_flag: {type: Boolean, default: false},
      options: [{
        type:{type: String, minlength: 1, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3044"])},//选项类别：文字，音频，视频
        option: {type: String, required: true},// 选项
        score: {type: Number, required: true, min: 0} //题目分值
      }],
      // tenantId: {type: mongoose.Schema.Types.ObjectId} //中央题库与本地题库分离
    }, {
      toObject: {
        virtuals: true
      }
      , toJSON: {
        virtuals: true
      }
    });

    evaluationTopicsSchema.pre('update', function (next) {
      this.update({}, {$set: {operated_on: new Date()}});
      next();
    });

    return mongoose.model(name, evaluationTopicsSchema, name);
  }
}