/**
 * Created by zppro on 17-4-27.
 * 养老机构 护理组实体
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

        var nursingGroupSchema = new mongoose.Schema({
            check_in_time: {type: Date, default: Date.now},
            operated_on: {type: Date, default: Date.now},
            status: {type: Number, min: 0, max: 1, default: 1},
            name: {type: String, required: true, maxlength: 30},
            members: [{
                nursingWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'psn_nursingWorker' },
                name: {type: String, required: true, maxlength: 30}, //冗余
                leader_flag: { type: Boolean, default: false } // 需要组长标识,确保同一组内仅有一个
            }],
            stop_flag: {type: Boolean, default: false},//停用标志 护理组是否可用
            stoped_on: {type: Date},
            tenantId: {type: mongoose.Schema.Types.ObjectId}
        }, {
            toObject: {
                virtuals: true
            }
            , toJSON: {
                virtuals: true
            }
        });

        nursingGroupSchema.pre('update', function (next) {
            this.update({}, {$set: {operated_on: new Date()}});
            next();
        });

        nursingGroupSchema.virtual('leader_name').get(function () {
            if (this.members && this.members.length > 0) {
                var memberAsLeader;
                if (this.members.length == 1) {
                    memberAsLeader = this.members[0];
                } else {
                    memberAsLeader = ctx._.find(this.members, (o)=>{
                       return o.leader_flag;
                    });
                }
                if (memberAsLeader) {
                    return memberAsLeader.name;
                }
                return '';
            }
            return '';
        });

        nursingGroupSchema.virtual('members_summary').get(function () {
            if (this.members && this.members.length > 0) {
                return ctx._.map(this.members, (o)=> {
                    return o.name;
                }).join();
            }
            return '';
        });

        return mongoose.model(name, nursingGroupSchema, name);
    }
}