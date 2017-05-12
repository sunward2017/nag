(function() {
    'use strict';
    angular
        .module('app.socket')
        .constant('SOCKET_EVENTS', {
            SHARED: {
                CONNECT: 'connect',
                DISCONNECT: 'disconnect'
            },
            PSN: {
                BED_MONITOR: {
                    $SOCKET_URL: '/psn$bed_monitor',
                    S2C: {
                        ON_LINE: 'psn$bed_monitor$on_line',
                        OFF_LINE: 'psn$bed_monitor$off_line',
                        LEAVE: 'psn$bed_monitor$leave',
                        COME: 'psn$bed_monitor$come',
                        NO_MAN_IN_BED: 'psn$bed_monitor$no_man_in_bed',
                        ALARM_LEAVE_TIMEOUT: 'psn$bed_monitor$alarm_leave_timeout'
                    },
                    C2S: {
                        SUBSCRIBE: 'psn$bed_monitor$subscribe'
                    }
                }
            }
        })
    ;
})();
