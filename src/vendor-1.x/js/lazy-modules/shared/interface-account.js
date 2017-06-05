/**
 * dashboard Created by zppro on 17-6-5.
 * Target:第三方接口账号管理
 */
(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('Shared_interfaceAccountIndexController', Shared_interfaceAccountIndexController)
        ;

    Shared_interfaceAccountIndexController.$inject = ['$scope', 'vmh', 'instanceVM'];

    function Shared_interfaceAccountIndexController($scope, vmh, vm) {
        $scope.vm = vm;

        init();


        function init() {

            vm.init();

        }

    }

})();