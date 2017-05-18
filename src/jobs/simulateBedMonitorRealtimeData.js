/**
 * Created by zppro on 17-5-17.
 * Target:睡眠带实时数据模拟
 */
var co = require('co');

var schedule = require('node-schedule');

var job_id = 'simulateBedMonitorRealtimeData';
var job_name =  '睡眠带实时数据模拟';

var job_rule = new schedule.RecurrenceRule();
var times = [];
for(var i=1; i<60; i++){
    times.push(i);
}
job_rule.second = times;

var printLog = true;
var socketServerEvents = require('../pre-defined/socket-server-events.json');

 module.exports = {
     needRegister: false,
     register: function (ctx) {
         if (this.needRegister) {
             return co(function*() {
                 var value = Math.random() * 1000;
                 ctx.jobManger.createJob(job_id, job_name, job_rule, ()=> {
                     console.log(ctx.moment().format('HH:mm:ss') + ' ' + job_id + '(' + job_name + ') => executing.');
                     if (ctx.onJobExecute && ctx._.isFunction(ctx.onJobExecute)) {
                         ctx.onJobExecute.call(null, job_id);
                     }

                     var ts = ctx.moment().unix();
                     value = Math.ceil(value + Math.random() * 21 - (ts % 2 == 0? 10 : 13));
                     console.log('生成模拟数据:', ts, value);
                     var channelName = 'psn$bed_monitor_listen';
                     ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR_LISTEN.WAVE_DATA, {
                         bedMonitorMac: 'A0:E6:F8:55:12:9F',
                         time: ts,
                         value: value
                     });

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