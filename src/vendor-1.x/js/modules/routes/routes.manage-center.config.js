/**=========================================================
 * Module: config.js
 * App routes and resources configuration
 =========================================================*/


(function() {
    'use strict';

    angular
        .module('app.routes')
        .config(routesManageCenterConfig);

    routesManageCenterConfig.$inject = ['$stateProvider', 'RouteHelpersProvider', 'AUTH_ACCESS_LEVELS','MODEL_VARIABLES'];
    function routesManageCenterConfig($stateProvider, helper, AUTH_ACCESS_LEVELS,MODEL_VARIABLES) {


        // 管理中心开始
        $stateProvider
            .state(MODEL_VARIABLES.STATE_PREFIXS.ROOT + MODEL_VARIABLES.SUBSYSTEM_NAMES.MANAGE_CENTER, {
                url: '/manage-center',
                abstract: true,
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                //template: '<div class="data-ui-view subsystem-wrapper"></div>',
                template: '<div class="module-header-wrapper" data-ui-view="module-header"></div><div class="module-content-wrapper" data-ui-view="module-content"></div><div class="clearfix"></div>',
                resolve: {
                    vmh: helper.buildVMHelper()
                    , deps: helper.resolveFor2(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER)
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'dashboard', {
                url: '/dashboard',
                title: '数据面板',
                access_level: AUTH_ACCESS_LEVELS.USER,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'dashboard.html'),
                        controller: 'DashboardManageCenterController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'dashboard')
                        }
                    }
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'dashboard.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-account-manage', {
                url: '/tenant-account-manage',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    selectFilterObject: {"type": ['A0000', 'A0001', 'A0002', 'A0003']}
                }
                ,resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'tenant-account-manage.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-account-manage.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-account-manage-list.html'),//复用页面
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.GRID,
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'tenant-account-manage.list', {
                        modelName: 'pub-tenant',
                        searchForm: {"type": {"$in": ['A0000','A0001', 'A0002', 'A0003']}},
                        transTo: {
                            "user": MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-user-manage.list',
                            "openFuncs": MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-open-funcs',
                            "order":MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-order-manage.list'
                        },
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        columns: [
                            {
                                label: '租户名称',
                                name: 'name',
                                type: 'string',
                                width: 200,
                                sortable: true
                            },
                            {
                                label: '有效期至',
                                name: 'validate_util',
                                type: 'date',
                                width: 80
                            },
                            {
                                label: '开通',
                                name: 'active_flag',
                                type: 'bool',
                                width: 40
                            },
                            {
                                label: '认证',
                                name: 'certificate_flag',
                                type: 'bool',
                                width: 40
                            },
                            {
                                label: '手机号码',
                                name: 'phone',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '邮箱地址',
                                name: 'email',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '类型',
                                name: 'type',
                                type: 'string',
                                sortable: true,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1002/object')
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 80
                            }
                        ]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-account-manage.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-account-manage-details.html'),
                controller: 'TenantAccountManageDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'tenant-account-manage.details', {
                        modelName: 'pub-tenant',
                        model: {
                            limit_to: 0
                        }
                        , blockUI: true
                    }),
                    deps: helper.resolveFor2('qiniu', 'qiniu-ng')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-user-manage', {
                url: '/tenant-user-manage',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {

                    selectFilterObject: {"tenants": {"type": {"$in": ['A0000','A0001', 'A0002', 'A0003']}}},
                    //treeFilterObject: {"type": ['A0001', 'A0002', 'A0003']}//使用tmg时的过滤 treeFilter[key]==treeNode[key]
                    treeFilterObject: {"type": {"$in": ['A0000','A0001', 'A0002', 'A0003']}} //使用tmp时的过滤
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'tenant-user-manage.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-user-manage.list', {
                url: '/list/:action/:tenantId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-user-manage-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'TenantUserManageGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'tenant-user-manage.list', {
                        modelName: 'pub-user',
                        searchForm: {"status": 1,"type": 'A0002'},//user.type 养老机构用户
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        columns: [
                            {
                                label: '所属',
                                name: 'tenantId',
                                type: 'string',
                                width: 120,
                                //sortable: true,
                                formatter: 'model-related:pub-tenant'
                            },
                            {
                                label: '用户编码',
                                name: 'code',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '用户名称',
                                name: 'name',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '手机号码',
                                name: 'phone',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '停用',
                                name: 'stop_flag',
                                type: 'bool',
                                width: 40
                            },
                            {
                                label: '类型',
                                name: 'type',
                                type: 'string',
                                sortable: true,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1000/object')
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ],
                        switches: {leftTree: true},
                        toDetails: ['tenantId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-user-manage.details', {
                url: '/details/:action/:_id/:tenantId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-user-manage-details.html'),
                controller: 'TenantUserManageDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'tenant-user-manage.details', {
                        modelName: 'pub-user',
                        model: {type:'A0002'},
                        blockUI: true,
                        toList: ['tenantId']
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-open-funcs', {
                url: '/tenant-open-funcs/:tenantId',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'func.html'),
                        controller: 'FuncController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'tenant-open-funcs'),
                            deps: helper.resolveFor2('angularjs-slider')
                        }
                    }
                },
                data: {
                    selectFilterObject: {"tenants": {"type": {"$in": ['A0000','A0001', 'A0002', 'A0003']}}}
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'func.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-order-manage', {
                url: '/tenant-order-manage',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {

                    selectFilterObject: {"tenants": {"type": {"$in": ['A0000', 'A0001', 'A0002', 'A0003']}}},
                    //treeFilterObject: {"type": ['A0001', 'A0002', 'A0003']}//使用tmg时的过滤 treeFilter[key]==treeNode[key]
                    treeFilterObject: {"type": {"$in": ['A0000', 'A0001', 'A0002', 'A0003']}} //使用tmp时的过滤
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'tenant-order-manage.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-order-manage.list', {
                url: '/list/:action/:tenantId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-order-manage-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'TenantOrderManageGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'tenant-order-manage.list', {
                        modelName: 'pub-order',
                        searchForm: {"type": 'TP'},//养老机构产生的订单
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        rowHeight: 60,
                        columns: [
                            {
                                label: '所属',
                                name: 'tenantId',
                                type: 'string',
                                width: 120,
                                //sortable: true,
                                formatter: 'model-related:pub-tenant'
                            },
                            {
                                label: '订单编号',
                                name: 'full_code',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '下单时间',
                                name: 'check_in_time',
                                type: 'date',
                                width: 80,
                                sortable: true
                            },
                            {
                                label: '开通时间',
                                name: 'success_on',
                                type: 'date',
                                width: 80,
                                sortable: true
                            },
                            {
                                label: '单价',
                                name: 'period_charge',
                                type: 'currency',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '数量(月)',
                                name: 'duration',
                                type: 'number',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '总价',
                                name: 'total_charge',
                                type: 'currency',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '订单状态',
                                name: 'order_status',
                                type: 'string',
                                sortable: true,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1005/object')
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ],
                        switches: {leftTree: true},
                        toDetails: ['tenantId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-order-manage.details', {
                url: '/details/:action/:_id/:tenantId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-order-manage-details.html'),
                controller: 'TenantOrderManageDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'tenant-order-manage.details', {
                        modelName: 'pub-order',
                        model: {
                            code: MODEL_VARIABLES.PRE_DEFINED.SERVER_GEN,
                            type: 'TP',
                            period_charge: 0,
                            duration: 1
                        },
                        blockUI: true,
                        toList: ['tenantId']
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-account-manage', {
                url: '/agent-account-manage',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    selectFilterObject: {"type": ['A1001', 'A1002']}
                }
                ,resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'tenant-account-manage.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-account-manage.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-account-manage-list.html'),//复用页面
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.GRID,
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'agent-account-manage.list', {
                        modelName: 'pub-tenant',
                        searchForm: {"type": {"$in": ['A1001', 'A1002']}},
                        transTo: {
                            "user": MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-user-manage.list',
                            "openFuncs": MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-open-funcs',
                            "order": MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-order-manage.list'
                        },
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        columns: [
                            {
                                label: '代理商名称',
                                name: 'name',
                                type: 'string',
                                width: 200,
                                sortable: true
                            },
                            {
                                label: '有效期至',
                                name: 'validate_util',
                                type: 'date',
                                width: 80
                            },
                            {
                                label: '开通',
                                name: 'active_flag',
                                type: 'bool',
                                width: 40
                            },
                            {
                                label: '认证',
                                name: 'certificate_flag',
                                type: 'bool',
                                width: 40
                            },
                            {
                                label: '手机号码',
                                name: 'phone',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '邮箱地址',
                                name: 'email',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '类型',
                                name: 'type',
                                type: 'string',
                                sortable: true,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1002/object')
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 80
                            }
                        ]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-account-manage.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-account-manage-details.html'),
                controller: 'TenantAccountManageDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'agent-account-manage.details', {
                        modelName: 'pub-tenant',
                        model: {
                            limit_to: 0
                        }
                        , blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-user-manage', {
                url: '/agent-user-manage',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    //selectFilterObject: {"type": ['A1001', 'A1002']},
                    selectFilterObject: {"tenants": {"type": {"$in": ['A1001', 'A1002']}}},//tenant.type
                    //treeFilterObject: {"type": ['A1001', 'A1002']}//使用tmg时的过滤 treeFilter[key]==treeNode[key]
                    treeFilterObject: {"type": {"$in": ['A1001', 'A1002']}} //使用tmp时的过滤
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'tenant-user-manage.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-user-manage.list', {
                url: '/list/:action/:tenantId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-user-manage-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'TenantUserManageGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'agent-user-manage.list', {
                        modelName: 'pub-user',
                        searchForm: {"status": 1,"type": 'A0003'},//user.type 代理商用户
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        columns: [
                            {
                                label: '所属',
                                name: 'tenantId',
                                type: 'string',
                                width: 120,
                                //sortable: true,
                                formatter: 'model-related:pub-tenant'
                            },
                            {
                                label: '用户编码',
                                name: 'code',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '用户名称',
                                name: 'name',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '手机号码',
                                name: 'phone',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '停用',
                                name: 'stop_flag',
                                type: 'bool',
                                width: 40
                            },
                            {
                                label: '类型',
                                name: 'type',
                                type: 'string',
                                sortable: true,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1000/object')
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ],
                        switches: {leftTree: true},
                        toDetails: ['tenantId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-user-manage.details', {
                url: '/details/:action/:_id/:tenantId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-user-manage-details.html'),
                controller: 'TenantUserManageDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'agent-user-manage.details', {
                        modelName: 'pub-user',
                        model: {type: 'A0003'},//D1000
                        blockUI: true,
                        toList: ['tenantId']
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-open-funcs', {
                url: '/agent-open-funcs/:tenantId',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'func.html'),
                        controller: 'FuncController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'agent-open-funcs'),
                            deps: helper.resolveFor2('angularjs-slider')
                        }
                    }
                },
                data: {
                    selectFilterObject: {"tenants": {"type": {"$in": ['A1001', 'A1002']}}}
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'func.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-order-manage', {
                url: '/agent-order-manage',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                data: {
                    selectFilterObject: {"tenants": {"type": {"$in": ['A1001', 'A1002']}}},
                    //treeFilterObject: {"type": ['A1001', 'A1002']}//使用tmg时的过滤 treeFilter[key]==treeNode[key]
                    treeFilterObject: {"type": {"$in": ['A1001', 'A1002']}} //使用tmp时的过滤
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'tenant-order-manage.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-order-manage.list', {
                url: '/list/:action/:tenantId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-order-manage-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'TenantOrderManageGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'agent-order-manage.list', {
                        modelName: 'pub-order',
                        searchForm: {"type": 'TA'},//代理产生的订单
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        rowHeight: 60,
                        columns: [
                            {
                                label: '所属',
                                name: 'tenantId',
                                type: 'string',
                                width: 120,
                                //sortable: true,
                                formatter: 'model-related:pub-tenant'
                            },
                            {
                                label: '订单编号',
                                name: 'full_code',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '下单时间',
                                name: 'check_in_time',
                                type: 'date',
                                width: 80
                            },
                            {
                                label: '开通时间',
                                name: 'success_on',
                                type: 'date',
                                width: 80
                            },
                            {
                                label: '单价',
                                name: 'period_charge',
                                type: 'currency',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '数量(月)',
                                name: 'duration',
                                type: 'number',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '总价',
                                name: 'total_charge',
                                type: 'currency',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '订单状态',
                                name: 'order_status',
                                type: 'string',
                                sortable: true,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1005/object')
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ],
                        switches: {leftTree: true},
                        toDetails: ['tenantId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-order-manage.details', {
                url: '/details/:action/:_id/:tenantId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-order-manage-details.html'),
                controller: 'TenantOrderManageDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'agent-order-manage.details', {
                        modelName: 'pub-order',
                        model: {
                            code: MODEL_VARIABLES.PRE_DEFINED.SERVER_GEN,
                            type: 'TA',
                            period_charge: 0,
                            duration: 1
                        },
                        blockUI: true,
                        toList: ['tenantId']
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'job-status', {
                url: '/job-status',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'job-status.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'job-status.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'job-status-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'JobStatusGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'job-status.list', {
                        modelName: 'pub-jobStatus',
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        columns: [
                            {
                                label: '停用',
                                name: 'stop_flag',
                                type: 'bool',
                                width: 40
                            },
                            {
                                label: '作业编号',
                                name: 'job_id',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '作业名称',
                                name: 'job_name',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '作业规则',
                                name: 'job_rule',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '最后执行',
                                name: 'last_exec_on',
                                type: 'date',
                                width: 80,
                                sortable: true
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'job-status.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'job-status-details.html'),
                controller: 'JobStatusDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'job-status.details', {
                        modelName: 'pub-jobStatus',
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'platform-user-manage', {
                url: '/platform-user-manage',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'tenant-user-manage.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'platform-user-manage.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-user-manage-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'TenantUserManageGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'platform-user-manage.list', {
                        modelName: 'pub-user',
                        searchForm: {"status": 1,"type": 'A0001'},//user.type 平台用户
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        columns: [
                            {
                                label: '所属',
                                name: 'tenantId',
                                type: 'string',
                                width: 120,
                                hidden: true
                            },
                            {
                                label: '用户编码',
                                name: 'code',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '用户名称',
                                name: 'name',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '手机号码',
                                name: 'phone',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '停用',
                                name: 'stop_flag',
                                type: 'bool',
                                width: 40
                            },
                            {
                                label: '类型',
                                name: 'type',
                                type: 'string',
                                sortable: true,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1000/object')
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'platform-user-manage.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'tenant-user-manage-details.html'),
                controller: 'TenantUserManageDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'platform-user-manage.details', {
                        modelName: 'pub-user',
                        model: {type: 'A0001'},//D1000
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'func', {
                url: '/func',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'func.html'),
                        controller: 'FuncController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'func'),
                            deps: helper.resolveFor2('angularjs-slider')
                        }
                    }
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'func.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'order-receipt-confirmation', {
                url: '/order-receipt-confirmation',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'order-receipt-confirmation.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'order-receipt-confirmation.list', {
                url: '/list/:action/:tenantId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'order-receipt-confirmation-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'OrderReceiptConfirmationGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'order-receipt-confirmation.list', {
                        modelName: 'pub-order',
                        searchForm: {"order_status": {"$in": ['A1002', 'A1003', 'A1004']}},//等待客户付款,财务确认收款,交易成功
                        transTo: {
                            "TP": MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-order-manage.details',
                            "TA": MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-order-manage.details'
                        },
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        rowHeight: 60,
                        columns: [
                            {
                                label: '所属',
                                name: 'tenantId',
                                type: 'string',
                                width: 120,
                                //sortable: true,
                                formatter: 'model-related:pub-tenant'
                            },
                            {
                                label: '订单编号',
                                name: 'full_code',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '下单时间',
                                name: 'check_in_time',
                                type: 'date',
                                width: 80
                            },
                            {
                                label: '开通时间',
                                name: 'success_on',
                                type: 'date',
                                width: 80
                            },
                            {
                                label: '单价',
                                name: 'period_charge',
                                type: 'currency',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '数量(月)',
                                name: 'duration',
                                type: 'number',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '总价',
                                name: 'total_charge',
                                type: 'currency',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '订单状态',
                                name: 'order_status',
                                type: 'string',
                                sortable: true,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1005/object')
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ],
                        switches: {leftTree: true},
                        toDetails: ['tenantId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'order-refund-confirmation', {
                url: '/order-refund-confirmation',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'order-refund-confirmation.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'order-refund-confirmation.list', {
                url: '/list/:action/:tenantId',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'order-refund-confirmation-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'OrderRefundConfirmationGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'order-refund-confirmation.list', {
                        modelName: 'pub-order',
                        searchForm: {"order_status": {"$in": ['A1006', 'A1007']}},//等待退款,退款成功
                        transTo: {
                            "TP": MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'tenant-order-manage.details',
                            "TA": MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'agent-order-manage.details'
                        },
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        rowHeight: 60,
                        columns: [
                            {
                                label: '所属',
                                name: 'tenantId',
                                type: 'string',
                                width: 120,
                                //sortable: true,
                                formatter: 'model-related:pub-tenant'
                            },
                            {
                                label: '订单编号',
                                name: 'full_code',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '下单时间',
                                name: 'check_in_time',
                                type: 'date',
                                width: 80
                            },
                            {
                                label: '开通时间',
                                name: 'success_on',
                                type: 'date',
                                width: 80
                            },
                            {
                                label: '单价',
                                name: 'period_charge',
                                type: 'currency',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '数量(月)',
                                name: 'duration',
                                type: 'number',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '总价',
                                name: 'total_charge',
                                type: 'currency',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '订单状态',
                                name: 'order_status',
                                type: 'string',
                                sortable: true,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D1005/object')
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ],
                        switches: {leftTree: true},
                        toDetails: ['tenantId']
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'app-serverside-update', {
                url: '/app-serverside-update',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'app-serverside-update.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'app-serverside-update.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'app-serverside-update-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'AppServerSideUpdateGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'app-serverside-update.list', {
                        modelName: 'pub-appServerSideUpdateHistory',
                        searchForm: {app_id: 'A0001'},
                        sortColumn: 'ver_order',
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        columns: [
                            {
                                label: 'App哈希',
                                name: '_id',
                                type: 'string',
                                width: 120,
                                sortable: false
                            },
                            {
                                label: '更新时间',
                                name: 'check_in_time',
                                type: 'date',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: 'App编号',
                                name: 'app_id',
                                type: 'string',
                                sortable: true,
                                width: 80,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D0102/object')
                            },
                            {
                                label: '版本',
                                name: 'ver',
                                type: 'string',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '版本排序',
                                name: 'ver_order',
                                type: 'number',
                                width: 80,
                                sortable: true
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'app-serverside-update.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'app-serverside-update-details.html'),
                controller: 'AppServerSideUpdateDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'app-serverside-update.details', {
                        modelName: 'pub-appServerSideUpdateHistory',
                        model: {app_id: 'A0001'},
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'app-clientside-update', {
                url: '/app-clientside-update',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'app-clientside-update.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'app-clientside-update.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'app-clientside-update-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'AppClientSideUpdateGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'app-clientside-update.list', {
                        modelName: 'pub-appClientSideUpdateHistory',
                        searchForm: {app_id: 'A0001'},
                        sortColumn: 'ver_order',
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        columns: [
                            {
                                label: 'App哈希',
                                name: '_id',
                                type: 'string',
                                width: 120,
                                sortable: false
                            },
                            {
                                label: '更新时间',
                                name: 'check_in_time',
                                type: 'date',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: 'App编号',
                                name: 'app_id',
                                type: 'string',
                                sortable: true,
                                width: 80,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D0102/object')
                            },
                            {
                                label: '系统',
                                name: 'os',
                                type: 'string',
                                sortable: true,
                                width: 60,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D0101/object')
                            },
                            {
                                label: '版本',
                                name: 'ver',
                                type: 'string',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '版本排序',
                                name: 'ver_order',
                                type: 'number',
                                width: 60,
                                sortable: true
                            },
                            {
                                label: '强制更新',
                                name: 'force_update_flag',
                                type: 'bool',
                                width: 60
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'app-clientside-update.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'app-clientside-update-details.html'),
                controller: 'AppClientSideUpdateDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'app-clientside-update.details', {
                        modelName: 'pub-appClientSideUpdateHistory',
                        model: {app_id: 'A0001'},
                        blockUI: true
                    })
                    //, deps: helper.resolveFor2('ui.select')
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'device-access', {
                url: '/device-access',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                }
                // , resolve: helper.resolveFor('subsystem.manage-center.device-access.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'device-access.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'device-access-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: MODEL_VARIABLES.CONTROLLER_NAMES.GRID,
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'device-access.list', {
                        modelName: 'pub-deviceAccess',
                        //切换客户端还是服务端分页
                        serverPaging: true,
                        columns: [
                            {
                                label: '设备编号',
                                name: 'uuid',
                                type: 'string',
                                width: 120,
                                sortable: false
                            },
                            {
                                label: 'App编号',
                                name: 'app_id',
                                type: 'string',
                                sortable: true,
                                width: 120,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D0102/object')
                            },
                            {
                                label: '访问时间',
                                name: 'access_on',
                                type: 'date',
                                width: 80,
                                sortable: true
                            },
                            {
                                label: '平台',
                                name: 'platform',
                                type: 'string',
                                sortable: true,
                                width: 120,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D0100/object')
                            },
                            {
                                label: '系统',
                                name: 'os',
                                type: 'string',
                                sortable: true,
                                width: 120,
                                formatter: 'dictionary-remote:' + helper.remoteServiceUrl('share/dictionary/D0101/object')
                            },
                            {
                                label: '版本',
                                name: 'ver',
                                type: 'string',
                                width: 120,
                                sortable: true
                            },
                            {
                                label: '',
                                name: 'actions',
                                sortable: false,
                                width: 60
                            }
                        ]
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'drug', {
                url: '/drug',
                title: '药品',
                abstract: true,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        template: '<div class="data-ui-view"></div><div class="clearfix"></div>'
                    }
                },
                resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'drug.js')
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'drug.list', {
                url: '/list/:action',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'drug-list.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                controller: 'DrugGridController',
                resolve: {
                    entryVM: helper.buildEntryVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'drug.list', {
                        modelName: 'pub-drug',
                        searchForm: { "status": 1 },
                        serverPaging: true,
                        columns: [{
                            label: '条形码',
                            name: 'barcode',
                            type: 'string',
                            width: 100,
                            sortable: true
                        }, {
                            label: '药品名称',
                            name: 'name',
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
                            name: 'medical_insurance_flag',
                            type: 'bool',
                            width: 40,
                            sortable: true
                        }, {
                            label: '参考价',
                            name: 'reference_price',
                            type: 'number',
                            width: 50,
                            sortable: true
                        }, {
                            label: '规格',
                            name: 'specification',
                            type: 'string',
                            width: 120,
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
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'drug.details', {
                url: '/details/:action/:_id',
                templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'drug-details.html'),
                controller: 'DrugDetailsController',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                resolve: {
                    entityVM: helper.buildEntityVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'drug.details', {
                        modelName: 'pub-drug',
                        blockUI: true
                    })
                }
            })
            .state(MODEL_VARIABLES.STATE_PREFIXS.MANAGE_CENTER + 'data-clear', {
                url: '/data-clear',
                access_level: AUTH_ACCESS_LEVELS.ADMIN,
                views: {
                    "module-header": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.HEAD_TEMPLATES.MANAGE_CENTER),
                        controller: MODEL_VARIABLES.CONTROLLER_NAMES.MODULE_HEADER
                    },
                    "module-content": {
                        templateUrl: helper.basepath(MODEL_VARIABLES.CONTENT_TEMPLATES.MANAGE_CENTER + 'data-clear.html'),
                        controller: 'DataClearController',
                        resolve: {
                            instanceVM: helper.buildInstanceVM(MODEL_VARIABLES.VM_PREFIXS.MANAGE_CENTER + 'data-clear')
                        }
                    }
                }
                , resolve: helper.resolveFor(MODEL_VARIABLES.RES_PREFIXS.MANAGE_CENTER + 'data-clear.js')
            })
            .state('app.manage-center.metadata-dictionary-manage', {
                url: '/metadata-dictionary-manage',
                title: '字典管理',
                templateUrl: helper.basepath('manage-center/metadata-dictionary-manage.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN
            })
            .state('app.manage-center.metadata-param', {
                url: '/metadata-param',
                title: '系统参数',
                templateUrl: helper.basepath('manage-center/metadata-param.html'),
                access_level: AUTH_ACCESS_LEVELS.ADMIN
            })
        ;

    } // routesConfig

})();

