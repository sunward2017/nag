/**
 * dashboard Created by zppro on 17-2-21.
 * Target:系统管理员以上看的数据面板（俯瞰图）(移植自fsrok)
 */
(function () {
    'use strict';

    angular
        .module('subsystem.pension-agency')
        .controller('DashboardPensionAgencyController', DashboardPensionAgencyController)
        ;

    DashboardPensionAgencyController.$inject = ['$scope', '$echarts', 'psnDashboardNode', 'vmh', 'instanceVM'];

    function DashboardPensionAgencyController($scope, $echarts, psnDashboardNode, vmh, vm) {
        $scope.vm = vm;

        init();


        function init() {

            vm.init();

            vm.tab1 = {active: true};
            vm.tab2 = {active: false};
            vm.tab3 = {active: false};

            liveinAndAccountAndBedInfo();
            elderlyAgeGroups();
            roomVacancyRateMonthly();
            roomCatagoryOfManTime();
            roomCatagoryOfManTimeMonthly();

            nursingStatInfo();
        }

        function liveinAndAccountAndBedInfo() {
            psnDashboardNode.liveinAndAccountAndBedInfo(vm.tenantId).then(function (ret) {
                vm.liveinAndAccountAndBedInfo = ret;
            });
        }

        function elderlyAgeGroups() {
            psnDashboardNode.elderlyAgeGroups(vm.tenantId).then(function (rows) {
                //data: ["60岁以下", "60-69岁", "70-79岁", '80岁及以上']//legend data
                //data: [
                //    {value: 335, name: '60岁以下'},
                //    {value: 310, name: '60-69岁'},
                //    {value: 234, name: '70-79岁'},
                //    {value: 135, name: '80岁及以上'}
                //],//serials data   "$lte": end

                var titles = _.map(rows, function (o) { return vm.moduleTranslatePath('TAB-INTEGRATION-'+o.title); });
                var values = _.map(rows, function (o) { return o.value; });
                var key_chart_title_elderlyagegroups = vm.moduleTranslatePath('TAB-INTEGRATION-CHART-TITLE-ELDERLY-AGE-GROUPS');
                var key_chart_serie_name_elderlyagegroups = vm.moduleTranslatePath('TAB-INTEGRATION-CHART-SERIE-NAME-ELDERLY-AGE-GROUPS');
                vmh.q.all([vmh.translate([key_chart_title_elderlyagegroups, key_chart_serie_name_elderlyagegroups]), vmh.translate(titles),
                vmh.psnService.queryElderly(vm.tenantId, '', {
                    live_in_flag: true,
                    // birthday: { "$gt": start},
                }, 'name sex birthday')
                ]).then(function (ret) {

                    var names = _.values(ret[1]);
                    var data = [];
                    for (var i = 0; i < values.length; i++) {
                        data.push({ name: names[i], value: values[i] });
                    }
                    vm.elderlyAgeGroups_id = $echarts.generateInstanceIdentity();
                    vm.elderlyAgeGroups_config = {
                        title: {
                            text: ret[0][key_chart_title_elderlyagegroups],
                            subtext: vm.tenant_name,
                            x: 'center'
                        },
                        tooltip: {
                            trigger: 'item',
                            formatter: "{a} <br/>{b} : {c} ({d}%)"
                        },
                        legend: {
                            orient: 'vertical',
                            left: 'left',
                            data: names
                        },
                        series: [
                            {
                                name: ret[0][key_chart_serie_name_elderlyagegroups],
                                type: 'pie',
                                radius: '55%',
                                center: ['50%', '60%'],
                                data: data,
                                itemStyle: {
                                    emphasis: {
                                        shadowBlur: 10,
                                        shadowOffsetX: 0,
                                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                                    }
                                }
                            }
                        ]
                    };
                    vm.elderlyAgeGroups_loaded = true;

                    var elderlys = _.map(ret[2], function (row) {
                        return { name: row.name, sex: row.sex, birthday: row.birthday }
                    })
                    var month = moment().toObject().months;
                    var nextMonth = month + 1;
                    var birthdayElderlys = _.filter(elderlys, function (o) {
                        var m = moment(o.birthday).toObject().months;
                        if (m == month || m == nextMonth) {
                            return o;
                        }
                    })
                    vm.birthdayElderlys = birthdayElderlys;  
                });

            });

        }

        function roomVacancyRateMonthly() {

            psnDashboardNode.roomVacancyRateMonthly(vm.tenantId, moment().subtract(5, 'months').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')).then(function (rows) {
                //data: ['2016-02','2016-03','2016-04','2016-05','2016-06','2016-07'] //legend data
                //data:[0, 0, 0, 0, 0, 13, 10],//serials data
                var names = _.pluck(rows, 'period_value');
                var data = _.pluck(rows, 'amount');

                var key_chart_title_roomVacancyRateMonthly = vm.moduleTranslatePath('TAB-INTEGRATION-CHART-TITLE-ROOM-VACANCY_RATE-MONTHLY');
                var key_chart_serie_name_roomVacancyRateMonthly = vm.moduleTranslatePath('TAB-INTEGRATION-CHART-SERIE-NAME-ROOM-VACANCY_RATE-MONTHLY');
                var key_chart_serie_data_unit_roomVacancyRateMonthly = vm.moduleTranslatePath('TAB-INTEGRATION-CHART-SERIE-DATA-UNIT-ROOM-VACANCY_RATE-MONTHLY');
                var key_aggregate_keywords_max = 'aggregate_keywords.MAX';
                var key_aggregate_keywords_min = 'aggregate_keywords.MIN';
                var key_aggregate_keywords_average = 'aggregate_keywords.AVERAGE';

                vmh.translate([
                    key_chart_title_roomVacancyRateMonthly,
                    key_chart_serie_name_roomVacancyRateMonthly,
                    key_chart_serie_data_unit_roomVacancyRateMonthly,
                    key_aggregate_keywords_max,
                    key_aggregate_keywords_min,
                    key_aggregate_keywords_average
                ]).then(function (ret) {
                    vm.roomVacancyRateMonthly_id = $echarts.generateInstanceIdentity();
                    vm.roomVacancyRateMonthly_config = {
                        title: {
                            text: ret[key_chart_title_roomVacancyRateMonthly],
                            subtext: vm.tenant_name
                        },
                        tooltip: {
                            trigger: 'axis'
                        },
                        xAxis: {
                            type: 'category',
                            boundaryGap: false,
                            data: names
                        },
                        yAxis: {
                            type: 'value',
                            axisLabel: {
                                formatter: '{value} ' + ret[key_chart_serie_data_unit_roomVacancyRateMonthly]
                            }
                        },
                        series: [
                            {
                                name: ret[key_chart_serie_name_roomVacancyRateMonthly],
                                type: 'line',
                                data: data,
                                markPoint: {
                                    data: [
                                        { type: 'max', name: ret[key_aggregate_keywords_max] },
                                        { type: 'min', name: ret[key_aggregate_keywords_min] }
                                    ]
                                },
                                markLine: {
                                    data: [
                                        { type: 'average', name: ret[key_aggregate_keywords_average] }
                                    ]
                                }
                            }
                        ]
                    };
                    vm.roomVacancyRateMonthly_loaded = true;
                });
            });
        }

        function roomCatagoryOfManTime() {
            psnDashboardNode.roomCatagoryOfManTime(vm.tenantId).then(function (rows) {
                var titles = _.map(rows, function (o) { return vm.moduleTranslatePath('TAB-INTEGRATION-'+o.title); });
                var values = _.pluck(rows, 'value');

                var key_chart_title_roomCatagoryOfManTime = vm.moduleTranslatePath('TAB-INTEGRATION-CHART-TITLE-ROOM-CATAGORY-OF-MANTIME');
                var key_chart_serie_name_roomCatagoryOfManTime = vm.moduleTranslatePath('TAB-INTEGRATION-CHART-SERIE-NAME-ROOM-CATAGORY-OF-MANTIME');


                vmh.q.all([vmh.translate([
                    key_chart_title_roomCatagoryOfManTime,
                    key_chart_serie_name_roomCatagoryOfManTime
                ]), vmh.translate(titles)]).then(function (ret) {

                    var names = _.values(ret[1]);
                    var data = [];
                    for (var i = 0; i < values.length; i++) {
                        data.push({ name: names[i], value: values[i] });
                    }

                    vm.roomCatagoryOfManTime_id = $echarts.generateInstanceIdentity();
                    vm.roomCatagoryOfManTime_config = {
                        title: {
                            text: ret[0][key_chart_title_roomCatagoryOfManTime],
                            subtext: vm.tenant_name
                        },
                        tooltip: {
                            trigger: 'item',
                            formatter: "{a} <br/>{b}: {c} ({d}%)"
                        },
                        legend: {
                            orient: 'vertical',
                            x: 'left',
                            data: names
                        },
                        series: [
                            {
                                name: ret[0][key_chart_serie_name_roomCatagoryOfManTime],
                                type: 'pie',
                                radius: ['50%', '70%'],
                                avoidLabelOverlap: false,
                                label: {
                                    normal: {
                                        show: false,
                                        position: 'center'
                                    },
                                    emphasis: {
                                        show: true,
                                        textStyle: {
                                            fontSize: '30',
                                            fontWeight: 'bold'
                                        }
                                    }
                                },
                                labelLine: {
                                    normal: {
                                        show: false
                                    }
                                },
                                data: data
                            }
                        ]
                    };
                    vm.roomCatagoryOfManTime_loaded = true;
                });
            });
        }

        function roomCatagoryOfManTimeMonthly() {
            psnDashboardNode.roomCatagoryOfManTimeMonthly(vm.tenantId, moment().subtract(5, 'months').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')).then(function (result) {
                var xAxisData = result.xAxisData;
                var titles = _.map(result.seriesData, function (o) { return vm.moduleTranslatePath('TAB-INTEGRATION-'+o.name); });
                var key_chart_title_roomCatagoryOfManTimeMonthly = vm.moduleTranslatePath('TAB-INTEGRATION-CHART-TITLE-ROOM-CATAGORY-OF-MANTIME-Monthly');

                vmh.q.all([vmh.translate([
                    key_chart_title_roomCatagoryOfManTimeMonthly
                ]), vmh.translate(titles)]).then(function (ret) {

                    var names = _.values(ret[1]);
                    var seriesData = _.map(result.seriesData, function (o, i) { return _.extend(o, { name: names[i], type: 'bar' }) });
                    vm.roomCatagoryOfManTimeMonthly_id = $echarts.generateInstanceIdentity();
                    vm.roomCatagoryOfManTimeMonthly_config = {
                        title: {
                            text: ret[0][key_chart_title_roomCatagoryOfManTimeMonthly],
                            subtext: vm.tenant_name
                        },
                        tooltip: {
                            trigger: 'axis',
                            axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                                type: 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
                            }
                        },
                        legend: {
                            x: 'center',
                            y: 'bottom',
                            data: names
                        },
                        grid: {
                            left: '3%',
                            right: '4%',
                            bottom: '10%',
                            containLabel: true
                        },
                        xAxis: [
                            {
                                type: 'category',
                                data: xAxisData
                            }
                        ],
                        yAxis: [
                            {
                                type: 'value'
                            }
                        ],
                        series: seriesData
                    };
                    vm.roomCatagoryOfManTimeMonthly_loaded = true;
                });


            });
        }

        function nursingStatInfo() {
            psnDashboardNode.nursingStatInfo(vm.tenantId).then(function (ret) {
                vm.nursingStatInfo = ret;
            });
        }
    }

})();