/**
 * Created by hcl on 17-5-17.
 * 从公司服务器用tcp 通道读取
 */
var co = require('co');
var net = require('net');
var bedMonitorListenConfigs = require('../pre-defined/bed-monitor-listen-config.json');
// var DIC = require('../pre-defined/dictionary-constants.json');
var socketServerEvents = require('../pre-defined/socket-server-events.json');

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

        // this.connectTo(listenConfig);
        this.startListen(listenConfig); //作为server监听

        this.white_list_regs = ctx._.map(listenConfig.white_list, (o)=>{
            var str = ctx._.map(o.split('.'), (o2)=>{
                return o2 == '*' ? '(\\d{1,2}|1\\d\\d|2[0-4]\\d|25[0-5])': o2;
            }).join('\\.');
            str = '^' + str + '$';
            return new RegExp(str)
        });

        // console.log(this.white_list_regs);

        // console.log('isInWhiteList:', this.isInWhiteList('192.168.10.194'));

        // this.bedMonitorMacToName = {}; //mac作键 tenantId+name做值

        return this;
    },
    updateBedMonitors: function() {
        "use strict";

    },
    isInWhiteList: function (ip) {
        var self = this;
        return !!this.ctx._.find(this.white_list_regs, (re)=> {
            // console.log('ip:',ip, re.test(ip));
            self.ctx.clog.log(self.logger, 'ip: ', ip, re.test(ip));
            return re.test(ip);
        });
    },
    parseData: function (data) {
        if (!data) return;
        var channelName = 'psn$bed_monitor_listen', arr = data.split('^');
        var mac = arr[1].toUpperCase(), raw_values = JSON.parse(arr[2]);
        this.ctx.socket_service.sendToChannel(channelName, socketServerEvents.PSN.BED_MONITOR_LISTEN.WAVE_DATA, {
            bedMonitorMac: mac,
            values: raw_values
        });
    },
    startListen: function (listenConfig) {
        var self = this;
        // tcp服务端
        var server = net.createServer(function(socket){
            self.ctx.clog.log(self.logger, '服务端：收到来自客户端的请求', socket.remoteAddress);
            if (!self.isInWhiteList(socket.remoteAddress)) {
                self.ctx.clog.log(self.logger, '服务端：不在白名单,拒绝', socket.remoteAddress);
                socket.end()
            }

            socket.on('data', function(buffer){
                self.ctx.clog.log(self.logger, '服务端：收到客户端数据，内容为{'+ buffer +'}');
                self.parseData(buffer.toString());
                // 给客户端返回数据
                // socket.write('你好，我是服务端');
            });

            socket.on('close', function(){
                self.ctx.clog.log(self.logger, '服务端：客户端连接断开');
            });

        }).listen(listenConfig.port, listenConfig.ip, function(){
            self.ctx.clog.log(self.logger, '服务端：开始监听来自客户端的请求');
        });

        server.on('error', function(error){
            self.ctx.clog.log(self.logger, 'error事件：服务端异常：', error);
        });

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
                self.socket.write('6666666666');
                console.log('socket', self.socket);

                // 为客户端添加“data”事件处理函数
                // data是服务器发回的数据
                self.socket.on('data', function(data) {
                    // self.ctx.clog.log(self.logger, 'DATA: ' + data);
                    console.log('DATA: ', data)
                    // self.client.end('received:' + data);
                });

                // 为客户端添加“close”事件处理函数
                self.socket.on('close', function() {
                    setTimeout(()=>{
                        self.ctx.clog.log(self.logger, 'Connection closed 重连');
                        self.connectTo(listenConfig);
                    }, 30000);

                });

                self.socket.on('error', function(err) {
                    self.ctx.clog.log(self.logger, 'socket err:', err);
                });
            });
            //

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
