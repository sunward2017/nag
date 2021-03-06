/**
 * Created by zppro on 17-3-30.
 */
var co = require('co');
var socketClientEvents = require('../pre-defined/socket-client-events.json');
var socketServerEvents = require('../pre-defined/socket-server-events.json');
var DIC = require('../pre-defined/dictionary-constants.json');
module.exports = {
    init: function (ctx, ioSocket) {
        console.log('init psn_bed_monitor_status socketProvider... ');
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
        this.socketClientsOfPSN$BedMonitorStatus = {};
        this.nspOfPSN$bed_monitor_status = this.ioSocket.of('/psn$bed_monitor_status');
        this.nspOfPSN$bed_monitor_status.on('connection', this.onConnection.bind(this));

        console.log(this.filename + ' ready... ');
 
        return this;
    },
    sendToClient: function (eventName, eventData) {
        console.log('eventName: ', eventName);
        console.log('eventData: ', eventData);
        if (eventData.bedMonitorName) {
            console.log('sendToClient psn$bed_monitor_status to bedMonitor : ' + 'bedMonitorStatus_' + eventData.bedMonitorName);
            this.nspOfPSN$bed_monitor_status.to('bedMonitorStatus_' + eventData.bedMonitorName).emit(eventName, eventData);
        } else {
            console.log('sendToClient psn$bed_monitor_status to whole channel');
            this.nspOfPSN$bed_monitor_status.emit(eventName, eventData);
        }
    },
    onConnection: function (socket) {
        var self = this;
        console.log('nsp psn$bed_monitor_status connection: ' + socket.id);
        self.socketClientsOfPSN$BedMonitorStatus[socket.id] = socket;
        socket.on('disconnect', function() {
            console.log('nsp psn$bed_monitor_status disconnect: ' + socket.id);
            delete self.socketClientsOfPSN$BedMonitorStatus[socket.id];
        });
        socket.on(socketClientEvents.PSN.BED_MONITOR_STATUS.SUBSCRIBE, function(data) {
            return co(function *() {
                try {
                    console.log(socketClientEvents.PSN.BED_MONITOR_STATUS.SUBSCRIBE + ':' + socket.id + '  => data  ' +  JSON.stringify(data));
                    var bedMonitorNames = data.bedMonitorNames, tenantId = data.tenantId, bedMonitorName, bedMonitorStatus, bedStatus;
                    if (bedMonitorNames) {
                        console.log('bedMonitorNames ', bedMonitorNames);
                        for (var i = 0, len = bedMonitorNames.length; i < len; i++) {
                            socket.join('bedMonitorStatus_' + bedMonitorNames[i]);
                        }
                        var bedMonitors = yield self.ctx.modelFactory().model_query(self.ctx.models['pub_bedMonitor'], {
                            select: 'name device_status',
                            where: {
                                status: 1,
                                name: { '$in': bedMonitorNames},
                                tenantId: tenantId
                            }
                        });
                        console.log('bedMonitors ', bedMonitors);
                        for (var i = 0, len = bedMonitors.length; i < len; i++) {
                            bedMonitorName = bedMonitors[i].name;
                            bedMonitorStatus = bedMonitors[i].device_status;
                            if (bedMonitorStatus === DIC.D3009.OffLine) {
                                // self.sendToClient(socketServerEvents.PSN.BED_MONITOR_STATUS.OFF_LINE, {bedMonitorName: bedMonitorName});
                                socket.emit(socketServerEvents.PSN.BED_MONITOR_STATUS.OFF_LINE, {bedMonitorName: bedMonitorName});
                            } else if (bedMonitorStatus === DIC.D3009.OnLine) {
                                // self.sendToClient(socketServerEvents.PSN.BED_MONITOR_STATUS.ON_LINE, {bedMonitorName: bedMonitorName});
                                bedStatus = self.ctx.cache.get(bedMonitorName);
                                console.log('bedStatus:', bedStatus);
                                if (bedStatus) {
                                    if (bedStatus.alarmId) {
                                        socket.emit(socketServerEvents.PSN.BED_MONITOR_STATUS.ALARM_LEAVE_TIMEOUT, {
                                            bedMonitorName: bedMonitorName,
                                            reason: DIC.D3016.LEAVE_BED_TIMEOUT,
                                            alarmId: bedStatus.alarmId
                                        });
                                    } else {
                                        if (bedStatus.isBed) {
                                            socket.emit(socketServerEvents.PSN.BED_MONITOR_STATUS.ON_LINE, {bedMonitorName: bedMonitorName});
                                        } else {
                                            socket.emit(socketServerEvents.PSN.BED_MONITOR_STATUS.LEAVE, {bedMonitorName: bedMonitorName});
                                        }
                                    }
                                } else {
                                    socket.emit(socketServerEvents.PSN.BED_MONITOR_STATUS.ON_LINE, {bedMonitorName: bedMonitorName});
                                }
                            }
                        }
                    }
                    console.log('PSN.BED_MONITOR_STATUS.SUBSCRIBE finished')
                }
                catch (e) {
                    console.log(e);
                    self.logger.error(e.message);
                }
            }).catch(self.ctx.coOnError);
        });
    }
};