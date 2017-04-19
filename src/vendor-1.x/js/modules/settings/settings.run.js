(function() {
    'use strict';

    angular
        .module('app.settings')
        .run(settingsRun);

    settingsRun.$inject = ['$rootScope', '$localStorage','SETTING_KEYS'];

    function settingsRun($rootScope, $localStorage,SETTING_KEYS) {

        // Global Settings
        // -----------------------------------
        $rootScope.app = {
            name: '梧斯源-养老业务集成平台',
            description: '新一代养老业务集成平台平台',
            year: ((new Date()).getFullYear()),
            layout: {
                isFixed: false,
                isCollapsed: false,
                isBoxed: false,
                isRTL: false,
                horizontal: false,
                isFloat: false,
                asideHover: false,
                theme: null
            },
            isFullScreen: false,
            useFullLayout: false,
            hiddenFooter: false,
            offsidebarOpen: false,
            asideToggled: true,
            viewAnimation: 'ng-fadeInUp',
            subsystem: {
                merchant_webstore: {currentSubsystemSref: SETTING_KEYS.SREF_MERCHANT_WEBSTORE},
                pension_agency: { currentSubsystemSref: SETTING_KEYS.SREF_PENSION_AGENCY},
                health_center: { currentSubsystemSref: SETTING_KEYS.SREF_HEALTH_CENTER},
                organization_travel: {currentSubsystemSref: SETTING_KEYS.SREF_ORGANIZATION_TRAVEL},
                manage_center: {currentSubsystemSref: SETTING_KEYS.SREF_MANAGE_CENTER}
            }
        };

        // Setup the layout mode
        $rootScope.app.layout.horizontal = ( $rootScope.$stateParams.layout === 'app-h');

        // Restore layout settings [*** UNCOMMENT TO ENABLE ***]
        // if( angular.isDefined($localStorage.layout) )
        //   $rootScope.app.layout = $localStorage.layout;
        // else
        //   $localStorage.layout = $rootScope.app.layout;
        //
        // $rootScope.$watch('app.layout', function () {
        //   $localStorage.layout = $rootScope.app.layout;
        // }, true);

        // Close submenu when sidebar change from collapsed to normal
        $rootScope.$watch('app.layout.isCollapsed', function (newValue) {
            if (newValue === false)
                $rootScope.$broadcast('closeSidebarMenu');
        });

        //初始化标题
        $rootScope.currTitle = $rootScope.app.name + ' - ' + ($rootScope.currTitle || $rootScope.app.description);
    }

})();
