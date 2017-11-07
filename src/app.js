/**
 * nodejs app入口.
 */

'use strict';

var _ = require('underscore');
var moment = require("moment");
moment.locale('zh-cn');

var log4js = require('log4js');
var koa = require('koa');
var Router = require('koa-router');
var router = Router();
var koaBody = require('koa-body')();
var xmlBodyParser = require('koa-xml-body').default;
var staticCache = require('koa-static-cache');
var koaStatic = require('koa-static');
var path = require('path');
var fs = require('fs-extra');
var co = require('co');
var thunkify = require('thunkify');
var rfcore = require('rfcore');
var mongoose = require('mongoose');
var clog = require('./libs/CombineLogger');
var auth = require('./nws/auth.js');
var crossDomainInterceptor = require('./nws/crossDomainInterceptor.js');
var authApp = require('./nws/authApp.js');
var authAppRobot = require('./nws/authAppRobot.js');
var authWXApp = require('./nws/authWXApp.js');

var app = koa();
app.conf = {
    isProduction: true,
    dir: {
        root: __dirname,
        rawData: path.join(__dirname, 'raw-data'),
        log: path.join(__dirname, 'logs'),
        service: path.join(__dirname, 'services'),
        meServices: path.join(__dirname, 'me-services'),
        debugServices: path.join(__dirname, 'debug-services'),
        scheduleJobs: path.join(__dirname, 'jobs'),
        sequenceDefs: path.join(__dirname, 'sequences'),
        businessComponents: path.join(__dirname, 'business-components'),
        socketProviders: path.join(__dirname, 'socket-providers'),
        static_develop: '../pub-client-develop/',
        static_production: '../pub-client-production/'
    },
    bodyParser: {
        xml: ['/me-services/weixin/app/payNotify']
    },
    auth: {
        toPaths:['/services'],
        ignorePaths: ['/services/share/login', '/services/robot/sendTestMail', '/services/open', '/services/api']
    },
    authApp: {
        toPaths: ['/me-services/api', '/me-services/trv', '/me-services/qiniu/open/uploadToken'],
        // ignorePaths: [{path: '/me-services/api/orders', method: 'get'}, '/me-services/trv/experience/', '/me-services/api/FourSeasonTour', '/me-services/api/proxyLogin', '/me-services/api/proxyLoginByToken']
        ignorePaths: ['/me-services/api/FourSeasonTour', '/me-services/api/proxyLogin', '/me-services/api/proxyLoginByToken', '/me-services/api/updateContent', '/me-services/api/reStatMemberInfo', '/me-services/mws']
    },
    authAppRobot: {
        toPaths: ['/me-services/psn']
    },
    authWXApp: {
        toPaths: ['/me-services/het', '/me-services/app', '/me-services/qiniu/open/uploadTokenForWXApp'],
        // ignorePaths: ['/me-services/app/psn']
    },
    crossDomainInterceptor:{
        toPaths:['/me-services/api', '/me-services/trv', '/me-services/weixin/open', '/me-services/weixin/open', '/me-services/qiniu/open/uploadToken']
    },
    db: {
        //mssql数据库配置
        sqlserver: {
            user: '数据库用户',
            password: '密码',
            server: '服务器IP',
            port: '服务器端口',
            database: '数据库名'
        },
        mongodb: {
            user: '数据库用户',
            password: '密码',
            server: '服务器IP',
            port: '服务器端口',
            database: '数据库名'
        }
    },
    secure: {
        authSecret: '认证密钥',
        authSecretRobot: '机器人App使用的认证密钥',
        authSecretWXApp: '微信小程序使用的认证密钥'
    },
    client: {
        bulidtarget: 'default'
    },
    port: 80
};

console.log('config...');
console.log(process.version);
// conf
rfcore.config(app.conf,process.argv);

//去除字符对bool的影响
app.conf.isProduction = app.conf.isProduction == true || app.conf.isProduction === 'true';

// console.log(JSON.stringify(app.conf.secure));

//ensure dirs
console.log('ensure dirs...');
_.each(app.conf.dir,function(v){
    fs.ensureDir(v);
});

//load wrapper
app.wrapper = {
    cb: thunkify,
    res: {
        default: function (msg) {
            return {success: true, code: 0, msg: msg};
        },
        error: function (err) {
            return {success: false, code: err.code, msg: err.message};
        },
        ret: function (ret, msg) {
            return {success: true, code: 0, msg: msg, ret: ret};
        },
        rows: function (rows, msg) {
            return {success: true, code: 0, msg: msg, rows: rows};
        }
    }
};

//memory-Cache
app.cache = require('memory-cache');

//load dictionary
app.dictionary = rfcore.factory('dictionary');


//load pre-defined except dictionary.json
app.modelVariables = require('./pre-defined/model-variables.json');

//init database object
app.db = {};

//underscore
app._ = _;

//crypto
app.crypto = require('crypto');

app.clone = require('clone');

//pinyin
//app.pinyin = require('pinyin');

app.coOnError = function (err) {
    // log any uncaught errors
    // co will not throw any errors you do not handle!!!
    // HANDLE ALL YOUR ERRORS!!!
    console.error(err.stack);
};

app.onJobExecute = function (job_id) {
    return co(function*() {
        var jobStatus = yield app.modelFactory().model_one(app.models['pub_jobStatus'], {where: {job_id: job_id}});
        if (jobStatus) {
            console.log('onJobExecute--------------------refresh last_exec_on')
            jobStatus.last_exec_on = moment();
            yield jobStatus.save();
        }
    });
};

//moment
app.moment = moment;

//rfcore.util
app.util = rfcore.util;
 
//mongoose default date function
app.utcNow  = function() {
    return moment().add(8, 'h');
};

//mongoose string to objectId function
app.ObjectId = mongoose.Types.ObjectId;

//解析参数model
app.getModelOption =  function (ctx) {
    var modelName = ctx.params.model.split('-').join('_');//将 A-B改为A_B
    var modelPath = '../models/' + modelName.split('_').join('/');
    return {model_name: modelName, model_path: modelPath};
};

app.uid = require('rand-token').uid;

app.clog = clog;

// logger
//app.use(function *(next){
//    var start = new Date;
//    yield next;
//    var ms = new Date - start;
//    console.log('logger    %s %s - %s', this.method, this.url, ms);
//});

//Session
//app.keys = ['leblue'];
//app.use(session(app));




console.log('co...');

co(function*() {
  //app.conf.serviceFiles = yield thunkify(fs.readdir)(app.conf.dir.service);
  //console.log('serviceFiles:'+JSON.stringify(app.conf.serviceFiles));
  console.log('load dictionary...');
  yield app.wrapper.cb(app.dictionary.readJSON.bind(app.dictionary))('pre-defined/dictionary.json');

  //配置数据库
  console.log('configure mongoose...');
  //app.db.mongoose = monoogse;
  var connectStr = 'mongodb://{0}:{1}@{2}:{3}/{4}'.format(app.conf.db.mongodb.user, app.conf.db.mongodb.password, app.conf.db.mongodb.server, app.conf.db.mongodb.port, app.conf.db.mongodb.database)
  mongoose.connect(connectStr);
  app.db = mongoose.connection.on('error', function (err) {
    console.log('mongodb error:');
    console.error(err);
  });
  mongoose.Promise = global.Promise;

  console.log('configure models...');
  app.modelsDirStructure = yield app.util.readDirectoryStructure(path.resolve('models'), '.js');
  var ModelFactory = require('./libs/ModelFactory');
  ModelFactory.loadModel.bind(app)(app.modelsDirStructure);
  app.models = ModelFactory.models;
  app.modelFactory = ModelFactory.bind(app);


  console.log('configure schedule sequence defs...');
  app.conf.sequenceDefNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.sequenceDefs)), function (o) {
    return o.substr(0, o.indexOf('.'))
  });


  console.log('configure business-components...');
  app.conf.businessComponentNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.businessComponents)), function (o) {
    return o.substr(0, o.indexOf('.'))
  });

  console.log('configure socket-providers...');
  app.conf.socketProviderNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.socketProviders)), function (o) {
    return o.substr(0, o.indexOf('.'))
  });

  console.log('configure schedule jobs...');
  app.conf.scheduleJobNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.scheduleJobs)), function (o) {
    return o.substr(0, o.indexOf('.'))
  });

  console.log('configure services...');
  app.conf.serviceNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.service)), function (o) {
    return o.substr(0, o.indexOf('.'))
  });
  app.conf.meServiceNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.meServices)), function (o) {
    return o.substr(0, o.indexOf('.'))
  });


  if (!app.conf.isProduction) {
    app.conf.debugServiceNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.debugServices)), function (o) {
      return o.substr(0, o.indexOf('.'))
    });
  }

  console.log('configure logs...');
  var configAppenders = [];
  configAppenders = _.union(configAppenders,
    _.map(app.conf.serviceNames, function (o) {
      var getLogConfig = require('./services/' + o).getLogConfig;
      if (getLogConfig && typeof getLogConfig === 'function') {
        return require('./services/' + o).getLogConfig(app);
      } else {
        var logName = 'svc_' + o + '.js';
        return {
          type: 'dateFile',
          filename: path.join(app.conf.dir.log, logName),
          pattern: '-yyyy-MM-dd.log',
          alwaysIncludePattern: true,
          category: logName
        };
      }
    }),
    _.map(app.conf.meServiceNames, function (o) {
      var getLogConfig = require('./me-services/' + o).getLogConfig;
      if (getLogConfig && typeof getLogConfig === 'function') {
        return require('./me-services/' + o).getLogConfig(app);
      } else {
        var logName = 'mesvc_' + o + '.js';
        return {
          type: 'dateFile',
          filename: path.join(app.conf.dir.log, logName),
          pattern: '-yyyy-MM-dd.log',
          alwaysIncludePattern: true,
          category: logName
        };
      }
    }),
    _.map(app.conf.businessComponentNames, function (o) {
      var getLogConfig = require('./business-components/' + o).getLogConfig;
      if (getLogConfig && typeof getLogConfig === 'function') {
        return require('./business-components/' + o).getLogConfig(app);
      } else {
        var logName = 'bc_' + o + '.js';
        return {
          type: 'dateFile',
          filename: path.join(app.conf.dir.log, logName),
          pattern: '-yyyy-MM-dd.log',
          alwaysIncludePattern: true,
          category: logName
        };
      }
    }),
    _.map(app.conf.socketProviderNames, function (o) {
      var getLogConfig = require('./socket-providers/' + o).getLogConfig;
      if (getLogConfig && typeof getLogConfig === 'function') {
        return require('./socket-providers/' + o).getLogConfig(app);
      } else {
        var logName = 'sp_' + o + '.js';
        return {
          type: 'dateFile',
          filename: path.join(app.conf.dir.log, logName),
          pattern: '-yyyy-MM-dd.log',
          alwaysIncludePattern: true,
          category: logName
        };
      }
    }));

  if (!app.conf.isProduction) {
    configAppenders = _.union(configAppenders, _.map(app.conf.debugServiceNames, function (o) {
      var getLogConfig = require('./debug-services/' + o).getLogConfig;
      if (getLogConfig && typeof getLogConfig === 'function') {
        return require('./debug-services/' + o).getLogConfig(app);
      } else {
        var logName = 'dsvc_' + o + '.js';
        return {
          type: 'dateFile',
          filename: path.join(app.conf.dir.log, logName),
          pattern: '-yyyy-MM-dd.log',
          alwaysIncludePattern: true,
          category: logName
        };
      }
    }));
  }

  //配置日志
  log4js.configure({
    appenders: configAppenders
  });


  console.log('configure sequences...');
  app.sequenceFactory = require('./libs/SequenceFactory').init(app);

  _.each(app.conf.sequenceDefNames, function (o) {
    app.sequenceFactory.factory(o);
  });

  //test the sequence
  // var code = yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.ORDER_OF_PFT);
  // console.log(code);
  // var code2 = yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.SCENICSPOT,'010101');
  // console.log(code2);

  console.log('configure business-components... ');
  //app.CarryOverManager = require('./business-components/CarryOverManager').init(app);
  //初始化业务组件
  _.each(app.conf.businessComponentNames, function (o) {
    app[o] = require('./business-components/' + o).init(app);
  });

  console.log('configure jobs...');
  app.jobManger = rfcore.factory('jobManager');
  _.each(app.conf.scheduleJobNames, function (o) {
    var jobDef = require('./jobs/' + o);
    console.log('create job use ' + o + '...');
    jobDef.register(app).then(function (jobRegInfo) {
      //更新到作业状态监控
      co(function*() {
        var jobStatus = yield app.modelFactory().model_one(app.models['pub_jobStatus'], {where: {job_id: jobRegInfo.job_id}});
        var stop_flag = !jobRegInfo.success;
        if (!stop_flag) {
          console.log('更新到作业状态监控...', jobRegInfo);
        }
        if (!jobStatus) {
          yield app.modelFactory().model_create(app.models['pub_jobStatus'], {
            job_id: jobRegInfo.job_id,
            job_name: jobRegInfo.job_name,
            job_rule: jobRegInfo.job_rule,
            stop_flag: stop_flag
          });
        } else {
          jobStatus.stop_flag = stop_flag;
          yield jobStatus.save();
        }
      });
    });
  });


  console.log('register router...');
  //注册服务路由
  _.each(app.conf.serviceNames, function (o) {
    var service_module = require('./services/' + o);
    _.each(service_module.actions, function (action) {
      var bodyParser;
      if (app.conf.bodyParser.xml.findIndex(function (o) {
          return action.url.startsWith(o);
        }) == -1) {
        // router.use(action.url, koaBody);
        bodyParser = koaBody;
      } else {
        bodyParser = xmlBodyParser({
          encoding: 'utf8', // lib will detect it from `content-type`
          onerror: (err, ctx) => {
            console.log(err);
            // ctx.throw(err.status, err.message);
          }
        });
        console.log('xmlBodyParser use to ' + action.url);
      }
      Router.prototype[action.verb].apply(router, [service_module.name + "_" + action.method, action.url, bodyParser, action.handler(app)]);
    });
  });
  _.each(app.conf.meServiceNames, function (o) {
    var service_module = require('./me-services/' + o);
    _.each(service_module.actions, function (action) {
      //support options for CORS
      Router.prototype['options'].apply(router, [action.url]);
      var bodyParser;
      if (app.conf.bodyParser.xml.findIndex(function (o) {
          return action.url.startsWith(o);
        }) == -1) {
        bodyParser = koaBody;
      } else {
        bodyParser = xmlBodyParser({
          encoding: 'utf8', // lib will detect it from `content-type`
          onerror: (err, ctx) => {
            console.log(err);
            // ctx.throw(err.status, err.message);
          }
        });
        console.log('xmlBodyParser use to ' + action.url);
      }

      Router.prototype[action.verb].apply(router, [service_module.name + "_" + action.method, action.url, bodyParser, action.handler(app)]);

    });
  });
  if (!app.conf.isProduction) {
    _.each(app.conf.debugServiceNames, function (o) {
      var service_module = require('./debug-services/' + o);
      _.each(service_module.actions, function (action) {
        var bodyParser;
        if (app.conf.bodyParser.xml.findIndex(function (o) {
            return action.url.startsWith(o);
          }) == -1) {
          bodyParser = koaBody;
        } else {
          bodyParser = xmlBodyParser({
            encoding: 'utf8', // lib will detect it from `content-type`
            onerror: (err, ctx) => {
              console.log(err);
              // ctx.throw(err.status, err.message);
            }
          });
          console.log('xmlBodyParser use to ' + action.url);
        }
        Router.prototype[action.verb].apply(router, [service_module.name + "_" + action.method, action.url, bodyParser, action.handler(app)]);
      });
    });
  }


  //注册静态文件（客户端文件）
  if (app.conf.isProduction) {
    app.use(staticCache(app.conf.dir.static_production + app.conf.client.bulidtarget, {alias: {'/': '/index.html'}}));
  }
  else {
    // app.use(koaStatic(app.conf.dir.static_develop + app.conf.client.bulidtarget));
    app.use(staticCache(app.conf.dir.static_develop + app.conf.client.bulidtarget, {alias: {'/': '/index-dev.html'}}));
    app.use(require('koa-livereload')());
  }

  //注册其他路由
  //router
  //    .get('/', function *(next) {
  //        this.body = 'hello guest';
  //        yield next;
  //    });

  // 注意router.use的middleware有顺序
  // router.use(koaBody);

  //中间件
  _.each(app.conf.auth.toPaths, function (o) {
    router.use(o, auth(app));
  });
  _.each(app.conf.crossDomainInterceptor.toPaths, function (o) {
    router.use(o, crossDomainInterceptor(app));
  });
  _.each(app.conf.authApp.toPaths, function (o) {
    router.use(o, authApp(app));
  });
  _.each(app.conf.authAppRobot.toPaths, function (o) {
    console.log(o);
    router.use(o, authAppRobot(app));
  });
  _.each(app.conf.authWXApp.toPaths, function (o) {
    console.log(o);
    router.use(o, authWXApp(app));
  });

  app.use(router.routes())
    .use(router.allowedMethods());


  var svr = app.listen(app.conf.port);
  app.socket_service.mountServer(svr);
  _.each(app.conf.socketProviderNames, function (o) {
    console.log(o);
    app.socket_service.registerSocketChannel(o, require('./socket-providers/' + o));
  });
  // app.socket_service.addMemberNamespace();
  // app.socket_service.addGroupNamespace();
  // //var io = require('socket.io').listen( app.listen(3000) );
  // app.group_service.joinMonitoring();

  //app.socket$psn_bed_monitor.mountServer(svr);


  console.log('listening...');

  // console.log(moment().weekday(0).add(7, 'days').add(1, 'days').format('ddd'))

  // var net = require('net');
  //
  // var HOST = '192.168.10.246';
  // var PORT = 8060;
  //
  // var client = new net.Socket();
  // client.connect(PORT, HOST, function() {
  //
  //     console.log('CONNECTED TO: ' + HOST + ':' + PORT);
  //     // 建立连接后立即向服务器发送数据，服务器将收到这些数据
  //     client.write('333333');
  //     console.log('send data finished');
  // });
  //
  // // 为客户端添加“data”事件处理函数
  // // data是服务器发回的数据
  // client.on('data', function(data) {
  //
  //     console.log('DATA: ' + data);
  //     // 完全关闭连接
  //     client.end('received:' + data);
  //
  // });
  //
  // // 为客户端添加“close”事件处理函数
  // client.on('close', function() {
  //     console.log('Connection closed');
  // });


  // console.log('elderly:', yield  app.modelFactory().model_one(app.models['psn_nursingRecord']).populate('elderlyId', 'birthday').populate('roomId', 'name floor').populate('assigned_worker', 'name'));

  // console.log('test app.spu_service');
  // var member1 = yield app.modelFactory().model_query(app.models['het_member']);
  // var member2 = yield app.modelFactory().model_query(app.models['trv_member']);
  // console.log(member1);
  // console.log(member2);
  // yield app.spu_service.appendSaleInfoByOrderPaySuccess(order);
  // console.log(app.moment(1492705810785).format('YYYY-MM-DD HH:mm:ss'))

  // var xlsx = require('node-xlsx').default;
  // var worksheets = xlsx.parse(app.conf.dir.root + '/raw-data/drug0921-t.xlsx');
  // console.dir(worksheets[0].data[0]);
  // console.dir(worksheets[0].data[1]);

  // var rooms = yield app.modelFactory().model_query(app.models['psn_room'], {
  //     select: 'name',
  //     where: {
  //         robots: {$elemMatch: {$eq: '58fd721e8ef00320ddda341b' }}
  //     }
  // });

  /* // 多级分组 查询关键词:mealOrderRecordStat2
  var DIC = require('./pre-defined/dictionary-constants.json');
  var tenantId = app.ObjectId("599bade9859e102d8b72f2ba");
  var psn_meal_periods = [DIC.D3040.BREAKFAST, DIC.D3040.LUNCH, DIC.D3040.DINNER, DIC.D3040.SUPPER];
  var x_axis_start = app.moment(app.moment().weekday(0).add(7, 'days').format('YYYY-MM-DD'));
  var x_axis_end = app.moment(app.moment().weekday(0).add(8, 'days').format('YYYY-MM-DD'));
  var where = {tenantId: tenantId, x_axis: {'$gte': x_axis_start.toDate(), '$lt': x_axis_end.toDate()}};
  var aggrPipe = [{
    $match: where
  },
    {
      $lookup: {
        from: "psn_elderly",
        localField: "elderlyId",
        foreignField: "_id",
        as: "elderly"
      }
    },
    {
      $unwind: '$elderly'
    },
    {
      $project: {
        elderly_name: '$elderly.name',
        districtId: '$elderly.room_value.districtId',
        roomId: '$elderly.room_value.roomId',
        bed_no: '$elderly.room_value.bed_no',
        period: '$y_axis',
        date: {$dateToString: {format: "%Y-%m-%d", date: "$x_axis"}},
        mealId: 1,
        quantity: 1
      }
    },
    {
      $lookup: {
        from: "psn_room",
        localField: "roomId",
        foreignField: "_id",
        as: "room"
      }
    },
    {
      $unwind: '$room'
    },
    {
      $project: {
        elderly_name: 1,
        districtId: '$room.districtId',
        roomId: 1,
        room_name: '$room.name',
        bed_no: 1,
        date: 1,
        period: 1,
        mealId: 1,
        quantity: 1
      }
    },
    {
      $sort: {'room_name': 1}
    },
    {
      $group: {
        _id: {elderly_name:'$elderly_name', date: '$date', districtId: '$districtId', roomId: '$roomId', room_name:'$room_name', bed_no: '$bed_no', period: '$period', mealId: '$mealId'},
        quantity: {$sum: '$quantity'}
      }
    },
    {
      $project: {
        _id: 0,
        districtId: '$_id.districtId',
        date: '$_id.date',
        period: '$_id.period',
        mealId: '$_id.mealId',
        elderly: {roomId: '$_id.roomId', room_name: '$_id.room_name', bed_no: '$_id.bed_no', name: '$_id.elderly_name', quantity: '$quantity'}
      }
    },
    {
      $group: {
        _id: {date: '$date', districtId: '$districtId', period: '$period', mealId: '$mealId'},
        elderlys: {$push: '$elderly'}
      }
    },
    {
      $lookup: {
        from: "psn_district",
        localField: "_id.districtId",
        foreignField: "_id",
        as: "district"
      }
    },
    {
      $unwind: '$district'
    },
    {
      $project: {
        _id: 0,
        districtId: '$district._id',
        district_name: '$district.name',
        period: '$_id.period',
        date: '$_id.date',
        mealId: '$_id.mealId',
        elderlys: 1
      }
    },
    {
      $group: {
        _id: {date: '$date', mealId: '$mealId', period: '$period'},
        districts: {
          $push: {
            districtId: '$districtId',
            district_name: '$district_name',
            elderlys: '$elderlys'
          }
        }
      }
    },
    {
      $lookup: {
        from: "psn_meal",
        localField: "_id.mealId",
        foreignField: "_id",
        as: "meal"
      }
    },
    {
      $unwind: '$meal'
    },
    {
      $project: {
        _id: 0,
        date: '$_id.date',
        period: '$_id.period',
        mealId: '$_id.mealId',
        meal_name: '$meal.name',
        districts: 1
      }
    },
    {
      $group: {
        _id: {date: '$date', period: '$period'},
        meals: {
          $push: {
            mealId: '$mealId',
            meal_name: '$meal_name',
            districts: '$districts'
          }
        }
      }
    },
    {
      $sort: {'_id.period': 1}
    },
    {
      $project: {
        _id: 0,
        date: '$_id.date',
        period: '$_id.period',
        meals: 1
      }
    }
  ];

  var rows = yield app.modelFactory().model_aggregate(app.models['psn_mealOrderRecord'], aggrPipe);
  console.log('meals$fetch:rows[0]>>', rows, '>>',rows[1],'>>>',rows[1].meals[0].districts[0]);
  */

  /* 多级分组 查询关键词:mealOrderRecordStat
   var DIC = require('./pre-defined/dictionary-constants.json');
   var tenantId = app.ObjectId("599bade9859e102d8b72f2ba");
   var psn_meal_periods = [DIC.D3040.BREAKFAST, DIC.D3040.LUNCH, DIC.D3040.DINNER, DIC.D3040.SUPPER];
   var x_axis_start = app.moment(app.moment().weekday(0).add(7, 'days').format('YYYY-MM-DD'));
   var x_axis_end = app.moment(app.moment().weekday(0).add(8, 'days').format('YYYY-MM-DD'));
   var where = {tenantId: tenantId, x_axis: {'$gte': x_axis_start.toDate(), '$lt': x_axis_end.toDate()}};
   var aggrPipe = [{
   $match: where
   },
   {
   $lookup: {
   from: "psn_elderly",
   localField: "elderlyId",
   foreignField: "_id",
   as: "elderly"
   }
   },
   {
   $unwind: '$elderly'
   },
   {
   $project: {
   elderly_name: '$elderly.name',
   roomId: '$elderly.room_value.roomId',
   period: '$y_axis',
   date: {$dateToString: {format: "%Y-%m-%d", date: "$x_axis"}},
   mealId: 1,
   quantity: 1
   }
   },
   {
   $lookup: {
   from: "psn_room",
   localField: "roomId",
   foreignField: "_id",
   as: "room"
   }
   },
   {
   $unwind: '$room'
   },
   {
   $project: {
   elderly_name: 1,
   districtId: '$room.districtId',
   floor: '$room.floor',
   date: 1,
   period: 1,
   mealId: 1,
   quantity: 1
   }
   },
   {
   $group: {
   _id: {date: '$date', districtId: '$districtId', floor: '$floor', period: '$period', mealId: '$mealId'},
   quantity: {$sum: '$quantity'}
   }
   },
   {
   $lookup: {
   from: "psn_meal",
   localField: "_id.mealId",
   foreignField: "_id",
   as: "meal"
   }
   },
   {
   $unwind: '$meal'
   },
   {
   $project: {
   _id: 0,
   districtId: '$_id.districtId',
   floor: '$_id.floor',
   date: '$_id.date',
   period: '$_id.period',
   meal:  { name: '$meal.name', quantity: '$quantity'}
   }
   },
   // {
   //   $sort: {'_id.period': 1}
   // },
   {
   $group: {
   _id: {date: '$date', districtId: '$districtId', floor: '$floor', period: '$period'},
   meals: {$push: '$meal' }
   }
   },
   {
   $project: {
   _id: 0,
   districtId: '$_id.districtId',
   floor: '$_id.floor',
   date: '$_id.date',
   'A0000': {$cond: {if: {$eq: ['$_id.period', 'A0000']}, then: '$$CURRENT.meals', else: []}},
   'A0001': {$cond: {if: {$eq: ['$_id.period', 'A0001']}, then: '$$CURRENT.meals', else: []}},
   'A0002': {$cond: {if: {$eq: ['$_id.period', 'A0002']}, then: '$$CURRENT.meals', else: []}}
   }
   },
   {
   $group: {
   _id: {date: '$date', districtId: '$districtId', floor: '$floor'},
   A0000: {$push: '$A0000' },
   A0001: {$push: '$A0001' },
   A0002: {$push: '$A0002' }
   }
   },
   {
   $project: {
   _id: 0,
   districtId: '$_id.districtId',
   floor: '$_id.floor',
   date: '$_id.date',
   'A0000': {$concatArrays: [{$arrayElemAt: ['$A0000', 0]}, {$arrayElemAt: ['$A0000', 1]}, {$arrayElemAt: ['$A0000', 2]}]},
   'A0001': {$concatArrays: [{$arrayElemAt: ['$A0001', 0]}, {$arrayElemAt: ['$A0001', 1]}, {$arrayElemAt: ['$A0001', 2]}]},
   'A0002': {$concatArrays: [{$arrayElemAt: ['$A0002', 0]}, {$arrayElemAt: ['$A0002', 1]}, {$arrayElemAt: ['$A0002', 2]}]}
   }
   },
   {
   $group: {
   _id: {date: '$date', districtId: '$districtId'},
   floors: {$push: {
   floor: '$floor',
   A0000: '$A0000',
   A0001: '$A0001',
   A0002: '$A0002'
   }}
   }
   },
   {
   $lookup: {
   from: "psn_district",
   localField: "_id.districtId",
   foreignField: "_id",
   as: "district"
   }
   },
   {
   $unwind: '$district'
   },
   {
   $project: {
   _id: 0,
   districtId: '$district._id',
   district_name: '$district.name',
   date: '$_id.date',
   floors: '$floors'
   }
   },
   ];


   var rows = yield app.modelFactory().model_aggregate(app.models['psn_mealOrderRecord'], aggrPipe);
   console.log('meals$fetch:rows[0]>>', rows[0]);
   */

  /* 多级分组 查询关键词:mealOrderRecords$fetchByDateRange
   // var userId = app.ObjectId("59f13c02e1ca4e177e9f592f");
   // var DIC = require('./pre-defined/dictionary-constants.json');
   // var tenantId = app.ObjectId("599bade9859e102d8b72f2ba");
   // var psn_meal_biz_mode = DIC.D3041.PRE_BOOKING;
   // var psn_meal_periods = [DIC.D3040.BREAKFAST, DIC.D3040.LUNCH, DIC.D3040.DINNER, DIC.D3040.SUPPER];
   //
   // var x_axis_start = app.moment(app.moment().weekday(0).add(7, 'days').format('YYYY-MM-DD'));
   // var x_axis_end = app.moment(app.moment().weekday(0).add(14, 'days').format('YYYY-MM-DD'));
   // var where = {tenantId: tenantId, x_axis: {'$gte': x_axis_start.toDate(), '$lt': x_axis_end.toDate()}};
   // console.log('-----|||||||---------');
   //
   // var dataPermissionRecord = yield app.modelFactory().model_one(app.models['pub_dataPermission'], {
   //   select: 'object_ids',
   //   where: {
   //     status: 1,
   //     subsystem: app.modelVariables["PENSION-AGENCY"]['SUB_SYSTEM'],
   //     subject_model: 'pub-user',
   //     subject_id: userId,
   //     object_type: DIC.D0105.ROOM,
   //     tenantId: tenantId
   //   }
   // });
   // console.log('dataPermissionRecord:', dataPermissionRecord);
   // var elderlys = yield app.modelFactory().model_query(app.models['psn_elderly'], {
   //   select: '_id',
   //   where: {
   //     status: 1,
   //     tenantId: tenantId,
   //     live_in_flag: true,
   //     begin_exit_flow: {$ne: true},
   //     'room_value.roomId': {$in: dataPermissionRecord.object_ids}
   //   }
   // });
   // where.elderlyId = {$in: app._.map(elderlys, o => o._id)}
   //
   // var rows = yield app.modelFactory().model_aggregate(app.models['psn_mealOrderRecord'], [
   //   {
   //     $match: where
   //   },
   //   {
   //     $lookup: {
   //       from: "psn_meal",
   //       localField: "mealId",
   //       foreignField: "_id",
   //       as: "meal"
   //     }
   //   },
   //   {
   //     $unwind: '$meal'
   //   },
   //   {
   //     $project: {
   //       elderlyId: '$elderlyId',
   //       elderly_name: '$elderly_name',
   //       weekDay: {$dayOfWeek: '$x_axis'},
   //       date: {$dateToString: {format: "%Y-%m-%d", date: "$x_axis"}},
   //       period: '$y_axis',
   //       meal: '$meal',
   //       quantity: '$quantity'
   //     }
   //   },
   //   {
   //     $group: {
   //       _id: {elderlyId: '$elderlyId', period: '$period', weekDay: '$weekDay'},
   //       elderly_name: {$first: '$elderly_name'},
   //       date: {$first: '$date'},
   //       meals: {$push: { mealId: '$meal._id', name: '$meal.name', x_axis: '$date', quantity: '$quantity'} }
   //     }
   //   },
   //   {
   //     $sort: {'_id.period': 1}
   //   },
   //   {
   //     $project: {
   //       _id: 0,
   //       elderlyId: '$_id.elderlyId',
   //       weekDay: { $subtract: [ '$_id.weekDay', 1 ]},
   //       period: '$_id.period',
   //       elderly_name: '$elderly_name',
   //       date: '$date',
   //       A0000: {
   //         0: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0000']},{$eq: ['$_id.weekDay', 1]}]}, then: '$$CURRENT.meals', else: []}},
   //         1: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0000']},{$eq: ['$_id.weekDay', 2]}]}, then: '$$CURRENT.meals', else: []}},
   //         2: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0000']},{$eq: ['$_id.weekDay', 3]}]}, then: '$$CURRENT.meals', else: []}},
   //         3: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0000']},{$eq: ['$_id.weekDay', 4]}]}, then: '$$CURRENT.meals', else: []}},
   //         4: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0000']},{$eq: ['$_id.weekDay', 5]}]},then: '$$CURRENT.meals', else: []}},
   //         5: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0000']},{$eq: ['$_id.weekDay', 6]}]}, then: '$$CURRENT.meals', else: []}},
   //         6: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0000']},{$eq: ['$_id.weekDay', 7]}]}, then: '$$CURRENT.meals', else: []}}
   //       },
   //       A0001: {
   //         0: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0001']},{$eq: ['$_id.weekDay', 1]}]}, then: '$$CURRENT.meals', else: []}},
   //         1: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0001']},{$eq: ['$_id.weekDay', 2]}]}, then: '$$CURRENT.meals', else: []}},
   //         2: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0001']},{$eq: ['$_id.weekDay', 3]}]}, then: '$$CURRENT.meals', else: []}},
   //         3: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0001']},{$eq: ['$_id.weekDay', 4]}]}, then: '$$CURRENT.meals', else: []}},
   //         4: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0001']},{$eq: ['$_id.weekDay', 5]}]},then: '$$CURRENT.meals', else: []}},
   //         5: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0001']},{$eq: ['$_id.weekDay', 6]}]}, then: '$$CURRENT.meals', else: []}},
   //         6: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0001']},{$eq: ['$_id.weekDay', 7]}]}, then: '$$CURRENT.meals', else: []}}
   //       },
   //       A0002: {
   //         0: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0002']},{$eq: ['$_id.weekDay', 1]}]}, then: '$$CURRENT.meals', else: []}},
   //         1: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0002']},{$eq: ['$_id.weekDay', 2]}]}, then: '$$CURRENT.meals', else: []}},
   //         2: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0002']},{$eq: ['$_id.weekDay', 3]}]}, then: '$$CURRENT.meals', else: []}},
   //         3: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0002']},{$eq: ['$_id.weekDay', 4]}]}, then: '$$CURRENT.meals', else: []}},
   //         4: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0002']},{$eq: ['$_id.weekDay', 5]}]},then: '$$CURRENT.meals', else: []}},
   //         5: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0002']},{$eq: ['$_id.weekDay', 6]}]}, then: '$$CURRENT.meals', else: []}},
   //         6: {$cond: {if: {$and: [{$eq: ['$_id.period', 'A0002']},{$eq: ['$_id.weekDay', 7]}]}, then: '$$CURRENT.meals', else: []}}
   //       }
   //     }
   //   },
   //   {
   //     $group: {
   //       _id: {elderlyId: '$elderlyId'},
   //       elderly_name: {$first: '$elderly_name'},
   //       A0000: {$push: '$A0000'},
   //       A0001: {$push: '$A0001'},
   //       A0002: {$push: '$A0002'}
   //     }
   //   },
   //
   // ]);
   // console.log('meals$fetch:rows>>', rows);
   // console.log('meals$fetch:rows[0]>>', rows[0]);
   // console.log('meals$fetch:rows[0].A0000>>', rows[0].A0000);
   // _.each(rows, function(row){
   //   row.A0000 = _.reduce(row.A0000, (total, row2) => {
   //     total[0] = (total[0] || []).concat(row2[0])
   //     total[1] = (total[1] || []).concat(row2[1])
   //     total[2] = (total[2] || []).concat(row2[2])
   //     total[3] = (total[3] || []).concat(row2[3])
   //     total[4] = (total[4] || []).concat(row2[4])
   //     total[5] = (total[5] || []).concat(row2[5])
   //     total[6] = (total[6] || []).concat(row2[6])
   //     return total;
   //   }, {})
   //   row.A0001 = _.reduce(row.A0001, (total, row2) => {
   //     total[0] = (total[0] || []).concat(row2[0])
   //     total[1] = (total[1] || []).concat(row2[1])
   //     total[2] = (total[2] || []).concat(row2[2])
   //     total[3] = (total[3] || []).concat(row2[3])
   //     total[4] = (total[4] || []).concat(row2[4])
   //     total[5] = (total[5] || []).concat(row2[5])
   //     total[6] = (total[6] || []).concat(row2[6])
   //     return total;
   //   }, {})
   //   row.A0002 = _.reduce(row.A0002, (total, row2) => {
   //     total[0] = (total[0] || []).concat(row2[0])
   //     total[1] = (total[1] || []).concat(row2[1])
   //     total[2] = (total[2] || []).concat(row2[2])
   //     total[3] = (total[3] || []).concat(row2[3])
   //     total[4] = (total[4] || []).concat(row2[4])
   //     total[5] = (total[5] || []).concat(row2[5])
   //     total[6] = (total[6] || []).concat(row2[6])
   //     return total;
   //   }, {})
   // });
   // console.log('meals$fetch:rows[0]>>', rows[0]);
   // console.log('meals$fetch:rows[0].A0000>>', rows[0].A0000);
   */

}).catch(app.coOnError);



