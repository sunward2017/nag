/**
 * Created by hcl on 17-5-17.
 * 从公司服务器用tcp 通道读取
 */
var co = require('co');
var net = require('net');
var bedMonitorListenConfigs = require('../pre-defined/bed-monitor-listen-config.json');
// var DIC = require('../pre-defined/dictionary-constants.json');
// var socketServerEvents = require('../pre-defined/socket-server-events.json');

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

        var listenConfig = ctx.conf.isProduction ? bedMonitorListenConfigs.production : bedMonitorListenConfigs.dev;
        console.log('listenConfig:', listenConfig);

        this.connectTo(listenConfig);

        return this;
    },
    connectTo: function (listenConfig) {
        var self = this;

        try {

            if(self.socket) {
                // 完全关闭连接
                self.socket.destroy();
            }

            self.socket = new net.Socket();

            self.socket.connect(listenConfig.port, listenConfig.ip, function() {
                self.ctx.clog.log(self.logger, 'CONNECTED TO: ' + listenConfig.ip + ':' + listenConfig.port);
                // 建立连接后立即向服务器发送数据，服务器将收到这些数据
                self.socket.write('333333');
            });
            //
            // 为客户端添加“data”事件处理函数
            // data是服务器发回的数据
            self.socket.on('data', function(data) {
                // self.ctx.clog.log(self.logger, 'DATA: ' + data);
                console.log('DATA: ' + data)
                self.client.end('received:' + data);
            });

            // 为客户端添加“close”事件处理函数
            self.socket.on('close', function() {
                self.ctx.clog.log(self.logger, 'Connection closed 重连');
                self.connectTo(listenConfig);
            });

            self.socket.on('error', function(err) {
                self.ctx.clog.log(self.logger, 'socket err:', err);
            });
        }
        catch (e) {
            console.log(e);
            self.logger.error(e);
        }

        // return co(function* () {
        //
        // }).catch(self.ctx.coOnError);
    }
};
