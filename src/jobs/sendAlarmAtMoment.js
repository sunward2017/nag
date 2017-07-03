/**
 * Created by zppro on 17-6-29.
 */
 var co = require('co');
 var schedule = require('node-schedule');

var job_id = 'sendAlarmAtMoment';
var job_name =  '每天指定时刻发送通知(level=蓝色,黄色)';
var job_rule = '30 0 * * *';//每天 几点:几分 '30 0 * * *' 零点30分执行
var printLog = true;

 module.exports = {
     needRegister: false,
     register: function (ctx) {
         if (this.needRegister) {
             return co(function*() {
                 ctx.jobManger.createJob(job_id, job_name, job_rule, ()=> {
                     console.log(ctx.moment().format('HH:mm:ss') + ' ' + job_id + '(' + job_name + ') => executing.');
                     if (ctx.onJobExecute && ctx._.isFunction(ctx.onJobExecute)) {
                         ctx.onJobExecute.call(null, job_id);
                     }
                     ctx.pub_alarm_service.sendAlarmForLevelsOfBlueAndYellow();
                     // console.log(ctx.moment().format('HH:mm:ss') + ' ' + job_id + '(' + job_name + ') => executed.');
                 }, {printLog: printLog});

                 return {
                     success: true,
                     job_id: job_id,
                     job_name: job_name,
                     job_rule: job_rule
                 }
             }).catch(ctx.coOnError);
         }
         else {
             console.log(job_id + '(' + job_name + ') => skip register.');
             return Promise.resolve({
                 success: false,
                 job_id: job_id,
                 job_name: job_name,
                 job_rule: job_rule
             });
         }
     }
 }