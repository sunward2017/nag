/**
 * Created by zppro on 17-3-6.
 * 养老机构 护士实体
 */
var mongoose = require('mongoose');

module.isloaded = false;


module.exports = function(ctx,name) {
    //console.log(_.rest(ctx.dictionary.keys["D1000"]));
    if (module.isloaded) {
        return mongoose.model(name);
    }
    else {
        module.isloaded = true;

        var nurseSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            code: {type: String, required: true, maxlength: 30},
            name: {type: String, required: true, maxlength: 30},
            phone: {type: String, maxlength: 20},
            leader_flag: {type: Boolean, default: false},//护士长标识
            stop_flag: {type: Boolean, default: false},//停用标志
            stoped_on: {type: Date},
            py: {type: String},
            userId: {type: mongoose.Schema.Types.ObjectId, ref: 'pub_user'},
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        nurseSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        return mongoose.model(name, nurseSchema, name);
    }
}