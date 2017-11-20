/**
 * Created by hcl on 17-11-10.
 * 养老机构  -> 医护排班模板
 */
var mongoose = require('mongoose');
var D3010 = require('../../pre-defined/dictionary.json')['D3010'];
// var D3011 = require('../../pre-defined/dictionary.json')['D3011'];

module.isloaded = false;

module.exports = function(ctx,name) {
  if (module.isloaded) {
    return mongoose.model(name);
  }
  else {
    module.isloaded = true;

    var doctorNurseScheduleTemplateSchema = new mongoose.Schema({
      check_in_time: {type: Date, default: Date.now},
      operated_on: {type: Date, default: Date.now},
      status: {type: Number, min: 0, max: 1, default: 1},
      name: {type: String, required: true, maxlength: 100},
      templateType: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3010"])},
      stop_flag: {type: Boolean, default: false},//停用标志 模版是否停用,当模版中的医护停用或变化
      content:[{
        x_axis: {type: Number, min: 0, required: true},
        y_axis: {type: mongoose.Schema.Types.ObjectId}, //医生和护士轴
        type:{type: String,required: true, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3042"])},//辅助判断是医生还是护士
        aggr_value: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'psn_nursingShift'}
      }],
      tenantId: {type: mongoose.Schema.Types.ObjectId}
    }, {
      toObject: {
        virtuals: true
      }
      , toJSON: {
        virtuals: true
      }
    });

    doctorNurseScheduleTemplateSchema.virtual('type_name').get(function () {
      if (this.templateType) {
        return D3010[this.templateType].name;
      }
      return '';
    });

    doctorNurseScheduleTemplateSchema.virtual('stop_result_name').get(function () {
      if (this.stop_result) {
        return D3011[this.stop_result].name;
      }
      return '';
    });

    doctorNurseScheduleTemplateSchema.pre('update', function (next) {
      this.update({}, {$set: {operated_on: new Date()}});
      next();
    });

    return mongoose.model(name, doctorNurseScheduleTemplateSchema, name);
  }
}