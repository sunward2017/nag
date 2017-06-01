/**=========================================================
 * Module: config.js
 * App routes and resources configuration
 =========================================================*/


(function () {
    'use strict';

    angular
        .module('app.routes')
        .config(routesHealthCenterConfig);

    routesHealthCenterConfig.$inject = ['$stateProvider', 'RouteHelpersProvider', 'AUTH_ACCESS_LEVELS', 'MODEL_VARIABLES'];

    function routesHealthCenterConfig($stateProvider, helper, AUTH_ACCESS_LEVELS, MODEL_VARIABLES) {

        // 养老机构
        $stateProvider
            .state(MODEL_VARIABLES.STATE_PREFIXS.ROOT + MODEL_VARIABLES.SUBSYSTEM_NAMES.PENSION_AGENCY, {
                url: MODEL_VARIABLES.URLS.PENSION_AGENCY,
                abstract: true,
                access_level: AUTH_ACCESS_LEVELS.USER,
                template: '<div class="module-header-wrapper" data-ui-view="module-header"></div><div class="module-content-wrapper" data-ui-view="module-content"></div><div class="clearfix"></div>',
                resolve: {
                    vmh: helper.buildVMHelper(),
                    deps: helper.resolveFor2(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY)
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'dashboard', {
                url: '/dashboard',
                title: '数据面板',
                access_level: AUTH_ACCESS_LEVELS.USER,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'dashboard.html'),
                        controller: 'DashboardPensionAgencyController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'dashboard'),
                            deps: helper.resolveFor2(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'dashboard.js')
                        }
                    }
                },
                resolve: helper.resolveFor('echarts.common', 'echarts-ng', 'classyloader')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'enter', {
                url: '/enter',
                title: '入院管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'ENTER' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'enter.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'enter.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'enter-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'EnterGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'enter.list', {
                        modelName: 'psn-enter',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '入院登记号',
                            name: 'code',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '老人',
                            name: 'elderly_summary',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '入院日期',
                            name: 'enter_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '预付款',
                            name: 'deposit',
                            type: 'number',
                            width: 60,
                            sortable: true
                        }, {
                            label: '当前步骤',
                            name: 'current_register_step_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'enter.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'enter-details.html'),
                controller: 'EnterDetailsController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'enter.details', {
                        modelName: 'psn-enter',
                        model: {
                            code: MODEL_VARIABLES.PRE_DEFINED.SERVER_GEN,
                            enter_on: new Date(),
                            period_value_in_advance: 1
                        },
                        blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'in', {
                url: '/in',
                title: '在院管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'IN' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'in.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'in.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'in-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'InGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'in.list', {
                        modelName: 'psn-elderly',
                        searchForm: { "status": 1, "live_in_flag": true },
                        transTo: {
                            "inConfig": MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'in.config'
                        },
                        serverPaging: true,
                        columns: [{
                            label: '老人',
                            name: 'name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '性别',
                            name: 'sex',
                            type: 'string',
                            width: 40,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1006/object')
                        }, {
                            label: '年龄',
                            name: 'birthday',
                            type: 'date',
                            width: 40,
                            sortable: true
                        }, {
                            label: '入院登记号',
                            name: 'enter_code',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '饮食套餐',
                            name: 'board_summary',
                            type: 'string',
                            width: 80
                        }, {
                            label: '房间床位',
                            name: 'room_summary',
                            type: 'string',
                            width: 120
                        }, {
                            label: '照护信息',
                            name: 'nursing_info',
                            type: 'string',
                            width: 120
                        }, {
                            label: '状态',
                            name: 'begin_exit_flow',
                            type: 'string',
                            width: 80,
                            formatter: function () {
                                return { "true": "正在出院", "false": "在院", "undefined": "在院" }
                            }
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'in.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'in-details.html'),
                controller: 'InDetailsController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'in.details', {
                        modelName: 'psn-elderly',
                        blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'in.config', {
                url: '/config/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'in-config.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'InConfigController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'in.config', {
                        modelName: 'psn-elderly',
                        blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'exit', {
                url: '/exit-manage',
                title: '出院管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'EXIT' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'exit.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'exit.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'exit-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'ExitGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'exit.list', {
                        modelName: 'psn-exit',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '老人',
                            name: 'elderly_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '入院登记号',
                            name: 'code',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '入院日期',
                            name: 'enter_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '申请出院日期',
                            name: 'application_date',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '当前步骤',
                            name: 'current_step_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '出院日期',
                            name: 'exit_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'exit.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'exit-details.html'),
                controller: 'ExitDetailsController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                params: { autoSetTab: null },
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'exit.details', {
                        modelName: 'psn-exit',
                        model: {},
                        blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'reception', {
                url: '/reception',
                title: '接待管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'RECEPTION' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'reception.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'reception.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'reception-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'ReceptionGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'reception.list', {
                        modelName: 'psn-reception',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '接待登记号',
                            name: 'code',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '探望老人',
                            name: 'elderly_name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '探望日期',
                            name: 'begin_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '探望时段',
                            name: 'end_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '访客',
                            name: 'visit_summary',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'reception.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'reception-details.html'),
                controller: 'ReceptionDetailsController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'reception.details', {
                        modelName: 'psn-reception',
                        model: {
                            code: MODEL_VARIABLES.PRE_DEFINED.SERVER_GEN,
                            begin_on: new Date()
                        },
                        blockUI: true
                    }),
                    deps: helper.resolveFor2('angucomplete-alt')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'leave', {
                url: '/leave',
                title: '外出管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'LEAVE' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'leave.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'leave.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'leave-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'LeaveGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'leave.list', {
                        modelName: 'psn-leave',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '外出登记号',
                            name: 'code',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '外出老人',
                            name: 'elderly_name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '外出时间',
                            name: 'begin_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '归还时间',
                            name: 'end_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '陪同人',
                            name: 'accompany_summary',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'leave.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'leave-details.html'),
                controller: 'LeaveDetailsController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'leave.details', {
                        modelName: 'psn-leave',
                        model: {
                            code: MODEL_VARIABLES.PRE_DEFINED.SERVER_GEN,
                            begin_on: new Date()
                        },
                        blockUI: true
                    }),
                    deps: helper.resolveFor2('angucomplete-alt')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'assessment-enter', {
                url: '/assessment-enter',
                title: '入院评估管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'ASSESSMENT-ENTER' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'assessment-enter.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'assessment-enter.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'assessment-enter-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'AssessmentEnterGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'assessment-enter.list', {
                        modelName: 'psn-assessment',
                        searchForm: { "status": 1, "type": 'A0001' },
                        serverPaging: true,
                        columns: [{
                            label: '评估号',
                            name: 'code',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '老人',
                            name: 'elderlyId',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '评估时间',
                            name: 'time',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '评估等级',
                            name: 'current_nursing_assessment_grade',
                            type: 'string',
                            width: 60,
                            sortable: true,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3015/object'),
                        }, {
                            label: '照护级别',
                            name: 'current_nursing_level_name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 30
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'assessment-enter.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'assessment-enter-details.html'),
                controller: 'AssessmentEnterDetailsGridController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'assessment-enter.details', {
                        modelName: 'psn-assessment',
                        model: { code: MODEL_VARIABLES.PRE_DEFINED.SERVER_GEN },
                        blockUI: true
                    }),
                    deps: helper.resolveFor2('angucomplete-alt')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'assessment-regular', {
                url: '/assessment-regular',
                title: '定期评估管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'ASSESSMENT-REGULAR' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'assessment-regular.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'assessment-regular.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'assessment-regular-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'AssessmentRegularGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'assessment-regular.list', {
                        modelName: 'psn-elderly',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        sortColumn: 'last_assessment_time',
                        sortDirection: 1,
                        columns: [{
                            label: '老人',
                            name: 'name',
                            type: 'string',
                            width: 60,
                            sortable: true

                        }, {
                            label: '上次评估时间',
                            name: 'last_assessment_time',
                            width: 60,
                            sortable: true
                        }, {
                            label: '上次评估等级',
                            name: 'nursing_assessment_grade_name',
                            type: 'string',
                            width: 60,
                            sortable: true,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3015/object'),
                        }, {
                            label: '上次照护级别',
                            name: 'nursing_level_name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '状态',
                            sortable: false,
                            width: 30
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 30
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'assessment-regular.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'assessment-regular-details.html'),
                controller: 'AssessmentRegularDetailsGridController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'assessment-regular.details', {
                        modelName: 'psn-assessment',
                        model: { code: MODEL_VARIABLES.PRE_DEFINED.SERVER_GEN },
                        blockUI: true
                    }),
                    deps: helper.resolveFor2('angucomplete-alt')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-station', {
                url: '/nursing-station',
                access_level: AUTH_ACCESS_LEVELS.USER,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-station.html'),
                        controller: 'NursingStationController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-station', {})
                        }
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'NURSING-STATION' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'nursing-station.js', 'socket.io-client', 'qiniu', 'qiniu-ng', 'echarts.common', 'echarts-ng')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-plan', {
                url: '/nursing-plan',
                access_level: AUTH_ACCESS_LEVELS.USER,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-plan.html'),
                        controller: 'NursingPlanController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-plan', {
                                modelName: 'psn-nursingPlan',
                                searchForm: { "status": 1 },
                                switches: { leftTree: true }
                            })
                        }
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'NURSING-PLAN' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'nursing-plan.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-schedule', {
                url: '/nursing-schedule',
                title: '房间值班日程',
                access_level: AUTH_ACCESS_LEVELS.USER,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-schedule.html'),
                        controller: 'NursingScheduleController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-schedule', {
                                modelName: 'psn-nursingSchedule',
                                searchForm: { "status": 1 },
                                switches: { leftTree: true }
                            })
                        }
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'NURSING-SCHEDULE' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'nursing-schedule.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-schedule-template', {
                url: '/nursing-schedule-template',
                title: '房间值班日程模版',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'NURSING-SCHEDULE-TEMPLATE' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'nursing-schedule-template.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-schedule-template.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-schedule-template-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingScheduleTemplateGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-schedule-template.list', {
                        modelName: 'psn-nursingScheduleTemplate',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '模版名称',
                            name: 'name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '类型',
                            name: 'type_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '停用',
                            name: 'stop_flag',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '停用原因',
                            name: 'stop_result_name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-schedule-template.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-schedule-template-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingScheduleTemplateDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-schedule-template.details', {
                        modelName: 'psn-nursingScheduleTemplate',
                        model: { type: 'A0001' },
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-worker-schedule', {
                url: '/nursing-worker-schedule',
                access_level: AUTH_ACCESS_LEVELS.USER,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-worker-schedule.html'),
                        controller: 'NursingWorkerScheduleController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-worker-schedule', {
                                modelName: 'psn-nursingWorkerSchedule',
                                searchForm: { "status": 1 }
                            })
                        }
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'NURSING-WORKER-SCHEDULE' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'nursing-worker-schedule.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-worker-schedule-template', {
                url: '/nursing-worker-schedule-template',
                title: '护工排班模版',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'NURSING-WORKER-SCHEDULE-TEMPLATE' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'nursing-worker-schedule-template.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-worker-schedule-template.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-worker-schedule-template-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingWorkerScheduleTemplateGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-worker-schedule-template.list', {
                        modelName: 'psn-nursingWorkerScheduleTemplate',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '模版名称',
                            name: 'name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '类型',
                            name: 'type_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '停用',
                            name: 'stop_flag',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '停用原因',
                            name: 'stop_result_name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-worker-schedule-template.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-worker-schedule-template-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingWorkerScheduleTemplateDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-worker-schedule-template.details', {
                        modelName: 'psn-nursingWorkerScheduleTemplate',
                        model: { type: 'A0001' },
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-group', {
                url: '/nursing-group',
                title: '照护组管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'NURSING-GROUP' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'nursing-group.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-group.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-group-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingGroupGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-group.list', {
                        modelName: 'psn-nursingGroup',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '照护组名称',
                            name: 'name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '组长',
                            name: 'leader_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '组成员',
                            name: 'members_summary',
                            type: 'string',
                            width: 240
                        }, {
                            label: '停用',
                            name: 'stop_flag',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-group.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-group-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingGroupDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-group.details', {
                        modelName: 'psn-nursingGroup',
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'overdue-workitem', {
                url: '/overdue-workitem',
                title: '过期项目',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'OVERDUE-WORKITEM' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'overdue-work-item.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'overdue-workitem.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'overdue-workitem-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'OverdueWorkItemGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'overdue-workitem.list', {
                        modelName: 'psn-nursingRecord',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '房间号',
                            name: 'roomName',
                            type: 'string',
                            width: 40,
                            sortable:false
                        }, {
                            label: '床号',
                            name: 'bed_no',
                            type: 'string',
                            width: 40,
                            sortable: false
                        }, {
                            label: '老人姓名',
                            name: 'elderly_name',
                            type: 'string',
                            width: 50,
                            sortable: false
                        }, {
                            label: '项目类别',
                            name: 'category',
                            type: 'string',
                            width: 70,
                            sortable: false,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3019/object')
                        },{
                            label: '项目名称',
                            name: 'name',
                            type: 'string',
                            width: 80,
                            sortable: false
                        }, {
                            label: '描述',
                            name: 'description',
                            type: 'string',
                            sortable: false,
                            width: 140
                        },{
                            label: '执行时间',
                            name: 'exec_on',
                            type: 'date',
                            width: 70,
                            sortable: false
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'warning-group', {
                url: '/warning-group',
                title: '报警列表',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'WARNING-GROUP' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'warning-group.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'warning-group.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'warning-group-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'WarningGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'warning-group.list', {
                        modelName: 'pub-alarm',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '报警设备',
                            name: 'subject_name',
                            type: 'string',
                            width: 80,
                            sortable: false,
                            formatter: { type: 'populate', options: { path: 'subjectId', select: '-_id name code' } } 
                        }, {
                            label: '报警对象',
                            name: 'object_name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '报警原因',
                            name: 'reason',
                            type: 'string',
                            width: 100,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3016/object')
                        }, {
                            label: '内容',
                            name: 'content',
                            type: 'string',
                            width: 240,
                            sortable: true
                        }, {
                            label: '处理',
                            name: 'process_flag',
                            type: 'bool',
                            width: 50,
                            sortable: true
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'enter-payment', {
                url: '/enter-payment',
                title: '老人入院缴费',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'ENTER-PAYMENT' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'enter-payment.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'enter-payment.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'enter-payment-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'EnterPaymentGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'enter-payment.list', {
                        modelName: 'psn-enter',
                        searchForm: { "status": 1, "current_register_step": { "$in": ['A0003', 'A0005', 'A0007'] } },
                        transTo: MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'enter.details',
                        serverPaging: true,
                        columns: [{
                            label: '入院登记号',
                            name: 'code',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '老人',
                            name: 'elderly_summary',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '入院日期',
                            name: 'enter_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '预付款',
                            name: 'deposit',
                            type: 'number',
                            width: 60,
                            sortable: true
                        }, {
                            label: '当前步骤',
                            name: 'current_register_step_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'recharge', {
                url: '/recharge',
                title: '老人账户充值',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'RECHARGE' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'recharge.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'recharge.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'recharge-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RechargeGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'recharge.list', {
                        modelName: 'psn-recharge',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '充值日期',
                            name: 'check_in_time',
                            type: 'date',
                            width: 80,
                            sortable: true
                        }, {
                            label: '充值对象',
                            name: 'elderly_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '充值金额',
                            name: 'amount',
                            type: 'number',
                            width: 60,
                            sortable: true
                        }, {
                            label: '充值方式',
                            name: 'type',
                            type: 'string',
                            width: 60,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3005/object')
                        }, {
                            label: '备注',
                            name: 'remark',
                            type: 'string',
                            width: 180
                        }, {
                            label: '记账凭证号',
                            name: 'voucher_no',
                            type: 'string',
                            width: 60
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'recharge.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'recharge-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RechargeDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'recharge.details', {
                        modelName: 'psn-recharge',
                        blockUI: true
                    }),
                    deps: helper.resolveFor2('angucomplete-alt')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'arrearage', {
                url: '/arrearage',
                title: '欠费管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'ARREARAGE' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'arrearage.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'exit-settlement', {
                url: '/exit-settlement',
                title: '老人出院结算',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'EXIT-SETTLEMENT' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'exit-settlement.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'exit-settlement.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'exit-settlement-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'ExitSettlementGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'exit-settlement.list', {
                        modelName: 'psn-exit',
                        searchForm: { "status": 1, "current_step": { "$in": ['A0005', 'A0007', 'A0009'] } },
                        transTo: MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'exit.details',
                        serverPaging: true,
                        columns: [{
                            label: '老人',
                            name: 'elderly_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '入院登记号',
                            name: 'code',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '入院日期',
                            name: 'enter_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '申请出院日期',
                            name: 'application_date',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '当前步骤',
                            name: 'current_step_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '出院日期',
                            name: 'exit_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'red', {
                url: '/red',
                title: '冲红明细',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'RED' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.SHARED + 'red.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'red.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'red-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RedGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'red.list', {
                        modelName: 'pub-red',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '冲红日期',
                            name: 'check_in_time',
                            type: 'date',
                            width: 80,
                            sortable: true
                        }, {
                            label: '记账凭证号',
                            name: 'voucher_no',
                            type: 'string',
                            width: 60
                        }, {
                            label: '冲红凭证号',
                            name: 'voucher_no_to_red',
                            type: 'string',
                            width: 60
                        }, {
                            label: '冲红金额',
                            name: 'amount',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '备注',
                            name: 'remark',
                            type: 'string',
                            width: 180
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'red.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'red-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RedDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'red.details', {
                        modelName: 'pub-red',
                        blockUI: true
                    }),
                    deps: helper.resolveFor2('angucomplete-alt')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'receipts-and-disbursements', {
                url: '/receipts-and-disbursements',
                title: '收支明细',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'RECEIPTS-AND-DISBURSEMENTS' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.SHARED + 'receipts-and-disbursements.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'receipts-and-disbursements.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'receipts-and-disbursements-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'ReceiptsAndDisbursementsGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'receipts-and-disbursements.list', {
                        modelName: 'pub-tenantJournalAccount',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '记账日期',
                            name: 'check_in_time',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '记账凭证号',
                            name: 'voucher_no',
                            type: 'string',
                            width: 60
                        }, {
                            label: '科目',
                            name: 'revenue_and_expenditure_type',
                            type: 'string',
                            width: 60,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3001/object')
                        }, {
                            label: '摘要',
                            name: 'digest',
                            type: 'string',
                            width: 120
                        }, {
                            label: '记账金额',
                            name: 'amount',
                            type: 'number',
                            width: 40,
                            sortable: true
                        }, {
                            label: '结转',
                            name: 'carry_over_flag',
                            type: 'bool',
                            width: 30
                        }, {
                            label: '冲红',
                            name: 'red_flag',
                            type: 'bool',
                            width: 30
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'exit-item-return', {
                url: '/exit-item-return',
                title: '出院物品归还',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'EXIT-ITEM-RETURN' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'exit-item-return.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'exit-item-return.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'exit-item-return-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'ExitItemReturnGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'exit-item-return.list', {
                        modelName: 'psn-exit',
                        searchForm: { "status": 1, "current_step": { "$in": ['A0003', 'A0005', 'A0007', 'A0009'] } },
                        transTo: MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'exit.details',
                        serverPaging: true,
                        columns: [{
                            label: '老人',
                            name: 'elderly_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '入院登记号',
                            name: 'code',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '入院日期',
                            name: 'enter_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '申请出院日期',
                            name: 'application_date',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '当前步骤',
                            name: 'current_step_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '出院日期',
                            name: 'exit_on',
                            type: 'date',
                            width: 60,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-use-item', {
                url: '/drug-use-item',
                title: '用药管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'DRUG-USE-ITEM' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'drug-use-item.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-use-item.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-use-item-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'DrugUseItemGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-use-item.list', {
                        modelName: 'psn-elderly',
                        searchForm: { "status": 1, "live_in_flag": true },
                        switches: { leftTree: true },
                        transTo: {
                            "inConfig": MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'in.config'
                        },
                        serverPaging: true,
                        columns: [{
                            label: '老人',
                            name: 'name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '性别',
                            name: 'sex',
                            type: 'string',
                            width: 40,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1006/object')
                        }, {
                            label: '年龄',
                            name: 'birthday',
                            type: 'date',
                            width: 40,
                            sortable: true
                        }, {
                            label: '入院登记号',
                            name: 'enter_code',
                            type: 'string',
                            width: 60,
                            sortable: true
                        },  {
                            label: '房间床位',
                            name: 'room_summary',
                            type: 'string',
                            width: 120
                        }, {
                            label: '照护信息',
                            name: 'nursing_info',
                            type: 'string',
                            width: 150
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 30
                        }]
                    }) 
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-use-item.details', {
                url: '/details/:action/:_id/:nursingLevelId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-use-item-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'ElderlyByDrugUseController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-use-item.details', {
                        modelName: 'psn-elderly',
                        blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-use-template', {
                url: '/drug-use-template',
                title: '用药模版',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    treeFilterObject: { "status": 1 }, //使用tmp时的过滤
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'DRUG-USE-TEMPLATE'//业务系统使用
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'drug-use-template.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-use-template.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-use-template-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'DrugUseTemplateGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-use-template.list', {
                        modelName: 'psn-drugUseTemplate',
                        searchForm: { "status": 1},
                        serverPaging: true,
                        sortColumn: 'order_no',
                        sortDirection: 1,
                        columns: [{
                            label: '模版名称',
                            name: 'name',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '排序号',
                            name: 'order_no',
                            type: 'number',
                            width: 60,
                            sortable: true
                        }, {
                            label: '重复',
                            name: 'repeat',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '时长(分)',
                            name: 'duration',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '护工确认',
                            name: 'confirm_flag',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '提醒',
                            name: 'remind_flag',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '提醒方式',
                            name: 'remind_mode',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '提醒次数',
                            name: 'remind_times',
                            type: 'number',
                            width: 80
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-use-template.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-use-template-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'DrugUseTemplateDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-use-template.details', {
                        modelName: 'psn-drugUseTemplate',
                        model: {
                            duration: 30
                        },
                        blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-directory', {
                url: '/drug-directory',
                title: '药品管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'DRUG-DIRECTORY' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'drug-directory.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-directory.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-directory-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'DrugDirectoryGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-directory.list', {
                        modelName: 'psn-drugDirectory',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '药品条形码',
                            name: 'barcode',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '药品全称',
                            name: 'full_name',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '处方药',
                            name: 'otc_flag',
                            type: 'bool',
                            width: 40,
                            sortable: true
                        }, {
                            label: '医保',
                            name: 'health_care_flag',
                            type: 'bool',
                            width: 40,
                            sortable: true
                        }, {
                            label: '价格',
                            name: 'price',
                            type: 'string',
                            width: 50,
                            sortable: true
                        }, {
                            label: '规格',
                            name: 'specification',
                            type: 'string',
                            width: 70,
                            sortable: true
                        }, {
                            label: '操作',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-directory.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-directory-details.html'),
                controller: 'DrugDirectoryDetailsController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                params: { autoSetTab: null },
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-directory.details', {
                        modelName: 'psn-drugDirectory',
                        model: {},
                        blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-stock', {
                url: '/drug-stock',
                title: '药品库存',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'DRUG-STOCK' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'drug-stock.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-stock.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-stock-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'DrugStockGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-stock.list', {
                        modelName: 'psn-drugStock',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '药品条形码',
                            name: 'barcode',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '药品名称',
                            name: 'drug_full_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '有效期',
                            name: 'period_validity',
                            type: 'date',
                            width: 100,
                            sortable: true 
                        }, {
                            label: '关联老人',
                            name: 'elderly_name',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '当前库存量',
                            name: 'current_quantity',
                            type: 'number',
                            width: 60,
                            sortable: true
                        }, {
                            label: '最小包装',
                            name: 'unit',
                            type: 'string',
                            width: 60,
                            sortable: true,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3013/object'),
                        }, {
                            label: '操作',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-stock.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-stock-details.html'),
                controller: 'DrugStockDetailsController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                params: { autoSetTab: null },
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-stock.details', {
                        modelName: 'psn-drugStock',
                        model: {},
                        blockUI: true
                    }),
                    deps: helper.resolveFor2('angucomplete-alt')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-in-stock', {
                url: '/drug-in-stock',
                title: '药品管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'DRUG-IN-STOCK' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'drug-in-stock.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-in-stock.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-in-stock-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'DrugInstockGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-in-stock.list', {
                        modelName: 'psn-drugInOutStock',
                        searchForm: { "status": 1, "in_out_type": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '出入库单',
                            name: 'in_out_no',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '老人',
                            name: 'elderly_name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '药品条形码',
                            name: 'barcode',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '药品名称',
                            name: 'drug_full_name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '药品来源',
                            name: 'type',
                            type: 'string',
                            width: 100,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3014/object'),
                            sortable: false
                        }, {
                            label: '入库数量',
                            name: 'in_out_quantity',
                            type: 'number',
                            width: 80,
                            sortable: true
                        }, {
                            label: '最小包装',
                            name: 'unit',
                            type: 'string',
                            width: 60,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3013/object'),
                            sortable: false
                        }, {
                            label: '是否有效',
                            name: 'valid_flag',
                            type: 'bool',
                            width: 60,
                            sortable: false
                        }, {
                            label: '操作',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-in-stock.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-in-stock-details.html'),
                controller: 'DrugInstockDetailsController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                params: { autoSetTab: null },
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-in-stock.details', {
                        modelName: 'psn-drugInOutStock',
                        model: {},
                        blockUI: true
                    }),
                    deps: helper.resolveFor2('angucomplete-alt')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-out-stock', {
                url: '/drug-out-stock',
                title: '药品出库',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'DRUG-OUT-STOCK' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'drug-out-stock.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-out-stock.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-out-stock-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'DrugOutStockGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-out-stock.list', {
                        modelName: 'psn-drugInOutStock',
                        searchForm: { "status": 1, "in_out_type": 0 },
                        serverPaging: true,
                        columns: [{
                            label: '出库单',
                            name: 'in_out_no',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '老人',
                            name: 'elderly_name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '药品名称',
                            name: 'drug_full_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '药品编码',
                            name: 'drug_no',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '药品去处',
                            name: 'type',
                            type: 'string',
                            width: 100,
                            sortable: true,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3014/object')
                        }, {
                            label: '出库数量',
                            name: 'in_out_quantity',
                            type: 'number',
                            width: 60,
                            sortable: true,
                        }, {
                            label: '包装单位',
                            name: 'unit',
                            type: 'string',
                            width: 60,
                            sortable: true,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D3013/object')
                        }, {
                            label: '是否有效',
                            name: 'valid_flag',
                            type: 'bool',
                            width: 40,
                            sortable: false
                        },

                        {
                            label: '操作',
                            name: 'actions',
                            sortable: false,
                            width: 40
                        }
                        ]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'drug-out-stock.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'drug-out-stock-details.html'),
                controller: 'DrugOutStockDetailsController',
                access_level: AUTH_ACCESS_LEVELS.USER,
                params: { autoSetTab: null },
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'drug-out-stock.details', {
                        modelName: 'psn-drugInOutStock',
                        model: {},
                        blockUI: true
                    }),
                    deps: helper.resolveFor2('angucomplete-alt')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-worker', {
                url: '/nursing-worker',
                title: '护工管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'NURSING-WORKER' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'nursing-worker.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-worker.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-worker-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingWorkerGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-worker.list', {
                        modelName: 'psn-nursingWorker',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '护工编号',
                            name: 'code',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '护工名称',
                            name: 'name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '手机号码',
                            name: 'phone',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '停用',
                            name: 'stop_flag',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-worker.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-worker-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingWorkerDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-worker.details', {
                        modelName: 'psn-nursingWorker',
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'work-item', {
                url: '/work-item',
                title: '工作项目',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    treeFilterObject: { "status": 1 }, //使用tmp时的过滤
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'WORK-ITEM'//业务系统使用
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'work-item.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'work-item.list', {
                url: '/list/:action/:nursingLevelId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'work-item-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'WorkItemGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'work-item.list', {
                        modelName: 'psn-workItem',
                        searchForm: { "status": 1, customize_flag: false },
                        serverPaging: true,
                        columns: [{
                            label: '照护级别',
                            name: 'nursing_level_name',
                            type: 'string',
                            width: 80,
                            formatter: { type: 'populate', options: { path: 'nursingLevelId', select: '_id name' } }
                        }, {
                            label: '项目名称',
                            name: 'name',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '重复',
                            name: 'repeat',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '时长(分)',
                            name: 'duration',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '护工确认',
                            name: 'confirm_flag',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '提醒',
                            name: 'remind_flag',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '提醒方式',
                            name: 'remind_mode',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '提醒次数',
                            name: 'remind_times',
                            type: 'number',
                            width: 80
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }],
                        switches: { leftTree: true },
                        toDetails: ['nursingLevelId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'work-item.details', {
                url: '/details/:action/:_id/:nursingLevelId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'work-item-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'WorkItemDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'work-item.details', {
                        modelName: 'psn-workItem',
                        model: {
                            duration: 30
                        },
                        blockUI: true,
                        toList: ['nursingLevelId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-shift', {
                url: '/nursing-shift',
                title: '护理班管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'NURSING-SHIFT' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'nursing-shift.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-shift.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-shift-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingShiftGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-shift.list', {
                        modelName: 'psn-nursingShift',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '照护班简称',
                            name: 'code',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '照护班全称',
                            name: 'name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '停用',
                            name: 'stop_flag',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-shift.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-shift-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingShiftDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-shift.details', {
                        modelName: 'psn-nursingShift',
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'robot', {
                url: '/robot',
                title: '机器人管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'ROBOT' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.SHARED + 'robot.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'robot.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'robot-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RobotGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'robot.list', {
                        modelName: 'pub-robot',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '机器人编号',
                            name: 'code',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '机器人名称',
                            name: 'name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '机器人状态',
                            name: 'robot_status_name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '机器人电量',
                            name: 'power',
                            type: 'number',
                            width: 120,
                            sortable: true
                        }, {
                            label: '停用',
                            name: 'stop_flag',
                            type: 'bool',
                            width: 40
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'robot.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'robot-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RobotDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'robot.details', {
                        modelName: 'pub-robot',
                        model: { robot_status: 'A0003' },
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'bed-monitor', {
                url: '/bed-monitor',
                title: '睡眠带管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'BED-MONITOR' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.SHARED + 'bed-monitor.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'bed-monitor.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'bed-monitor-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'BedMonitorGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'bed-monitor.list', {
                        modelName: 'pub-bedMonitor',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '名称',
                            name: 'code',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '睡眠带编号',
                            name: 'name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: 'mac',
                            name: 'mac',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '设备状态',
                            name: 'device_status_name',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '停用',
                            name: 'stop_flag',
                            type: 'bool',
                            width: 40
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'bed-monitor.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'bed-monitor-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'BedMonitorDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'bed-monitor.details', {
                        modelName: 'pub-bedMonitor',
                        model: { device_status: 'A0003' },
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'room', {
                url: '/room',
                title: '房间管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {

                    selectFilterObject: { "districts": { "status": 1 } },
                    treeFilterObject: { "status": 1 }, //使用tmp时的过滤
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'ROOM'//业务系统使用
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'room.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'room.list', {
                url: '/list/:action/:districtId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'room-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RoomGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'room.list', {
                        modelName: 'psn-room',
                        searchForm: { "status": 1 },
                        transTo: {
                            "roomConfig": MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'room.config'
                        },
                        serverPaging: true,
                        // populates: [{path:'nursing_workers', select:'-_id name'}, {path:'robots', select:'-_id name'}],
                        columns: [{
                            label: '片区',
                            name: 'districtId',
                            type: 'string',
                            width: 80,
                            //sortable: true,
                            formatter: 'model-related:psn-district'
                        }, {
                            label: '房间名称',
                            name: 'name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '所在层',
                            name: 'floor',
                            type: 'number',
                            width: 60,
                            sortable: true
                        }, {
                            label: '床位数量',
                            name: 'capacity',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '停用',
                            name: 'stop_flag',
                            type: 'bool',
                            width: 40
                        }, {
                            label: '机器人',
                            name: 'robots',
                            type: 'string',
                            width: 120,
                            formatter: { type: 'populate', options: { path: 'robots', select: '-_id name' } }
                        }, {
                            label: '睡眠带',
                            name: 'bedMonitors',
                            type: 'string',
                            width: 120,
                            formatter: { type: 'populate', options: { path: 'bedMonitors.bedMonitorId', select: '-_id name' } }
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }],
                        switches: { leftTree: true },
                        toDetails: ['districtId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'room.details', {
                url: '/details/:action/:_id/:districtId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'room-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RoomDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'room.details', {
                        modelName: 'psn-room',
                        model: {
                            capacity: 1
                        },
                        blockUI: true,
                        toList: ['districtId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'room.details-batch-add', {
                url: '/details-batch-add/:districtId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'room-details-batch-add.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RoomDetailsBatchAddController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'room.details-batch-add', {
                        modelName: 'psn-room',
                        model: {
                            capacity: 1
                        },
                        blockUI: true,
                        toList: ['districtId']
                    }),
                    deps: helper.resolveFor2('angularjs-slider')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'room.details-batch-edit', {
                url: '/details-batch-edit/:districtId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'room-details-batch-edit.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RoomDetailsBatchEditController',
                params: { selectedIds: null },
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'room.details-batch-edit', {
                        modelName: 'psn-room',
                        model: {
                            capacity: 1
                        },
                        blockUI: true,
                        toList: ['districtId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'room.config', {
                url: '/config/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'room-config.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'RoomConfigController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'room.config', {
                        modelName: 'psn-room',
                        blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'district', {
                url: '/district',
                title: '片区管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'DISTRICT' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'district.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'district.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'district-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'DistrictGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'district.list', {
                        modelName: 'psn-district',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '片区名称',
                            name: 'name',
                            type: 'string',
                            width: 320,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'district.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'district-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'DistrictDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'district.details', {
                        modelName: 'psn-district',
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-level', {
                url: '/nursing-level',
                title: '照护级别',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'NURSING-LEVEL' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.PENSION_AGENCY + 'nursing-level.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-level.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-level-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingLevelGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-level.list', {
                        modelName: 'psn-nursingLevel',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '评估等级',
                            name: 'nursing_assessment_grade_name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '全称',
                            name: 'name',
                            type: 'string',
                            width: 80,
                            sortable: true
                        }, {
                            label: '简称',
                            name: 'name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '停用',
                            name: 'stop_flag',
                            type: 'bool',
                            width: 80
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'nursing-level.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.PENSION_AGENCY + 'nursing-level-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: 'NursingLevelDetailsController',
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'nursing-level.details', {
                        modelName: 'psn-nursingLevel',
                        blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'charge-standard', {
                url: '/charge-standard',
                title: '收费标准',
                access_level: AUTH_ACCESS_LEVELS.USER,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'charge-standard.html'),
                        controller: 'ChargeStandardController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'charge-standard'),
                            deps: helper.resolveFor2('angularjs-slider')
                        }
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'CHARGE-STANDARD' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.SHARED + 'charge-standard.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'charge-item-customized', {
                url: '/charge-item-customized',
                title: '特色服务',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'CHARGE-ITEM-CUSTOMIZED' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.SHARED + 'charge-item-customized.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'charge-item-customized.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'charge-item-customized-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.ChargeItemCustomizedGrid,
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'charge-item-customized.list', {
                        modelName: 'pub-tenantChargeItemCustomized',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '服务名称',
                            name: 'name',
                            type: 'string',
                            width: 200,
                            sortable: true
                        }, {
                            label: '子系统',
                            name: 'subsystem',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '备注',
                            name: 'remark',
                            type: 'string',
                            width: 180
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'charge-item-customized.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'charge-item-customized-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.ChargeItemCustomizedDetails,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'charge-item-customized.details', {
                        modelName: 'pub-tenantChargeItemCustomized',
                        model: {
                            subsystem: MODEL_VARIABLES.SUBSYSTEM_NAMES.PENSION_AGENCY,
                            catagory: MODEL_VARIABLES.PRE_DEFINED.SERVER_GEN
                        },
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'user-manage', {
                url: '/user-manage',
                title: '用户管理',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'USER-MANAGE' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.SHARED + 'user-manage.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'user-manage.list', {
                url: '/list/:action/:roles',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'user-manage-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.USER_MANAGE_GRID,
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'user-manage.list', {
                        modelName: 'pub-user',
                        searchForm: { "status": 1, "type": 'A0002' }, //user.type Web商城用户
                        serverPaging: true,
                        columns: [{
                            label: '用户编码',
                            name: 'code',
                            type: 'string',
                            width: 120,
                            sortable: true
                        }, {
                            label: '用户名称',
                            name: 'name',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '手机号码',
                            name: 'phone',
                            type: 'string',
                            width: 60,
                            sortable: true
                        }, {
                            label: '停用',
                            name: 'stop_flag',
                            type: 'bool',
                            width: 40
                        }, {
                            label: '角色',
                            name: 'roles',
                            type: 'string',
                            width: 120,
                            formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1001/object')
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }],
                        switches: { leftTree: true },
                        toDetails: ['roles']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'user-manage.details', {
                url: '/details/:action/:_id/:roles',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'user-manage-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.USER_MANAGE_DETAILS,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'user-manage.details', {
                        modelName: 'pub-user',
                        model: { type: 'A0002' },
                        blockUI: true,
                        toList: ['roles']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'wxa-config', {
                url: '/wxa-config',
                title: '微信小程序*',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'WXA-CONFIG' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.SHARED + 'wxa-config.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'wxa-config.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'wxa-config-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.WXACONFIG_GRID,
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'wxa-config.list', {
                        modelName: 'pub-wxaConfig',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        blockUI: true,
                        columns: [{
                            label: 'appid',
                            name: 'app_id',
                            sortable: false,
                            width: 120
                        }, {
                            label: 'app名称',
                            name: 'app_name',
                            type: 'string',
                            width: 240,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'wxa-config.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'wxa-config-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.WXACONFIG_DETAILS,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'wxa-config.details', {
                        modelName: 'pub-wxaConfig',
                        model: { templates: [] },
                        blockUI: true
                    }),
                    deps: helper.resolveFor2('qiniu', 'qiniu-ng')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'other-config', {
                url: '/other-config',
                title: '其它配置',
                access_level: AUTH_ACCESS_LEVELS.USER,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.PENSION_AGENCY),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER_FOR_TENANT
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'other-config.html'),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.OTHERCONFIG_GRID,
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'other-config', {
                                modelName: 'psn-tenant',
                                searchForm: { "status": 1 }
                            })
                        }
                    }
                },
                data: {
                    func_id: MODEL_VARIABLES.BIZ_FUNC_PREFIXS.PENSION_AGENCY + 'OTHER-CONFIG' //业务系统使用
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.SHARED + 'other-config.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'other-config.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'other-config-list.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.OTHERCONFIG_GRID,
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'other-config.list', {
                        modelName: 'pub-tenant',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        blockUI: true,
                        columns: [{
                            label: '睡眠带超时时间(分钟)',
                            name: 'other_config.psn_bed_monitor_timeout',
                            type: 'string',
                            width: 320,
                            sortable: true
                        }, {
                            label: '',
                            name: 'actions',
                            sortable: false,
                            width: 60
                        }]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.PENSION_AGENCY + 'other-config.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.SHARED + 'other-config-details.html'),
                access_level: AUTH_ACCESS_LEVELS.USER,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.OTHERCONFIG_DETAILS,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.PENSION_AGENCY + 'other-config.details', {
                        modelName: 'pub-tenant',
                        model: {},
                        blockUI: true
                    }),
                }
            });

    } // routesConfig

})();
