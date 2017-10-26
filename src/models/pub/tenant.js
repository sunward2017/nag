/**
 * Created by zppro on 16-8-28.
 * 管理中心 租户实体
 */
var mongoose = require('mongoose');
module.isloaded = false;

module.exports = function(ctx,name) {
  if (module.isloaded) {
    return mongoose.model(name);
  }
  else {
    ;
    module.isloaded = true;

    function needRefreshToken(document) {
      return !document.token || (document.token_expired && ctx.moment(document.token_expired).diff(ctx.moment()) < 0 );
    }

    function setNewToken(document) {
      document.token = ctx.uid(8);
      document.token_expired = ctx.moment().add(3, 'M');
    }


    //var open_func_schema = require('./func')(ctx,'pub_func').schema;

    var tenantSchema = new mongoose.Schema({
      check_in_time: {type: Date, default: Date.now},
      operated_on: {type: Date, default: Date.now},
      status: {type: Number, min: 0, max: 1, default: 1},
      name: {type: String, required: true, maxlength: 30},
      phone: {type: String, maxlength: 20, unique: true, index: true},
      email: {type: String, maxlength: 30, unique: true, index: true},
      type: {type: String, enum: ctx._.rest(ctx.dictionary.keys["D1002"])},
      active_flag: {type: Boolean, default: false},//开通标志 租户是否可用
      certificate_flag: {type: Boolean, default: false},//认证标志 是否式正式租户
      token: {type: String, required: true, minlength: 8, maxlength: 8},//租户标识(8位)
      token_expired: {type: Date},//租户标识过期时间
      validate_util: {type: Date, required: true},
      limit_to: {type: Number, min: 0, default: 0},//0不限发布产品数量
      //99alive 资质相关
      nature: {type: String, enum: ctx._.rest(ctx.dictionary.keys["D3035"])}, //机构性质
      type2: {type: String, enum: ctx._.rest(ctx.dictionary.keys["D3036"])}, //机构类型
      service_object: {type: String, enum: ctx._.rest(ctx.dictionary.keys["D3037"])}, //服务对象
      published_on: {type: Date}, //成立时间
      address: {type: String, maxlength: 200}, //机构地址
      area: {type: String}, //所在城市
      imgs: [String],//添加图片
      //定价模块
      price_funcs: [{
        check_in_time: {type: Date, default: Date.now},//最新定价时间
        func_id: {type: String, required: true},
        func_name: {type: String, required: true},
        subsystem_id: {type: String, required: true},
        subsystem_name: {type: String, required: true},
        price: {type: Number, default: 0.00},//期间收费价格
        orderNo: {type: Number, default: 0}//排序序号
      }],
      //开通模块（通过订单）
      open_funcs: [{
        check_in_time: {type: Date, default: Date.now},//开通时间
        func_id: {type: String, required: true},
        func_name: {type: String, required: true},
        subsystem_id: {type: String, required: true},
        subsystem_name: {type: String, required: true},
        charge: {type: Number, default: 0.00},//月费
        orderNo: {type: Number, default: 0},//排序序号
        //payed: {type: Boolean, default: false},
        expired_on: {type: Date, default: ctx.moment('1970-01-01T00:00:00+0000')}
      }],
      charge_standards: [{
        charge_standard: {type: String, required: true},
        subsystem: {type: String, required: true},
        charge_items: [{
          check_in_time: {type: Date, default: Date.now},
          item_id: {type: String, required: true},
          item_name: {type: String, required: true},
          period_price: {type: Number, default: 0.00},
          period: {type: String, required: true, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D1015"])},
          orderNo: {type: Number, default: 0}
        }]
      }],
      general_ledger: {type: Number, default: 0.00},//一般在通过流水月结转
      subsidiary_ledger: {
        self: {type: Number, default: 0.00},//主账户
        other: {type: Number, default: 0.00} //其他账户
      },
      head_of_agency: {
        name: {type: String}, //机构负责人姓名
        phone: {type: String} //机构负责人电话
      },
      other_config: {
        psn_fee_range: {type: String, enum: ctx._.rest(ctx.dictionary.keys["D3032"])}, //收费区间
        psn_star_range: {type: String, enum: ctx._.rest(ctx.dictionary.keys["D3033"])}, //机构评级
        psn_beds_num: {type: String, enum: ctx._.rest(ctx.dictionary.keys["D3034"])}, //床位数
        psn_bed_monitor_timeout: {type: Number, default: 5.00},//睡眠带超时时间设置，单位：分钟，默认5分钟
        psn_bed_monitor_timeout_alarm_begin: {type: String, minlength: 5, maxlength: 5, default: '22:00'},//睡眠带报警时间范围，起始时间,22:00
        psn_bed_monitor_timeout_alarm_end: {type: String, minlength: 5, maxlength: 5, default: '06:00'},//睡眠带报警时间范围，结束时间,06:00
        pub_alarm_D3016_settings: [{
          reason: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3016"])},
          content_template: {type: String},
          level: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3029"])},//报警等级
          modes: [{
            value: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3030"])},
            receivers: [{
              type: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3031"])},
              value: {type: String} // 接收者类型 = A3001 使用
            }]
          }]//报警方式 可多选
        }],
        pub_assessment_regular_period: {type: Number, default: 3.00},//定期评估周期，单位：月，默认3个月
        psn_drug_in_stock_expire_date_check_flag: {type: Boolean, default: false}, // 药品入库是否需要检查效期 (扫码时是否要输入效期字段)
        psn_drug_stock_alarm_low_day: {type: Number, default: 3, min: 0},// 药品低库存警戒(剩余天数)
        psn_meal_biz_mode: {type: String, minlength: 5, maxlength: 5, enum: ctx._.rest(ctx.dictionary.keys["D3041"])}, //订餐模式
        psn_meal_periods: [String] //D3040
      }
    });

    tenantSchema.pre('update', function (next) {
      this.model.findById(this._compiledUpdate.$set._id).exec().then(function (document) {
        if (needRefreshToken(document)) {
          document.save();
        }

      });
      this.update({}, {
        $set: {
          operated_on: new Date()
        }
      });
      next();

    });

    tenantSchema.pre('validate', function (next) {
      if (needRefreshToken(this)) {
        setNewToken(this);
      }
      next();
    });


    tenantSchema.$$skipPaths = ['price_funcs', 'open_funcs', 'charge_standards', 'charge_items', 'subsidiary_ledger'];

    //tenantSchema.methods.needRefreshToken = function(){
    //    console.log(this);
    //}

    return mongoose.model(name, tenantSchema, name);
  }
}