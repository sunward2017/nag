/**
 * Created by zppro on 17-06-07.
 */
var co = require('co');

module.exports = {
    init: function (ctx) {
        console.log('init sleep... ');
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
    clearDataWithElderly: function (elderlyId) {
        var self = this;
        return co(function*() {
            try {
                var elderly = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_elderly'], elderlyId);

                if (!elderly || elderly.status == 0) {
                    return self.ctx.wrapper.res.error({ message: '无法找到对应的老人资料' });
                }

                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_assessment'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_bloodPressure'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_drugInOutStock'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_drugStock'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_drugUseItem'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_elderlySpecificSpotChangeLog'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_enter'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_exit'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_leave'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_nursingPlan'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_nursingRecord'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_nursingRecordHistory'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_reception'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_recharge'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_roomOccupancyChangeHistory'], {elderlyId: elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_roomStatus'], {'occupied.elderlyId': elderly._id, tenantId: elderly.tenantId});
                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_workItem'], {elderlyId: elderly._id, tenantId: elderly.tenantId});

                yield self.ctx.modelFactory().model_bulkDelete(self.ctx.models['psn_elderly'], {_id: elderly._id});

                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    }
};