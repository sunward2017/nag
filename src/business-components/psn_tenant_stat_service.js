/**
 * TenantStatManger Created by zppro on 17-2-15.
 * Target:租客统计管理 (移植自fsrok)
 */

var log4js = require('log4js');
var co = require('co');
var statHelper = require('rfcore').factory('statHelper');
var DIC = require('../pre-defined/dictionary-constants.json');

module.exports = {
    init: function (ctx) {
        console.log('init psn_tenant_stat_service... ');
        this.ctx = ctx;
        return this;
    },
    getAmountOfElderlyLiveIn: function (tenant, logger) {
        var self = this;
        return co(function *() {

            var elderly_totals = yield self.ctx.modelFactory().model_totals(self.ctx.models['psn_elderly'], {
                tenantId: tenant._id,
                status: 1,
                live_in_flag: true
            });

            return elderly_totals.length;
        });
    },
    getAmountOfElderlyLiveInOnCurrentMonth: function (tenant, logger) {
        var self = this;
        return co(function *() {

            var begin = self.ctx.moment(self.ctx.moment().startOf('month').format('YYYY-MM-DD')+" 00:00:00");
            var end = self.ctx.moment(self.ctx.moment().endOf('month').format('YYYY-MM-DD')+" 23:59:59");

            var elderly_totals = yield self.ctx.modelFactory().model_totals(self.ctx.models['psn_elderly'], {
                tenantId: tenant._id,
                status: 1,
                live_in_flag: true,
                enter_on: {"$gte": begin, "$lte": end}
            });

            return elderly_totals.length;
        });
    },
    getAmountOfElderlyLiveInManTime: function (tenant, logger) {
        var self = this;
        return co(function *() {

            var enter_totals = yield self.ctx.modelFactory().model_totals(self.ctx.models['psn_enter'], {
                tenantId: tenant._id,
                status: 1
            });

            return enter_totals.length;
        });
    },
    getBedInfo: function (tenant, logger) {
        var self = this;
        return co(function *() {

            var arrTotals = yield self.ctx.modelFactory().model_aggregate(self.ctx.models['psn_room'], [
                {
                    $match: {
                        stop_flag: false,
                        tenantId: tenant._id,
                        status: 1
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: {$sum: '$capacity'}
                    }
                },
                {
                    $project: {
                        count: '$count',
                        _id: 0
                    }
                }
            ]);

            var totals = 0;
            if (arrTotals.length === 1) {
                totals = arrTotals[0].count
            }

            var arrLiveIns = yield  self.ctx.modelFactory().model_totals(self.ctx.models['psn_roomOccupancyChangeHistory'], {
                tenantId: tenant._id,
                in_flag: true,
                check_out_time: {$exists: false}
            });
            var liveins = arrLiveIns.length;

            return {
                totals: totals,
                liveins: liveins,
                frees: totals - liveins,
                vacancy_rate: (100 * (totals - liveins) / (totals || 1)).toFixed(1)
            };
        });
    },
    getAmountOfLeaveBedAlarmToday: function (tenant, logger) {
        var self = this;
        return co(function *() {
            var begin = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD'));
            var end = self.ctx.moment(begin.add(1, 'days'));
            var totals = yield self.ctx.modelFactory().model_totals(self.ctx.models['pub_alarm'], {
                tenantId: tenant._id,
                status: 1,
                subject: 'pub_bedMonitor',
                check_in_time: {"$gte": begin, "$lt": end}
            });

            return totals.length;
        });
    },
    getAmountOfNursingRecordUnusualToday: function (tenant, logger) {
        var self = this;
        return co(function *() {
            var begin = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD'));
            var end = self.ctx.moment(begin).add(1, 'days');

            var totals = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_nursingRecord'], {
                select: 'exec_on duration',
                where: {
                    tenantId: tenant._id,
                    type: DIC.D3017.NURSING_ITEM,
                    exec_on: {"$gte": begin, "$lt": end},
                    confirmed_flag: false
                }
            });

            return self.ctx._.filter(totals, (o)=> {
                if (o.expire_on_ts) {
                    return o.expire_on_ts.isBefore();
                } else {
                    return false;
                }
            }).length;
        });
    },
    getAmountOfNursingRecordUsualToday: function (tenant, logger) {
        var self = this;
        return co(function *() {
            var begin = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD'));
            var end = self.ctx.moment(begin).add(1, 'days');
            var totals = yield self.ctx.modelFactory().model_totals(self.ctx.models['psn_nursingRecord'], {
                tenantId: tenant._id,
                exec_on: {"$gte": begin.toDate(), "$lt": end.toDate()},
                confirmed_flag: true
            });

            return totals.length;
        });
    },
    getAmountOfNursingWorker: function (tenant, logger) {
        var self = this;
        return co(function *() {
            var totals = yield self.ctx.modelFactory().model_totals(self.ctx.models['psn_nursingWorker'], {
                tenantId: tenant._id,
                status: 1,
                stop_flag: false
            });

            return totals.length;
        });
    },
    getAmountOfBedMonitor: function (tenant, logger) {
        var self = this;
        return co(function *() {
            var totals = yield self.ctx.modelFactory().model_totals(self.ctx.models['pub_bedMonitor'], {
                tenantId: tenant._id,
                status: 1,
                stop_flag: false
            });

            return totals.length;
        });
    },
    getAmountOfRobot: function (tenant, logger) {
        var self = this;
        return co(function *() {
            var totals = yield self.ctx.modelFactory().model_totals(self.ctx.models['pub_robot'], {
                tenantId: tenant._id,
                status: 1,
                stop_flag: false
            });

            return totals.length;
        });
    }
};