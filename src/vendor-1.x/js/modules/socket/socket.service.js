/**
 * Created by zppro on 17-3-31.
 */
(function() {
    'use strict';

    angular.module('app.socket')
        .service('SocketManager', SocketManager);

    SocketManager.$inject = ['$location', 'SOCKET_EVENTS'];

    function SocketManager($location, SOCKET_EVENTS) {
        return {
            socketChannels: {},
            registerChannel: function (channelName) {
                if (!this.socketChannels[channelName]) {
                    console.log('registerChannel: ', channelName);
                    var port = $location.port(), channel;
                    var socketUrl = ($location.host() + port === 80 ? '' : ':' + port) + channelName;
                    if (socketUrl.toLowerCase().startsWith('https')) {
                        channel = io(socketUrl, {secure: true})
                    } else {
                        channel = io(socketUrl)
                    }
                    this.socketChannels[channelName] = channel;
                }

                return this.getChannel(channelName);
            },
            getChannel: function (channelName) {
                return this.socketChannels[channelName];
            },
            unregisterChannel: function (channelName) {
                if (this.socketChannels[channelName]) {
                    this.socketChannels[channelName].close();
                    var self = this;
                    setTimeout(function(){
                        console.log('unregisterChannel set channel null');
                        self.socketChannels[channelName] = null;
                    }, 500);
                }
            }
        };
    }

})();