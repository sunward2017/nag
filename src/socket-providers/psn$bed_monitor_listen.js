/**
 * Created by zppro on 17-3-30.
 */
var co = require('co');
var socketClientEvents = require('../pre-defined/socket-client-events.json');
var socketServerEvents = require('../pre-defined/socket-server-events.json');
var DIC = require('../pre-defined/dictionary-constants.json');
module.exports = {
    init: function (ctx, ioSocket) {
        console.log('init psn_bed_monitor_listen socketProvider... ');
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
        this.ioSocket = ioSocket;

        // add namespace
        this.socketClientsOfPSN$BedMonitorListen = {};
        this.nspOfPSN$bed_monitor_listen = this.ioSocket.of('/psn$bed_monitor_listen');
        this.nspOfPSN$bed_monitor_listen.on('connection', this.onConnection.bind(this));

        console.log(this.filename + ' ready... ');
 
        return this;
    },
    sendToClient: function (eventName, eventData) {
        eventData.ts = this.ctx.moment().unix();
        console.log('eventName: ', eventName);
        console.log('eventData: ', eventData);
        if (eventData.bedMonitorMac) {
            console.log('sendToClient psn$bed_monitor_listen to bedMonitorListen : ' + 'bedMonitorListen_' + eventData.bedMonitorMac);
            this.nspOfPSN$bed_monitor_listen.to('bedMonitorListen_' + eventData.bedMonitorMac).emit(eventName, eventData);
        } else {
            console.log('sendToClient psn$bed_monitor_listen to whole channel');
            this.nspOfPSN$bed_monitor_listen.emit(eventName, eventData);
        }
    },
    onConnection: function (socket) {
        var self = this;
        console.log('nsp psn$bed_monitor_listen connection: ' + socket.id);
        self.socketClientsOfPSN$BedMonitorListen[socket.id] = socket;
        socket.on('disconnect', function() {
            console.log('nsp psn$bed_monitor_listen disconnect: ' + socket.id);
            delete self.socketClientsOfPSN$BedMonitorListen[socket.id];
        });
        socket.on(socketClientEvents.PSN.BED_MONITOR_LISTEN.SUBSCRIBE, function(data) {
            return co(function *() {
                try {
                    console.log(socketClientEvents.PSN.BED_MONITOR_LISTEN.SUBSCRIBE + ':' + socket.id + '  => data  ' +  JSON.stringify(data));
                    var bedMonitor = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_bedMonitor'], {
                        select: 'mac',
                        where: {
                            status: 1,
                            name: data.bedMonitorName,
                            tenantId: data.tenantId
                        }
                    });
                    if(bedMonitor) {
                        var bedMonitorMac = bedMonitor.mac;
                        if (bedMonitorMac) {
                            bedMonitorMac = bedMonitorMac.toUpperCase();
                            console.log('join bedMonitorListen_', bedMonitorMac);
                            socket.join('bedMonitorListen_' + bedMonitorMac);
                            console.log('PSN.BED_MONITOR_LISTEN.SUBSCRIBE finished')
                        } else {
                            console.log('PSN.BED_MONITOR_LISTEN.SUBSCRIBE not finished for no config mac')
                        }
                    } else {
                        console.log('PSN.BED_MONITOR_LISTEN.SUBSCRIBE not finished for invalid bedMonitorName')
                    }
                }
                catch (e) {
                    console.log(e);
                    self.logger.error(e.message);
                }
            }).catch(self.ctx.coOnError);
        });
        socket.on(socketClientEvents.PSN.BED_MONITOR_LISTEN.UNSUBSCRIBE, function(data) {
            return co(function *() {
                try {
                    console.log(socketClientEvents.PSN.BED_MONITOR_LISTEN.UNSUBSCRIBE + ':' + socket.id + '  => data  ' +  JSON.stringify(data));
                    var bedMonitor = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_bedMonitor'], {
                        select: 'mac',
                        where: {
                            status: 1,
                            name: data.bedMonitorName,
                            tenantId: data.tenantId
                        }
                    });
                    if(bedMonitor) {
                        var bedMonitorMac = bedMonitor.mac;
                        if (bedMonitorMac) {
                            bedMonitorMac = bedMonitorMac.toUpperCase();
                            console.log('leave bedMonitorListen_', bedMonitorMac);
                            socket.leave('bedMonitorListen_' + bedMonitorMac);
                            console.log('PSN.BED_MONITOR_LISTEN.UNSUBSCRIBE finished')
                        } else {
                            console.log('PSN.BED_MONITOR_LISTEN.UNSUBSCRIBE not finished for no config mac')
                        }
                    } else {
                        console.log('PSN.BED_MONITOR_LISTEN.UNSUBSCRIBE not finished for invalid bedMonitorName')
                    }
                }
                catch (e) {
                    console.log(e);
                    self.logger.error(e.message);
                }
            }).catch(self.ctx.coOnError);
        });
    }
};