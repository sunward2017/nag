/**
 * district Created by yrm on 17-5-3.
 * Target:定期评估 
 */

(function() {
    'use strict';
    
    angular
        .module('subsystem.pension-agency')
        .controller('AssessmentRegularGridController',AssessmentRegularGridController)
        .controller('AssessmentRegularDetailsGridController',AssessmentRegularDetailsGridController)
    ;

    AssessmentRegularGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entryVM'];

    function  AssessmentRegularGridController($scope, ngDialog, vmh, vm) {

        $scope.vm = vm;
        $scope.utils = vmh.utils.g;

        init();

        function init() {
            vm.init({removeDialog: ngDialog});
            vm.query();
        }
    }

    AssessmentRegularDetailsGridController.$inject = ['$scope', 'ngDialog', 'vmh', 'entityVM'];

   function  AssessmentRegularDetailsGridController($scope, ngDialog, vmh, vm) {

        var vm = $scope.vm = vm;
        $scope.utils = vmh.utils.v;
        vm.disease_evaluation_json = {};
        vm.adl_json = {};

        init();

        function init() {

            vm.init({removeDialog: ngDialog});


            vm.doSubmit = doSubmit;
            vm.beginAssessment = beginAssessment;
            vm.setNursingLevel = setNursingLevel;
            vm.queryElderly = queryElderly;
            vm.selectElerly = selectElerly;
            vm.tab1 = {cid: 'contentTab1'};
 

            vmh.parallel([
                vmh.shareService.d('D3022'),
                vmh.shareService.d('D3024'),
                vmh.psnService.nursingLevels(vm.tenantId),
                vmh.shareService.d('D3015'),
            ]).then(function(results){
                vm.disease_evaluation_array= results[0];
                vm.adl_array = results[1];
                vm.selectBinding.nursing_levels = results[2];
                vm.assessment_grades = results[3];
                console.log('result3===');
                console.log(vm.assessment_grades);
            })  

            vm.disease_evaluation = vmh.shareService.d('D3022').then(function (results) {
                            vmh.utils.v.changeProperyName(results, [{o: 'value', n: '_id'}]);
                            return results;
                        });

            vm.shit = vmh.shareService.d('D3024').then(function (results) {
                            var res = _.filter(results,function(o){
                                return o.D3023 == 'A0001';
                            });
                            vmh.utils.v.changeProperyName(res, [{o: 'value', n: '_id'}]);
                            return res;
                        });
            vm.pee = vmh.shareService.d('D3024').then(function (results) {
                            var res = _.filter(results,function(o){
                                return o.D3023 == 'A0002';
                            });
                            vmh.utils.v.changeProperyName(res, [{o: 'value', n: '_id'}]);
                            return res;
                        }); 
            vm.decorator =  vmh.shareService.d('D3024').then(function (results) {
                            var res = _.filter(results,function(o){
                                return o.D3023 == 'A0003';
                            });
                            vmh.utils.v.changeProperyName(res, [{o: 'value', n: '_id'}]);
                            return res;
                        });    
            vm.wc =  vmh.shareService.d('D3024').then(function (results) {
                            var res = _.filter(results,function(o){
                                return o.D3023 == 'A0004';
                            });
                            vmh.utils.v.changeProperyName(res, [{o: 'value', n: '_id'}]);
                            return res;
                        });    
            vm.eat =  vmh.shareService.d('D3024').then(function (results) {
                            var res = _.filter(results,function(o){
                                return o.D3023 == 'A0005';
                            });
                            vmh.utils.v.changeProperyName(res, [{o: 'value', n: '_id'}]);
                            return res;
                        });    
            vm.transfer =  vmh.shareService.d('D3024').then(function (results) {
                            var res = _.filter(results,function(o){
                                return o.D3023 == 'A0006';
                            });
                            vmh.utils.v.changeProperyName(res, [{o: 'value', n: '_id'}]);
                            return res;
                        });    

            vm.activity =  vmh.shareService.d('D3024').then(function (results) {
                            var res = _.filter(results,function(o){
                                return o.D3023 == 'A0007';
                            });
                            vmh.utils.v.changeProperyName(res, [{o: 'value', n: '_id'}]);
                            return res;
                        });    

            vm.dress =  vmh.shareService.d('D3024').then(function (results) {
                            var res = _.filter(results,function(o){
                                return o.D3023 == 'A0008';
                            });
                            vmh.utils.v.changeProperyName(res, [{o: 'value', n: '_id'}]);
                            return res;
                        });  
            vm.stairs =  vmh.shareService.d('D3024').then(function (results) {
                            var res = _.filter(results,function(o){
                                return o.D3023 == 'A0009';
                            });
                            vmh.utils.v.changeProperyName(res, [{o: 'value', n: '_id'}]);
                            return res;
                        });
            vm.bath =  vmh.shareService.d('D3024').then(function (results) {
                            var res = _.filter(results,function(o){
                                return o.D3023 == 'A0010';
                            });
                            vmh.utils.v.changeProperyName(res, [{o: 'value', n: '_id'}]);
                            return res;
                        });       

            vm.load();

        }

        function queryElderly(keyword) {
            return vmh.fetch(vmh.psnService.queryElderly(vm.tenantId, keyword, {
                  live_in_flag: true
            }, 'name'));
        }

        function selectElerly(o) {
            if(o){
                vm.model.elderlyId = o.originalObject._id;
                vm.model.elderly_name = o.originalObject.name;
            }
        }

        function setNursingLevel(nursingLevelId,nursingLevelName){
            vm.model.nursingLevelId = nursingLevelId;
            vm.model.current_nursing_level_name = nursingLevelName;
        }

        function beginAssessment(){
            if (true) {

                //病情
                var a0001_flag = false;
                var a0003_flag = false;
                var a0005_flag = false;
                vm.disease_evaluation_json.base_on = vm.base_on;
                _.each(vm.base_on, function (o) {
                    var disease_evaluation_object = _.find(vm.disease_evaluation_array,function(item){
                        return (item.value == o)||(item._id == o);
                    });
                    console.log(disease_evaluation_object);
                    if(disease_evaluation_object.D3021 == 'A0001'){
                        a0001_flag = true;
                    }else if(disease_evaluation_object.D3021 == 'A0003'){
                        a0003_flag = true;
                    }else if(disease_evaluation_object.D3021 == 'A0005'){
                        a0005_flag = true;
                    }
                });


                //活动能力
                var adl_base_on= [];
                var score = 0;

                var adl_shit_base_on_item = {};
                var adl_shit_object = _.find(vm.adl_array,function(item){
                    return (item.value == vm.adl_shit)||(item._id == vm.adl_shit);
                });
                adl_shit_base_on_item.item = adl_shit_object.D3022;
                adl_shit_base_on_item.standard = vm.adl_shit;
                adl_shit_base_on_item.score = adl_shit_object.score;
                adl_base_on.push(adl_shit_base_on_item);
                score += adl_shit_object.score;

                var adl_pee_base_on_item = {};
                var adl_pee_object = _.find(vm.adl_array,function(item){
                    return (item.value == vm.adl_pee)||(item._id == vm.adl_pee);
                });
                adl_pee_base_on_item.item = adl_pee_object.D3022;
                adl_pee_base_on_item.standard = vm.adl_pee;
                adl_pee_base_on_item.score = adl_pee_object.score;
                adl_base_on.push(adl_pee_base_on_item);
                score += adl_pee_object.score;
                
                var adl_decorator_base_on_item = {};
                var adl_decorator_object = _.find(vm.adl_array,function(item){
                    return (item.value == vm.adl_decorator)||(item._id == vm.adl_decorator);
                });
                adl_decorator_base_on_item.item = adl_decorator_object.D3022;
                adl_decorator_base_on_item.standard = vm.adl_decorator;
                adl_decorator_base_on_item.score = adl_decorator_object.score;
                adl_base_on.push(adl_decorator_base_on_item);
                score += adl_decorator_object.score;
                
                var adl_wc_base_on_item = {};
                var adl_wc_object = _.find(vm.adl_array,function(item){
                    return (item.value == vm.adl_wc)||(item._id == vm.adl_wc);
                });
                adl_wc_base_on_item.item = adl_wc_object.D3022;
                adl_wc_base_on_item.standard = vm.adl_wc;
                adl_wc_base_on_item.score = adl_wc_object.score;
                adl_base_on.push(adl_wc_base_on_item);
                score += adl_wc_object.score;
            
                var adl_eat_base_on_item = {};
                var adl_eat_object = _.find(vm.adl_array,function(item){
                    return (item.value == vm.adl_eat)||(item._id == vm.adl_eat);
                });
                adl_eat_base_on_item.item = adl_eat_object.D3022;
                adl_eat_base_on_item.standard = vm.adl_eat;
                adl_eat_base_on_item.score = adl_eat_object.score;
                adl_base_on.push(adl_eat_base_on_item);
                score += adl_eat_object.score;
                
                var adl_transfer_base_on_item = {};
                var adl_transfer_object = _.find(vm.adl_array,function(item){
                    return (item.value == vm.adl_transfer)||(item._id == vm.adl_transfer);
                });
                adl_transfer_base_on_item.item = adl_transfer_object.D3022;
                adl_transfer_base_on_item.standard = vm.adl_transfer;
                adl_transfer_base_on_item.score = adl_transfer_object.score;
                adl_base_on.push(adl_transfer_base_on_item);
                score += adl_transfer_object.score;

                var adl_activity_base_on_item = {};
                var adl_activity_object = _.find(vm.adl_array,function(item){
                    return (item.value == vm.adl_activity)||(item._id == vm.adl_activity);
                });
                adl_activity_base_on_item.item = adl_activity_object.D3022;
                adl_activity_base_on_item.standard = vm.adl_activity;
                adl_activity_base_on_item.score = adl_activity_object.score;
                adl_base_on.push(adl_activity_base_on_item);
                score += adl_activity_object.score;

                
                var adl_dress_base_on_item = {};
                var adl_dress_object = _.find(vm.adl_array,function(item){
                    return (item.value == vm.adl_dress)||(item._id == vm.adl_dress);
                });
                adl_dress_base_on_item.item = adl_dress_object.D3022;
                adl_dress_base_on_item.standard = vm.adl_dress;
                adl_dress_base_on_item.score = adl_dress_object.score;
                adl_base_on.push(adl_dress_base_on_item);
                score += adl_dress_object.score;

                var adl_stairs_base_on_item = {};
                var adl_stairs_object = _.find(vm.adl_array,function(item){
                    return (item.value == vm.adl_stairs)||(item._id == vm.adl_stairs);
                });
                adl_stairs_base_on_item.item = adl_stairs_object.D3022;
                adl_stairs_base_on_item.standard = vm.adl_stairs;
                adl_stairs_base_on_item.score = adl_stairs_object.score;
                adl_base_on.push(adl_stairs_base_on_item);
                score += adl_stairs_object.score;

                var adl_bath_base_on_item = {};
                var adl_bath_object = _.find(vm.adl_array,function(item){
                    return (item.value == vm.adl_bath)||(item._id == vm.adl_bath);
                });
                adl_bath_base_on_item.item = adl_bath_object.D3022;
                adl_bath_base_on_item.standard = vm.adl_bath;
                adl_bath_base_on_item.score = adl_bath_object.score;
                adl_base_on.push(adl_bath_base_on_item);
                score += adl_bath_object.score;
               
                vm.adl_json.base_on = adl_base_on;
                vm.adl_json.score = score;

                vm.model.current_adl= vm.adl_json;

                if(a0001_flag){
                    console.log('a0001_flag');
                    vm.disease_evaluation_json.level = 'A0001';//重度
                    if(score <= 40){
                        vm.model.current_nursing_assessment_grade = 'A0005';//介护老人(失能/失智)
                    }else{
                        vm.model.current_nursing_assessment_grade = 'A0003';//介助老人(半失能/半失智)
                    }
                }else if(a0003_flag){
                    console.log('a0003_flag');
                    vm.disease_evaluation_json.level = 'A0003';//中度
                    vm.model.current_nursing_assessment_grade = 'A0003';//介助
                }else if(a0005_flag){
                    console.log('a0005_flag');
                    vm.disease_evaluation_json.level = 'A0005';//轻度
                    if(score <= 40){
                        vm.model.current_nursing_assessment_grade = 'A0003';//介助老人(半失能/半失智)
                    }else{
                        vm.model.current_nursing_assessment_grade = 'A0001';//自理老人
                    }
                }
                vm.model.current_disease_evaluation = vm.disease_evaluation_json;
                vm.model.type = 'A0003';//定期评估

                var selectAssessmentGrade = _.find(vm.assessment_grades,function(item){
                    return item.value == vm.model.current_nursing_assessment_grade;
                });
                vm.assessment_grade_name = selectAssessmentGrade.name;
                vmh.psnService.nursingLevelsByAssessmentGrade(vm.tenantId,vm.model.current_nursing_assessment_grade).then(function(rows){
                console.log(rows);
                vm.selectBinding.nursing_levels = rows;
            });
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }

        function doSubmit() {
            if ($scope.theForm.$valid) {
                vm.save();
            }
            else {
                if ($scope.utils.vtab(vm.tab1.cid)) {
                    vm.tab1.active = true;
                }
            }
        }


    }

})();