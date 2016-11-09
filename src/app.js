/**
 * nodejs app入口.
 */

'use strict';

var _ = require('underscore');
var moment = require("moment");
var log4js = require('log4js');
var koa = require('koa');
var Router = require('koa-router');
var router = Router();
var koaBody = require('koa-body')();
var staticCache = require('koa-static-cache');
var koaStatic = require('koa-static');
var path = require('path');
var fs = require('fs-extra');
var co = require('co');
var thunkify = require('thunkify');
var rfcore = require('rfcore');
var mongoose = require('mongoose');
var auth = require('./nws/auth.js');
var crossDomainInterceptor = require('./nws/crossDomainInterceptor.js');
var authApp = require('./nws/authApp.js');

var app = koa();
app.conf = {
    isProduction: true,
    dir: {
        root: __dirname,
        log: path.join(__dirname, 'logs'),
        service: path.join(__dirname, 'services'),
        meServices: path.join(__dirname, 'me-services'),
        debugServices: path.join(__dirname, 'debug-services'),
        scheduleJobs: path.join(__dirname, 'jobs'),
        sequenceDefs: path.join(__dirname, 'sequences'),
        businessComponents: path.join(__dirname, 'business-components'),
        static_develop: '../pub-client-develop/',
        static_production: '../pub-client-production/'
    },
    auth: {
        toPaths:['/services'],
        ignorePaths: ['/services/share/login', '/services/robot/sendTestMail', '/services/open/WeiXin$Connect']
    },
    authApp: {
        toPaths: ['/me-services'],
        ignorePaths: [{path: '/me-services/api/orders', method: 'get'}, '/me-services/api/proxyLogin', '/me-services/api/proxyLoginByToken', '/me-services/api/getWeiXinConfig']
    },
    crossDomainInterceptor:{
        toPaths:['/me-services']
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
        authSecret: '认证密钥'
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

//console.log(JSON.stringify(app.conf.db.mongodb));

//ensure dirs
console.log('ensure dirs...');
_.each(app.conf.dir,function(v){
    fs.ensureDir(v);
});

//load wrapper
app.wrapper = {
    cb: thunkify,
    res: {
        default: function () {
            return {success: true, code: 0, msg: null};
        },
        error: function (err) {
            return {success: false, code: err.code, msg: err.message};
        },
        ret: function (ret) {
            return {success: true, code: 0, msg: null, ret: ret};
        },
        rows: function (rows) {
            return {success: true, code: 0, msg: null, rows: rows};
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
    mongoose.Promise =  global.Promise;

    console.log('configure models...');
    app.modelsDirStructure = yield app.util.readDictionaryStructure(path.resolve('models'),'.js');
    var ModelFactory = require('./libs/ModelFactory');
    ModelFactory.loadModel.bind(app)(app.modelsDirStructure);
    app.models = ModelFactory.models;
    app.modelFactory = ModelFactory.bind(app);

    console.log('configure business-components...');
    app.conf.businessComponentNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.businessComponents)), function (o) {
        return o.substr(0, o.indexOf('.'))
    });

    console.log('configure schedule jobs...');
    app.conf.scheduleJobNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.scheduleJobs)), function (o) {
        return o.substr(0, o.indexOf('.'))
    });

    console.log('configure schedule sequence defs...');
    app.conf.sequenceDefNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.sequenceDefs)), function (o) {
        return o.substr(0, o.indexOf('.'))
    });

    console.log('configure services...');
    app.conf.serviceNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.service)), function (o) {
        return o.substr(0, o.indexOf('.'))
    });
    app.conf.meServiceNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.meServices)), function (o) {
        return o.substr(0, o.indexOf('.'))
    });


    if(!app.conf.isProduction){
        app.conf.debugServiceNames = _.map((yield app.wrapper.cb(fs.readdir)(app.conf.dir.debugServices)), function (o) {
            return o.substr(0, o.indexOf('.'))
        });
    }

    console.log('configure logs...');
    var configAppenders = [];
    configAppenders = _.union(configAppenders,
        _.map(app.conf.serviceNames, function (o) {
            var logName = 'svc_' + o+ '.js';
            return {
                type: 'dateFile',
                filename: path.join(app.conf.dir.log, logName),
                pattern: '-yyyy-MM-dd.log',
                alwaysIncludePattern: true,
                category: logName
            };
        }),
        _.map(app.conf.meServiceNames, function (o) {
            var logName = 'mesvc_' + o+ '.js';
            return {
                type: 'dateFile',
                filename: path.join(app.conf.dir.log, logName),
                pattern: '-yyyy-MM-dd.log',
                alwaysIncludePattern: true,
                category: logName
            };
        }),
        _.map(app.conf.businessComponentNames, function (o) {
            var logName = 'bc_' + o + '.js';
            return {
                type: 'dateFile',
                filename: path.join(app.conf.dir.log, logName),
                pattern: '-yyyy-MM-dd.log',
                alwaysIncludePattern: true,
                category: logName
            };
        }));

    if(!app.conf.isProduction){
        configAppenders = _.union(configAppenders,_.map(app.conf.debugServiceNames, function (o) {
            var logName = 'dsvc_' + o+ '.js';
            return {
                type: 'dateFile',
                filename: path.join(app.conf.dir.log, logName),
                pattern: '-yyyy-MM-dd.log',
                alwaysIncludePattern: true,
                category: logName
            };
        }));
    }

    //配置日志
    log4js.configure({
        appenders: configAppenders
    });


    console.log('configure sequences...');
    app.sequenceFactory = require('./libs/SequenceFactory').init(app.modelFactory(),app.models['pub_sequence']);

    _.each(app.conf.sequenceDefNames, function (o) {
        app.sequenceFactory.factory(o);
    });

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
        if (jobDef.needRegister) {
            console.log('create job use ' + o + '...');
            jobDef.register(app);
        }
    });

    console.log('register router...');
    //注册服务路由
    _.each(app.conf.serviceNames, function (o) {
        var service_module = require('./services/' + o);
        _.each(service_module.actions, function (action) {
            Router.prototype[action.verb].apply(router, [service_module.name + "_" + action.method, action.url, action.handler(app)]);
        });
    });
    _.each(app.conf.meServiceNames, function (o) {
        var service_module = require('./me-services/' + o);
        _.each(service_module.actions, function (action) {
            Router.prototype[action.verb].apply(router, [service_module.name + "_" + action.method, action.url, action.handler(app)]);

            //support options for CORS
            Router.prototype['options'].apply(router, [action.url]);
        });
    });
    if(!app.conf.isProduction){
        _.each(app.conf.debugServiceNames, function (o) {
            var service_module = require('./debug-services/' + o);
            _.each(service_module.actions, function (action) {
                Router.prototype[action.verb].apply(router, [service_module.name + "_" + action.method, action.url, action.handler(app)]);
            });
        });
    }


    //注册静态文件（客户端文件）
    if (app.conf.isProduction) {
        app.use(staticCache(app.conf.dir.static_production + app.conf.client.bulidtarget, {alias :{'/':'/index.html'}}));
    }
    else {
        app.use(koaStatic(app.conf.dir.static_develop + app.conf.client.bulidtarget));
        app.use(require('koa-livereload')());
    }

    //注册其他路由
    //router
    //    .get('/', function *(next) {
    //        this.body = 'hello guest';
    //        yield next;
    //    });

    //注意router.use的middleware有顺序
    router.use(koaBody);
    
    //中间件
    _.each(app.conf.auth.toPaths,function(o){
        router.use(o, auth(app));
    });
    _.each(app.conf.crossDomainInterceptor.toPaths,function(o){
        router.use(o, crossDomainInterceptor(app));
    });
    _.each(app.conf.authApp.toPaths,function(o){
        router.use(o, authApp(app));
    });

    app.use(router.routes())
        .use(router.allowedMethods());



    app.listen(app.conf.port);

    console.log('listening...');

}).catch(app.coOnError);



