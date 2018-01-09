/**
 * Created by zppro on 17-6-29.=
 */
 var co = require('co');
 var schedule = require('node-schedule');

 var job_id = 'sendAlarmCircle';
 var job_name =  '每天每隔时间发送警报(level=橙色,红色)';
 var job_rule = '*/2 * * * *';//每2分钟

 // var job_rule = new schedule.RecurrenceRule();
 // var times = [];
 // for(var i=1; i<60; i+= 30) {
 //    times.push(i);
 // }
 // job_rule.second = times;

 var printLog = true;

 module.exports = {
     needRegister: true,
     register: function (ctx) {
         if (this.needRegister) {
             return co(function*() {
                 ctx.jobManger.createJob(job_id, job_name, job_rule, ()=> {
                     console.log(ctx.moment().format('HH:mm:ss') + ' ' + job_id + '(' + job_name + ') => executing.');
                     if (ctx.onJobExecute && ctx._.isFunction(ctx.onJobExecute)) {
                         ctx.onJobExecute.call(null, job_id);
                     }
                     ctx.pub_alarm_service.sendAlarmForLevelsOfOrangeAndRed();
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