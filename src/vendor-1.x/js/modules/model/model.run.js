/**
 * Created by zppro on 16-3-14.
 */
(function() {
  'use strict';

  angular
    .module('app.model')
    .run(modelRun)
  ;
  modelRun.$inject = ['modelNode'];
  function modelRun(modelNode) {

    // *子系统共享*
    modelNode.factory('pub-wxaConfig');

    //web商城
    modelNode.factory('mws-spu');
    modelNode.factory('mws-order');
    modelNode.factory('mws-afterSale');
    modelNode.factory('mws-channelUnit');
    modelNode.factory('mws-wxAppConfig');

    //养老机构
    modelNode.factory('psn-elderly');
    modelNode.factory('psn-enter');
    modelNode.factory('psn-exit');
    modelNode.factory('psn-reception');
    modelNode.factory('psn-leave');
    modelNode.factory('psn-assessment');
    modelNode.factory('psn-nursingPlan');
    modelNode.factory('psn-nursingSchedule');
    modelNode.factory('psn-nursingScheduleTemplate');
    modelNode.factory('psn-nursingWorkerSchedule');
    modelNode.factory('psn-nursingWorkerScheduleTemplate');
    modelNode.factory('psn-nursingGroup');
    modelNode.factory('psn-recharge');
    modelNode.factory('psn-nursingRecord');
    modelNode.factory('psn-doctorNurseSchedule');
    modelNode.factory('psn-doctorNurseScheduleTemplate');
    modelNode.factory('psn-drugUseItem');
    modelNode.factory('psn-drugUseTemplate');
    modelNode.factory('psn-drugDirectory');
    modelNode.factory('psn-drugStock');
    modelNode.factory('psn-drugInOutStock');
    modelNode.factory('psn-doctor');
    modelNode.factory('psn-nurse');
    modelNode.factory('psn-nursingWorker');
    modelNode.factory('psn-workItem');
    modelNode.factory('psn-nursingShift');
    modelNode.factory('psn-district');
    modelNode.factory('psn-nursingLevel');
    modelNode.factory('psn-disease');
    modelNode.factory('psn-room');
    modelNode.factory('psn-roomOccupancyChangeHistory');
    modelNode.factory('psn-mealDish');
    modelNode.factory('psn-meal');
    modelNode.factory('psn-mealMenu');
    modelNode.factory('psn-mealMenuTemplate');
    modelNode.factory('psn-mealOrderRecord');

    //商户机构
    modelNode.factory('trv-scenerySpot');

    //票付通
    // modelNode.factory('idc-scenicSpot_PFT');
    // modelNode.factory('idc-ticket_PFT');
    // modelNode.factory('idc-order_PFT');
    // modelNode.factory('pfta-room');
    // modelNode.factory('pfta-district');
    // modelNode.factory('pfta-roomOccupancyChangeHistory');

    //管理中心
    modelNode.factory('pub-red');
    modelNode.factory('pub-tenant');
    modelNode.factory('pub-tenantJournalAccount');
    modelNode.factory('pub-tenantChargeItemCustomized');
    modelNode.factory('pub-user');
    modelNode.factory('pub-func');
    modelNode.factory('pub-alarm');
    modelNode.factory('pub-order');
    modelNode.factory('pub-appServerSideUpdateHistory');
    modelNode.factory('pub-appClientSideUpdateHistory');
    modelNode.factory('pub-deviceAccess');
    modelNode.factory('pub-jobStatus');
    modelNode.factory('pub-robot');
    modelNode.factory('pub-bedMonitor');
    modelNode.factory('pub-drug');
    modelNode.factory('pub-dataPermission');
    modelNode.factory('pub-evaluationItem');
    modelNode.factory('pub-evaluationTemplate');

    //het
    modelNode.factory('het-member');
    modelNode.factory('het-doctorAccountOfMingZhong');

  }

})();