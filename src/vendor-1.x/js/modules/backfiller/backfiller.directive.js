/**
 * utils.directive Created by zppro on 17-5-3.
 */

(function() {
    'use strict';

    angular
        .module('app.backfiller')
        .directive('backfiller', backfiller)
    ;

    backfiller.$inject = ['$q', '$timeout', 'ngDialog', 'RouteHelpers'];
    function backfiller($q, $timeout, ngDialog, helper) {


        var directive = {
            restrict: 'EA',
            templateUrl: 'backfiller-default-render.html',
            link: link,
            scope: {readonly:'=', inputName:'@', onSearch:"&", page: "=", pickerIcon: '@', pickerTitle: '@', pickerClass:'@', fetchColumns: '=', fetchRows: '=', onSelect: '&', onCompareEqual:'&', model: '=ngModel'}
        };
        return directive;

        function link(scope, element, attrs) {

            var rows = scope.fetchRows;
            if (!rows) {
                return;
            }
            var columns = scope.fetchColumns || [];
            if (!columns) {
                return;
            }

            var valueKey = scope.valueKey = attrs.valueKey || 'object';
            var textKey =  scope.textKey = attrs.textKey || 'name';
            var pickerUrl =  attrs.pickerUrl || 'dlg-backfiller-default-pick.html';
            var pickerController = attrs.pickerController || 'BackfillerDefaultPickDialogController';
            var useCustomCompareEqualFunc =  !!attrs.onCompareEqual;

            var defaultCompareEqualFunc = function compareEqual(one, other) {return one === other;};


            scope.icon = scope.pickerIcon || 'glyphicon-search';
            scope.formName = scope.inputName || 'backfiller';
            var title = scope.pickerTitle || '待选数据';
            var pickerDialogClass = scope.pickerClass || 'ngdialog-backfiller-default-picker';
            console.log('pickerDialogClass:', pickerDialogClass)

            console.log('pickerController', pickerController);

            scope.$watch("fetchRows",function(newValue,oldValue) {
                if (newValue != oldValue) {
                    $timeout(function () {
                        $q.when(newValue).then(function (rows) {
                            scope.rows = rows;
                            setShowText();
                            if(scope.notify.reloadRows) {
                                scope.notify.reloadRows(rows);
                            }
                            console.log('backfill reload rows end');
                        });
                    }, 0);
                }
            }); 

            scope.$watch("fetchColumns",function(newValue,oldValue) {
                if (newValue != oldValue) {
                    $timeout(function () {
                        $q.when(newValue).then(function (columns) {
                            scope.columns = columns;
                            console.log('backfill reload columns end');
                        });
                    }, 0);
                }
            });


            // Bring in changes from outside:
            scope.$watch('model', function(newValue,oldValue) {
                // console.log('model newValue:',newValue ,' oldValue:', oldValue);
                if (newValue != oldValue) {
                    scope.$eval(attrs.ngModel + ' = model');
                    setShowText();
                }
            });
            // Send out changes from inside:
            //scope.$watch(attrs.ngModel, function(val) {
            //    scope.model = val;
            //});

            element.on('click', function (event) {
                event.preventDefault();
            });

            scope.notify = {
                reloadRows: null
            }

            scope.pick = function () {
                if(scope.readonly) {
                   return;
                }

                if(scope.keyword) {
                    console.log('表明之前调用过keyword做过滤:', scope.keyword);
                    if (attrs.onSearch) {
                        $timeout(function () {
                            scope.onSearch({keyword: ''});
                            scope.keyword = '';
                        }, 0);
                    }
                }

                console.log('open pick dialog...');
                ngDialog.open({
                    template: pickerUrl,
                    controller: pickerController,
                    className: 'ngdialog-theme-default ' + pickerDialogClass,
                    data: {
                        title: title,
                        columns: scope.columns,
                        rows: scope.rows,
                        page: scope.page,
                        search: function (keyword) {
                            if (attrs.onSearch) {
                                $timeout(function () {
                                    scope.onSearch({keyword: keyword});
                                    scope.keyword = keyword;
                                }, 0);
                            }
                        },
                        notify: scope.notify,
                        translatePath: function (key) {
                            return pickerUrl + '.' + key;
                        }
                    },
                    resolve: {
                        vmh: helper.buildVMHelper()
                    }
                }).closePromise.then(function (ret) {
                    if(ret.value!='$document' && ret.value!='$closeButton' && ret.value!='$escape' ) {
                        console.log(ret.value);
                        var row = ret.value;
                        scope.model = valueKey == 'object' ? row : row[valueKey];
                        console.log(scope.model)
                        setShowText();
                        if (attrs.onSelect) {
                            $timeout(function () {
                                scope.onSelect({row: row});
                            }, 0);
                        }
                    }
                });

            };

            $q.when(rows).then(function (rows) {
                scope.rows = rows;
                setShowText();
            });

            $q.when(columns).then(function (columns) {
                scope.columns = columns;
            });


            function setShowText() {
                scope.text = '';
                if (scope.rows) {
                    for (var i = 0; i < scope.rows.length; i++) {
                        if (valueKey == 'object') {
                            if (scope.model) {
                                var isEqual;
                                if(useCustomCompareEqualFunc) {
                                    isEqual = scope.onCompareEqual({one: scope.rows[i], other: scope.model});
                                    console.log(isEqual);
                                } else {
                                    isEqual = defaultCompareEqualFunc(scope.rows[i], scope.model);
                                }
                                if(isEqual) {
                                    scope.text = scope.rows[i][textKey];
                                    break;
                                }
                            }
                        }
                        else {
                            if (defaultCompareEqualFunc(scope.rows[i][valueKey], scope.model)) {
                                scope.text = scope.rows[i][textKey];
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

})();
