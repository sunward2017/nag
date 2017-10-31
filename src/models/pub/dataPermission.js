/**
 * Created by zppro on 17-10-30.
 * 管理中心 数据权限
 */
var mongoose = require('mongoose');
module.isloaded = false;


module.exports = function(ctx,name) {
  if (module.isloaded) {
    return mongoose.model(name);
  }
  else {
    module.isloaded = true;

    var dataPermissionSchema = new mongoose.Schema({
      check_in_time: {type: Date, default: Date.now},
      operated_on: {type: Date, default: Date.now},
      status: {type: Number, min: 0, max: 1, default: 1},
      subsystem: {type: String, required: true},
      subject_model: {type: String, required: true},
      subject_id: {type: mongoose.Schema.Types.ObjectId},
      object_type: {type: String, enum: ctx._.rest(ctx.dictionary.keys["D0105"])},
      object_ids: [{type: mongoose.Schema.Types.ObjectId}],
      tenantId: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'pub_tenant'}
    });

    dataPermissionSchema.pre('update', function (next) {
      this.update({}, {$set: {operated_on: new Date()}});
      next();
    });

    return mongoose.model(name, dataPermissionSchema, name);
  }
}