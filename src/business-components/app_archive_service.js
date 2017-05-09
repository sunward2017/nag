/**
 * Created by zppro on 17-5-9.
 */
var co = require('co');
var DIC = require('../pre-defined/dictionary-constants.json');
var socketServerEvents = require('../pre-defined/socket-server-events.json');

module.exports = {
    init: function (ctx) {
        console.log('init app archive service... ');
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
    archivePSN$NursingRecord: function () {
        var self = this;
        return co(function*() {
            try {

                var today = self.ctx.moment(self.ctx.moment().format('YYYY-MM-DD') + " 00:00:00");
                
                var rows = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_nursingRecord'], {
                    where: {
                        exec_on: { '$lte': today.toDate()}
                    }
                });
                
                console.log('archivePSN$NursingRecord:', rows);
 
                yield self.ctx.modelFactory().model_bulkInsert(self.ctx.models['psn_nursingRecordHistory'], {
                    rows: rows
                });

                yield self.ctx.modelFactory().model_remove(self.ctx.models['psn_nursingRecord'], {
                    exec_on: { '$lte': today.toDate()}
                });
                
                return true;
            } catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    }
};