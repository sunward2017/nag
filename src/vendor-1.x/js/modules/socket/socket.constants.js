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
                BED_MONITOR_STATUS: {
                    $SOCKET_URL: '/psn$bed_monitor_status',
                    S2C: {
                        ON_LINE: 'psn$bed_monitor_status$on_line',
                        OFF_LINE: 'psn$bed_monitor_status$off_line',
                        LEAVE: 'psn$bed_monitor_status$leave',
                        COME: 'psn$bed_monitor_status$come',
                        NO_MAN_IN_BED: 'psn$bed_monitor_status$no_man_in_bed',
                        ALARM_LEAVE_TIMEOUT: 'psn$bed_monitor_status$alarm_leave_timeout'
                    },
                    C2S: {
                        SUBSCRIBE: 'psn$bed_monitor_status$subscribe'
                    }
                }
            }
        })
    ;
})();
