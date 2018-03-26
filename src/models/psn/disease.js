/**
 * Created by hcl on 18-2-28.
 * 病症管理
 */
var mongoose = require('mongoose');

module.isloaded = false;

module.exports = function(ctx,name) {
  if (module.isloaded) {
    return mongoose.model(name);
  }
  else {
    module.isloaded = true;

    var diseaseSchema = new mongoose.Schema({
      check_in_time: {type: Date, default: Date.now},
      operated_on: {type: Date, default: Date.now},
      status: {type: Number, min: 0, max: 1, default: 1},
      name: {type: String, required: true, maxlength: 30},
      tenantId: {type: mongoose.Schema.Types.ObjectId,required: true,ref:'pub_tenant'}
    }, {
      toObject: {
        virtuals: true
      }
      , toJSON: {
        virtuals: true
      }
    });

    diseaseSchema.pre('update', function (next) {
      this.update({}, {$set: {operated_on: new Date()}});
      next();
    });

    return mongoose.model(name, diseaseSchema, name);
  }
}
