/**
 * Created by zppro on 17-5-9.
 */
var co = require('co');
var DIC = require('../pre-defined/dictionary-constants.json');

module.exports = {
    init: function (ctx) {
        console.log('init nursingRecord generate service... ');
        var self = this;
        this.file = __filename;
        this.filename = this.file.substr(this.file.lastIndexOf('/') + 1);
        this.log_name = 'bc_' + this.filename;
        this.ctx = ctx;
        this.logger = require('log4js').getLogger(this.log_name);
        if (!this.logger) {
            console.error('logger not loaded in ' + this.file);
        }
        else {
            this.logger.info(this.file + " loaded!");
        }

        console.log(this.filename + ' ready... ');

        return this;
    },
    generateByTenantsOfPension: function () {
        var self = this;
        return co(function*() {
            var tenants = yield  self.ctx.modelFactory().model_query(self.ctx.models['pub_tenant'], {
                select: '_id',
                where: {
                    status: 1,
                    type: {'$in': [DIC.D1002.MINI_PENSION_ORG, DIC.D1002.MIDDLE_SIZE_PENSION_ORG, DIC.D1002.LARGE_SCALE_ORG]},
                    active_flag: true,
                    certificate_flag: true,
                    validate_util: {'$gte': self.ctx.moment()}
                }
            });
            for (var i = 0, len = tenants.length; i < len; i++) {
                console.log('tenantId:', tenants[i]);
                yield self.generateByTenantId(tenants[i]._id);
            }
            return true;
        }).catch(self.ctx.coOnError);
    },
    generateByTenantId: function (tenantId, elderlyId) {
        var self = this;
        return self._generate(null, elderlyId, tenantId);
    },
    generateByNursingRecordId: function (nursingRecordId) {
        var self = this;
        return self._generate(nursingRecordId);
    },
    _generate: function (nursingRecordId, elderlyId, tenantId) {
        var self = this;
        return co(function*() {

            var tenant, elderly, elderlyRoomValue, roomId, nursingPlanItems, nursingPlanItem, workItems, workOrDrugUseItem,
                nursingRecord, now, gen_batch_no, nursingWorkerScheduleItems, exec_date, exec_on, exec_date_string, remind_on;
            var elderlyMapRoom = {},
                nursingRecordsToSave = [],
                nursingRecordToSave, work_item_repeat_values, allEdlerlyIds, allElderly, nursingRecordExist,
                remind_max, remind_step, remind_start, exec_start, exec_end, warningMsg;
            try {

                if (nursingRecordId && !tenantId) {
                    // 根据当前的照护记录生成下一周期的记录
                    nursingRecord = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_nursingRecord'], nursingRecordId);
                    if (!nursingRecord) {
                        return self.ctx.wrapper.res.error({message: '无法找到照护记录!'});
                    }

                    elderlyId = nursingRecord.elderlyId;
                    tenantId = nursingRecord.tenantId;

                    nursingPlanItem = yield self.ctx.modelFactory().model_one(self.ctx.models['psn_nursingPlan'], {
                        where: {
                            status: 1,
                            elderlyId: elderlyId,
                            tenantId: tenantId
                        }
                    });
                    if (!nursingPlanItem) {
                        return self.ctx.wrapper.res.error({message: '无法找到照护计划!'});
                    }

                    var workItemIdOfCurrentNursingRecord = nursingRecord.workItemId.toString();
                    var workItemsInNursingPlanItem = nursingPlanItem.toObject().work_items;
                    workOrDrugUseItem = self.ctx._.find(workItemsInNursingPlanItem, (o)=> {
                        return o.workItemId == workItemIdOfCurrentNursingRecord;
                    });
                    if (!workOrDrugUseItem) {
                        return self.ctx.wrapper.res.error({message: '所属项目已经不在照护计划中!'});
                    }

                    //房间床位检查
                    elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
                    elderlyRoomValue = elderly.room_value;
                    gen_batch_no = yield self.ctx.sequenceFactory.getSequenceVal(self.ctx.modelVariables.SEQUENCE_DEFS.CODE_OF_NURSING_RECORD);
                    nursingRecordToSave = {
                        elderlyId: nursingRecord.elderlyId,
                        elderly_name: nursingRecord.elderly_name,
                        roomId: elderlyRoomValue.roomId,
                        bed_no: elderlyRoomValue.bed_no,
                        gen_batch_no: gen_batch_no,
                        tenantId: tenantId,
                        workItemId: workOrDrugUseItem.workItemId,
                        name: workOrDrugUseItem.name,
                        description: workOrDrugUseItem.description,
                        remark: workOrDrugUseItem.remark,
                        duration: workOrDrugUseItem.duration,
                        remind_on: [],
                        type: workOrDrugUseItem.type,
                        category: workOrDrugUseItem.work_item_category,
                        assigned_workers: []
                    };

                    var str = workOrDrugUseItem.voice_template || '';
                    if (str) {
                        str = str.replace(/\${老人姓名}/g, nursingRecord.elderly_name || '')
                            .replace(/\${项目名称}/g, workOrDrugUseItem.name || '')
                            .replace(/\${药品名称}/g, workOrDrugUseItem.name || '')
                            .replace(/\${工作描述}/g, workOrDrugUseItem.description || '')
                            .replace(/\${服用方法}/g, workOrDrugUseItem.description || '');
                    }
                    nursingRecordToSave.voice_content = str;

                    // 计算下一周期
                    var currentExecHourMinute = self.ctx.moment(nursingRecord.exec_on).format('HH:mm');
                    remind_max = workOrDrugUseItem.remind_times || 1;
                    remind_step = workOrDrugUseItem.duration / remind_max;
                    var tomorrow = self.ctx.moment().add(1, 'days');
                    if (workOrDrugUseItem.repeat_type == DIC.D0103.AS_NEEDED) {
                        //按需工作不需要提醒
                        nursingRecordToSave.exec_on = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD') + " 23:59:59");
                    } else if (workOrDrugUseItem.repeat_type == DIC.D0103.TIME_IN_DAY) {
                        exec_date_string = tomorrow.format('YYYY-MM-DD');

                        if (workOrDrugUseItem.repeat_values && workOrDrugUseItem.repeat_values.length > 0) {
                            // 每天某几个时刻执行,考虑到时间间隔比较近,因此将当天的全部生成
                            self.ctx._.each(workOrDrugUseItem.repeat_values, (o) => {
                                exec_on = self.ctx.moment(exec_date_string + ' ' + o + workOrDrugUseItem.repeat_start);

                                // 检查当前nursingRecord记录处于repeat_values中的哪一条,只生成对应的那一条
                                if(currentExecHourMinute == exec_on.format('HH:mm')) {
                                    nursingRecordToSave.exec_on = exec_on;
                                    if (workOrDrugUseItem.remind_flag) {
                                        remind_start = self.ctx.moment(exec_on);
                                        for (var remind_count = 0; remind_count < remind_max; remind_count++) {
                                            nursingRecordToSave.remind_on.push(self.ctx.moment(remind_start.add(remind_step * remind_count, 'minutes')));
                                        }
                                    }
                                }
                            });
                        } else {
                            // 明天某个时刻执行
                            exec_on = self.ctx.moment(exec_date_string + ' ' + workOrDrugUseItem.repeat_start);
                            // console.log('exec_on:', exec_on.format('YYYY-DD-MM HH:mm'));

                            // 检查当前nursingRecord记录的执行时间点和原计划中的repeat_start是否一致,一致才生成
                            if(currentExecHourMinute == exec_on.format('HH:mm')) {
                                nursingRecordToSave.exec_on = exec_on;
                                if (workOrDrugUseItem.remind_flag) {
                                    remind_start = self.ctx.moment(exec_on);
                                    for (var remind_count = 0; remind_count < remind_max; remind_count++) {
                                        nursingRecordToSave.remind_on.push(self.ctx.moment(self.ctx.moment(remind_start).add(remind_step * remind_count, 'minutes')));
                                    }
                                }
                            }
                        }
                    } else if (workOrDrugUseItem.repeat_type == DIC.D0103.DAY_IN_WEEK) {
                        if (workOrDrugUseItem.repeat_values) {
                            work_item_repeat_values = workOrDrugUseItem.repeat_values;
                            for (var weekDay = tomorrow.day(), weekMax = weekDay + 8; weekDay < weekMax; weekDay++) {
                                if (self.ctx._.find(work_item_repeat_values, (o) => {
                                        return weekDay % 7 === o % 7;
                                    })) {
                                    exec_date = self.ctx.moment(tomorrow).day(weekDay);
                                    exec_on = self.ctx.moment(exec_date.format('YYYY-MM-DD') + ' ' + workOrDrugUseItem.repeat_start);

                                    // console.log('weekDay',weekDay);
                                    // console.log("exec_date",self.ctx.moment(exec_date.format('YYYY-MM-DD') + ' ' + workItem.repeat_start).toDate());
                                    // console.log("tomorrow",tomorrow.toDate());
                                    // console.log("exec_date is after tomorrow:",self.ctx.moment(exec_date.format('YYYY-MM-DD') + ' ' + workItem.repeat_start).isAfter(tomorrow));

                                    // day 相等以后,检查当前nursingRecord记录的执行时间点和原计划中的repeat_start是否一致,一致才生成
                                    if(currentExecHourMinute == exec_on.format('HH:mm')) {
                                        nursingRecordToSave.exec_on = exec_on;
                                        if (workOrDrugUseItem.remind_flag) {
                                            remind_start = self.ctx.moment(exec_on);
                                            for (var remind_count = 0; remind_count < remind_max; remind_count++) {
                                                nursingRecordToSave.remind_on.push(self.ctx.moment(self.ctx.moment(remind_start).add(remind_step * remind_count, 'minutes')));
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    } else if (workOrDrugUseItem.repeat_type == DIC.D0103.DATE_IN_MONTH) {
                        if (workOrDrugUseItem.repeat_values) {
                            work_item_repeat_values = workOrDrugUseItem.repeat_values;
                            for (var i = 0; i < 32; i++) {
                                if (self.ctx._.find(work_item_repeat_values, (o) => {
                                        return self.ctx.moment(tomorrow).add(i, 'days').date() === o;
                                    })) {
                                    // date 相等以后,检查当前nursingRecord记录的执行时间点和原计划中的repeat_start是否一致,一致才生成
                                    exec_date = self.ctx.moment(tomorrow).add(i, 'days');
                                    exec_on = self.ctx.moment(exec_date.format('YYYY-MM-DD') + ' ' + workOrDrugUseItem.repeat_start)
                                    if(currentExecHourMinute == exec_on.format('HH:mm')) {
                                        nursingRecordToSave.exec_on = exec_on;
                                        if (workOrDrugUseItem.remind_flag) {
                                            remind_start = self.ctx.moment(exec_on);
                                            for (var remind_count = 0; remind_count < remind_max; remind_count++) {
                                                nursingRecordToSave.remind_on.push(self.ctx.moment(self.ctx.moment(remind_start).add(remind_step * remind_count, 'minutes')));
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if(!nursingRecordToSave.exec_on) {
                        warningMsg = '当前记录所属的照护计划已更改(执行时间)';
                    } else {
                        findNuringWorkerCount = 0;
                        // 查找老人对应的护工 (老人->房间+日期->排班->护工)
                        exec_start = self.ctx.moment(nursingRecordToSave.exec_on.format('YYYY-MM-DD'));
                        exec_end = self.ctx.moment(exec_start).add(1, 'days');

                        nursingWorkerScheduleItems = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_nursingSchedule'], {
                            select: 'aggr_value',
                            where: {
                                status: 1,
                                x_axis: {'$gte': exec_start, '$lt': exec_end},
                                y_axis: elderlyRoomValue.roomId,
                                tenantId: tenantId
                            }
                        });
                        if (nursingWorkerScheduleItems.length > 0) {
                            for (var j = 0, workerLen = nursingWorkerScheduleItems.length; j < workerLen; j++) {
                                nursingRecordToSave.assigned_workers.push(nursingWorkerScheduleItems[j].aggr_value);
                                findNuringWorkerCount++;
                            }
                            // console.log('nursingRecordToSave.assigned_workers:', nursingRecordToSave.assigned_workers);
                        }

                        if (findNuringWorkerCount == 0) {
                            warningMsg = '无法找到照护记录执行时间对应的护工,可能还没有排班';
                        }

                        yield self.ctx.modelFactory().model_create(self.ctx.models['psn_nursingRecord'], nursingRecordToSave);
                    }
                    return self.ctx.wrapper.res.default(warningMsg);
                } else if (!nursingRecordId && tenantId) {
                    // 生成当前机构今天的照护记录
                    tenant = yield self.ctx.modelFactory().model_read(self.ctx.models['pub_tenant'], tenantId);
                    if (!tenant || tenant.status == 0) {
                        return self.ctx.wrapper.res.error({message: '无法找到养老机构!'});
                    }

                    if (elderlyId) {
                        // 为单个老人
                        elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);
                        if (!elderly || elderly.status == 0) {
                            return self.ctx.wrapper.res.error({message: '无法找到老人!'});
                        }

                        if (!elderly.live_in_flag) {
                            return self.ctx.wrapper.res.error({message: '老人已出院或离世!'});
                        }

                        nursingPlanItems = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_nursingPlan'], {
                            select: 'elderlyId elderly_name work_items',
                            where: {
                                status: 1,
                                elderlyId: elderlyId,
                                tenantId: tenantId
                            }
                        });

                        // 查询房间号
                        elderlyMapRoom[elderlyId] = elderly.room_value;

                    } else {
                        allElderly = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_elderly'], {
                            select: 'room_value',
                            where: {
                                status: 1,
                                live_in_flag: true,
                                tenantId: tenantId
                            }
                        });

                        self.ctx._.each(allElderly, (o) => {
                            elderlyMapRoom[o._id.toString()] = o.room_value;
                        });

                        // 为所有老人
                        nursingPlanItems = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_nursingPlan'], {
                            select: 'elderlyId elderly_name work_items',
                            where: {
                                status: 1,
                                tenantId: tenantId
                            }
                        });
                    }
                    console.log('nursingPlanItems', nursingPlanItems);
                    if (nursingPlanItems.length) {
                        now = self.ctx.moment();
                        gen_batch_no = yield self.ctx.sequenceFactory.getSequenceVal(self.ctx.modelVariables.SEQUENCE_DEFS.CODE_OF_NURSING_RECORD);
                        // console.log('gen_batch_no:',gen_batch_no);
                        for (var i = 0, len = nursingPlanItems.length; i < len; i++) {
                            nursingPlanItem = nursingPlanItems[i];
                            elderlyRoomValue = elderlyMapRoom[nursingPlanItem.elderlyId];
                            nursingRecord = {
                                elderlyId: nursingPlanItem.elderlyId,
                                elderly_name: nursingPlanItem.elderly_name,
                                roomId: elderlyRoomValue.roomId,
                                bed_no: elderlyRoomValue.bed_no,
                                gen_batch_no: gen_batch_no,
                                tenantId: tenantId
                            }
                            workItems = nursingPlanItem.work_items;
                            console.log("workItems", workItems)
                            for (var j = 0, len2 = workItems.length; j < len2; j++) {
                                workOrDrugUseItem = workItems[j];
                                remind_max = workOrDrugUseItem.remind_times || 1;
                                remind_step = workOrDrugUseItem.duration / remind_max;
                                // console.log('remind_max: ', remind_max);
                                // console.log('remind_step: ', remind_step);

                                nursingRecord.workItemId = workOrDrugUseItem._id
                                nursingRecord.name = workOrDrugUseItem.name;
                                nursingRecord.description = workOrDrugUseItem.description;
                                nursingRecord.remark = workOrDrugUseItem.remark;
                                nursingRecord.duration = workOrDrugUseItem.duration;
                                nursingRecord.remind_on = [];
                                nursingRecord.type = workOrDrugUseItem.type;
                                nursingRecord.category = workOrDrugUseItem.work_item_category;

                                var str = workOrDrugUseItem.voice_template || '';
                                if (str) {
                                    str = str.replace(/\${老人姓名}/g, nursingPlanItem.elderly_name || '')
                                        .replace(/\${项目名称}/g, workOrDrugUseItem.name || '')
                                        .replace(/\${药品名称}/g, workOrDrugUseItem.name || '')
                                        .replace(/\${工作描述}/g, workOrDrugUseItem.description || '')
                                        .replace(/\${服用方法}/g, workOrDrugUseItem.description || '');
                                }

                                // console.log('voice_content', str);

                                nursingRecord.voice_content = str;

                                if (workOrDrugUseItem.repeat_type == DIC.D0103.AS_NEEDED) {
                                    //按需工作不需要提醒
                                    nursingRecord.exec_on = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD') + " 23:59:59");
                                    nursingRecordsToSave.push(self.ctx._.extend({assigned_workers: []}, nursingRecord));
                                } else if (workOrDrugUseItem.repeat_type == DIC.D0103.TIME_IN_DAY) {
                                    exec_date_string = now.format('YYYY-MM-DD');
                                    if (workOrDrugUseItem.repeat_values && workOrDrugUseItem.repeat_values.length > 0) {
                                        // 每天某几个时刻执行,考虑到时间间隔比较近,因此将当天的全部生成
                                        self.ctx._.each(workOrDrugUseItem.repeat_values, (o) => {
                                            // console.log(o);
                                            nursingRecord.remind_on = [];
                                            exec_on = self.ctx.moment(exec_date_string + ' ' + o + workOrDrugUseItem.repeat_start);
                                            if (exec_on.isAfter(now)) {
                                                // 当天没有过期的时刻
                                                nursingRecord.exec_on = exec_on;
                                                if (workOrDrugUseItem.remind_flag) {
                                                    remind_start = self.ctx.moment(exec_on);

                                                    for (var remind_count = 0; remind_count < remind_max; remind_count++) {

                                                        nursingRecord.remind_on.push(self.ctx.moment(remind_start.add(remind_step * remind_count, 'minutes')));
                                                    }
                                                }
                                                nursingRecordsToSave.push(self.ctx._.extend({assigned_workers: []}, nursingRecord));
                                            }
                                        });
                                    } else {
                                        // 每天某个时刻执行
                                        exec_on = self.ctx.moment(exec_date_string + ' ' + workOrDrugUseItem.repeat_start)
                                        if (exec_on.isBefore(now)) {
                                            // 当天已经过期,生成明天
                                            exec_on = self.ctx.moment(now).add(1, 'days').format('YYYY-MM-DD') + ' ' + workOrDrugUseItem.repeat_start;
                                        }
                                        // console.log('exec_on:', exec_on.format('YYYY-DD-MM HH:mm'));
                                        nursingRecord.exec_on = exec_on;
                                        if (workOrDrugUseItem.remind_flag) {
                                            remind_start = self.ctx.moment(exec_on);
                                            for (var remind_count = 0; remind_count < remind_max; remind_count++) {
                                                // console.log('remind_start:', remind_start.format('YYYY-DD-MM HH:mm'));
                                                // console.log('remind_count:', remind_count);
                                                // console.log('remind_step:', remind_step);
                                                nursingRecord.remind_on.push(self.ctx.moment(self.ctx.moment(remind_start).add(remind_step * remind_count, 'minutes')));
                                            }
                                        }
                                        nursingRecordsToSave.push(self.ctx._.extend({assigned_workers: []}, nursingRecord));
                                    }
                                } else if (workOrDrugUseItem.repeat_type == DIC.D0103.DAY_IN_WEEK) {
                                    if (workOrDrugUseItem.repeat_values) {
                                        work_item_repeat_values = workOrDrugUseItem.repeat_values;
                                        for (var weekDay = now.day(), weekMax = weekDay + 8; weekDay < weekMax; weekDay++) {
                                            if (self.ctx._.find(work_item_repeat_values, (o) => {
                                                    return weekDay % 7 === o % 7;
                                                })) {
                                                // day 相等以后,判断是否时是生成当天,如果是则比较时刻,时刻过期的话需要生成下一个执行点
                                                // console.log('weekDay',weekDay);
                                                exec_date = self.ctx.moment(now).day(weekDay);
                                                // console.log("exec_date",self.ctx.moment(exec_date.format('YYYY-MM-DD') + ' ' + workItem.repeat_start).toDate());
                                                // console.log("now",now.toDate());
                                                // console.log("exec_date is after now:",self.ctx.moment(exec_date.format('YYYY-MM-DD') + ' ' + workItem.repeat_start).isAfter(now));
                                                if (self.ctx.moment(exec_date.format('YYYY-MM-DD') + ' ' + workOrDrugUseItem.repeat_start).isAfter(now)) {
                                                    exec_on = self.ctx.moment(exec_date.format('YYYY-MM-DD') + ' ' + workOrDrugUseItem.repeat_start)
                                                    nursingRecord.exec_on = exec_on;
                                                    if (workOrDrugUseItem.remind_flag) {
                                                        remind_start = self.ctx.moment(exec_on);
                                                        for (var remind_count = 0; remind_count < remind_max; remind_count++) {

                                                            nursingRecord.remind_on.push(self.ctx.moment(self.ctx.moment(remind_start).add(remind_step * remind_count, 'minutes')));
                                                        }
                                                    }
                                                    nursingRecordsToSave.push(self.ctx._.extend({assigned_workers: []}, nursingRecord));
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                } else if (workOrDrugUseItem.repeat_type == DIC.D0103.DATE_IN_MONTH) {
                                    if (workOrDrugUseItem.repeat_values) {
                                        work_item_repeat_values = workOrDrugUseItem.repeat_values;
                                        for (var i = 0; i < 32; i++) {
                                            if (self.ctx._.find(work_item_repeat_values, (o) => {
                                                    return self.ctx.moment(now).add(i, 'days').date() === o;
                                                })) {
                                                // date 相等以后,判断是否时是生成当天,如果是则比较时刻,时刻过期的话需要生成下一个执行点
                                                exec_date = self.ctx.moment(now).add(i, 'days');
                                                if (self.ctx.moment(exec_date.format('YYYY-MM-DD') + ' ' + workOrDrugUseItem.repeat_start).isAfter(now)) {
                                                    exec_on = self.ctx.moment(exec_date.format('YYYY-MM-DD') + ' ' + workOrDrugUseItem.repeat_start)
                                                    nursingRecord.exec_on = exec_on;
                                                    if (workOrDrugUseItem.remind_flag) {
                                                        remind_start = self.ctx.moment(exec_on);
                                                        for (var remind_count = 0; remind_count < remind_max; remind_count++) {
                                                            nursingRecord.remind_on.push(self.ctx.moment(self.ctx.moment(remind_start).add(remind_step * remind_count, 'minutes')));
                                                        }
                                                    }
                                                    nursingRecordsToSave.push(self.ctx._.extend({assigned_workers: []}, nursingRecord));
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // console.log('nursingRecordsToSave:', nursingRecordsToSave);
                        for (var i = 0, findNuringWorkerCount = 0, len = nursingRecordsToSave.length; i < len; i++) {
                            nursingRecordToSave = nursingRecordsToSave[i];
                            elderlyRoomValue = elderlyMapRoom[nursingRecordToSave.elderlyId];
                            // 查找老人对应的护工 (老人->房间+日期->排班->护工)
                            exec_start = self.ctx.moment(nursingRecordToSave.exec_on.format('YYYY-MM-DD'));
                            exec_end = self.ctx.moment(exec_start).add(1, 'days');
                            // console.log('exec_start:', exec_start.format('YYYY-MM-DD HH:mm'));
                            // console.log('exec_end:', exec_end.format('YYYY-MM-DD HH:mm'));
                            // console.log('elderlyRoomValue:', elderlyRoomValue);
                            // console.log('nursingRecordToSave.NAME:', nursingRecordToSave.name,elderlyRoomValue.roomId, exec_start.format('YYYY-MM-DD HH:mm:ss'), exec_end.format('YYYY-MM-DD HH:mm:ss'));
                            nursingWorkerScheduleItems = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_nursingSchedule'], {
                                select: 'aggr_value',
                                where: {
                                    status: 1,
                                    x_axis: {'$gte': exec_start, '$lt': exec_end},
                                    y_axis: elderlyRoomValue.roomId,
                                    tenantId: tenantId
                                }
                            });
                            if (nursingWorkerScheduleItems.length > 0) {
                                for (var j = 0, workerLen = nursingWorkerScheduleItems.length; j < workerLen; j++) {

                                    nursingRecordToSave.assigned_workers.push(nursingWorkerScheduleItems[j].aggr_value);
                                    findNuringWorkerCount++;
                                }
                                // console.log('nursingRecordToSave.assigned_workers:', nursingRecordToSave.assigned_workers);
                            }
                        }
                        if (findNuringWorkerCount == 0) {
                            warningMsg = '无法找到照护记录执行时间对应的护工,可能还没有排班';
                        } else if (findNuringWorkerCount < len) {
                            warningMsg = '部分照护记录无法找到执行时间对应的护工,可能那些时间段还没有排班';
                        }

                        // 最终需要先删除当前时间之后的所有记录,并插入重新计算以后的照护记录
                        if (nursingRecordsToSave.length > 0) {
                            allEdlerlyIds = self.ctx._.allKeys(elderlyMapRoom);
                            yield self.ctx.modelFactory().model_bulkInsert(self.ctx.models['psn_nursingRecord'], {
                                removeWhere: {
                                    tenantId: tenantId,
                                    elderlyId: {'$in': allEdlerlyIds},
                                    exec_on: {'$gt': now},

                                },
                                rows: nursingRecordsToSave
                            });
                        }
                    }
                    // console.log("warningMsg",warningMsg);
                    return self.ctx.wrapper.res.default(warningMsg);
                } else {
                    return self.ctx.wrapper.res.error({message: '_generate:无效的参数!'});
                }
            } catch (e) {
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e);
            }
        }).catch(self.ctx.coOnError);
    }
};