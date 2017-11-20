/**
 * Created by hcl on 17-11-10.
 * 养老机构  -> 医护排班
 */
var mongoose = require('mongoose');

module.isloaded = false;


module.exports = function(ctx,name) {
  if (module.isloaded) {
    return mongoose.model(name);
  }
  else {
    module.isloaded = true;

    var doctorNurseScheduleSchema = new mongoose.Schema({
      check_in_time: {type: Date, default: Date.now},
      operated_on: {type: Date, default: Date.now},
      status: {type: Number, min: 0, max: 1, default: 1},
      x_axis: {type: Date, required: true}, //时间轴
      y_axis: {type: mongoose.Schema.Types.ObjectId,required: true}, //医生和护士轴
      type:{type: String,required: true, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3042"])},//辅助判断是医生还是护士
      aggr_value: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'psn_nursingShift'},
      tenantId: {type: mongoose.Schema.Types.ObjectId}
    }, {
      toObject: {
        virtuals: true
      }
      , toJSON: {
        virtuals: true
      }
    });

    doctorNurseScheduleSchema.virtual('x_axis_value').get(function () {
      return ctx.moment(this.x_axis).day();
    });

    doctorNurseScheduleSchema.pre('update', function (next) {
      this.update({}, {$set: {operated_on: new Date()}});
      next();
    });

    return mongoose.model(name, doctorNurseScheduleSchema, name);
  }
}