/**
 * Created by zppro on 17-7-14.
 * 养老机构 交接班日志
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

    var handoverLogSchema = new mongoose.Schema({
      check_in_time: {type: Date, default: Date.now},
      operated_on: {type: Date, default: Date.now},
      operated_by: {type: mongoose.Schema.Types.ObjectId},
      operated_by_name: {type: String},
      status: {type: Number, min: 0, max: 1, default: 1},
      elderlies: [{type: mongoose.Schema.Types.ObjectId, ref: 'psn_elderly'}],
      title: {type: String},
      description: {type: String, maxLength: 200},
      level: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3029"])},//报警等级
      voice_records: [{
        url: {type: String},
        secords: {type: Number, min: 1, max: 60}
      }],
      tenantId: {type: mongoose.Schema.Types.ObjectId}
    }, {
      toObject: {
        virtuals: true
      },
      toJSON: {
        virtuals: true
      }
    });

    handoverLogSchema.pre('update', function (next) {
      this.update({}, {$set: {operated_on: new Date()}});
      next();
    });

    return mongoose.model(name, handoverLogSchema, name);
  }
}
