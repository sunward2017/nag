/**
 * Created by hcl on 17-5-11.
 */
module.exports = {
    init: function (option) {
        var self = this;
        this.file = __filename;
        this.filename = this.file.substr(this.file.lastIndexOf('/') + 1);
        this.module_name = this.filename.substr(0, this.filename.lastIndexOf('.'));
        this.service_url_prefix = '/services/' + this.module_name.split('_').join('/');
        this.log_name = 'svc_' + this.filename;
        option = option || {};

        this.logger = require('log4js').getLogger(this.log_name);

        if (!this.logger) {
            console.error('logger not loaded in ' + this.file);
        }
        else {
            this.logger.info(this.file + " loaded!");
        }

        this.actions = [
            {
                method: 'bedMonitor$fetch',
                verb: 'get',
                url: this.service_url_prefix + "/bedMonitor$fetch",
                handler: function (app, options) {
                    return function *(next) {
                        try {
                            var rows = yield app.modelFactory().model_query(app.models['pub_bedMonitor'], {
                                select: 'mac -_id',
                                where: {
                                    status: 1
                                }
                            });
                            this.body = app.wrapper.res.rows(rows);
                        } catch (e) {
                            self.logger.error(e.message);
                            this.body = app.wrapper.res.error(e);
                        }
                        yield next;
                    };
                }
            }
        ];
        return this;
    }
}.init();
