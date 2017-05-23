/**
 * Created by zppro on 17-5-9.
 * Target:照护记录数据更新 http://nodeclass.com/articles/78767
 */
 var co = require('co');
 var schedule = require('node-schedule');

 var job_id = 'nursingRecordInfoUpdate';
 var job_name =  '照护记录数据更新';
 var job_rule = '15 0 * * *';//每天 几点:几分 '15 0 * * *' 零点15分执行
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

                     console.log('归档昨天的照护记录')
                     ctx.app_archive_service.archivePSN$NursingRecord().then(()=>{
                         console.log('生成新一天的照护记录')
                         return co(function*() {
                             console.log('----------------------')
                             return yield ctx.psn_nursingRecord_generate_service.generateByTenantsOfPension()
                         });
                     }).catch(ctx.coOnError);
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