/**
 * Created by hcl on 17-12-18.
 * 评估管理 ->评估模板
 */
var mongoose = require('mongoose');

module.isloaded = false;


module.exports = function(ctx,name) {
  if (module.isloaded) {
    return mongoose.model(name);
  }
  else {
    module.isloaded = true;

    var sectionSchema = new mongoose.Schema({
      rank:{type: String, required: true},//章节排列
      title:{type: String},//章节标题
      // captions:[mongoose.Schema.Types.Mixed], //章节内分类小章节,Mixed类型
      topics:[{
        order:{type: Number, required: true},//题目顺序
        topicId:{type: mongoose.Schema.Types.ObjectId, ref: 'pub_evaluationItem' }
      }],
    }, {
      toObject: {
        virtuals: true
      }
      , toJSON: {
        virtuals: true
      }
    });

    var evaluationTemplateSchema = new mongoose.Schema({
      check_in_time: {type: Date, default: Date.now},
      operated_on: {type: Date, default: Date.now},
      status: {type: Number, min: 0, max: 1, default: 1},
      // version:{type: String},//中央题库版本号
      name: {type: String, required: true, maxlength: 20}, //模板名称
      stop_flag: {type: Boolean, default: false},//停用标志
      sections:[sectionSchema],
      tenantId: {type: mongoose.Schema.Types.ObjectId}
    }, {
      toObject: {
        virtuals: true
      }
      , toJSON: {
        virtuals: true
      }
    });


    evaluationTemplateSchema.pre('update', function (next) {
      this.update({}, {$set: {operated_on: new Date()}});
      next();
    });

    return mongoose.model(name, evaluationTemplateSchema, name);
  }
}