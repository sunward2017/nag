/**
 * utils.directive Created by zppro on 17-5-3.
 */

(function() {
    'use strict';

    angular
        .module('app.backfiller')
        .directive('backfiller', backfiller)
    ;

    backfiller.$inject = ['$q', '$timeout', 'ngDialog'];
    function backfiller($q, $timeout, ngDialog) {


        var directive = {
            restrict: 'EA',
            templateUrl: 'backfiller-default-render.html',
            link: link,
            scope: {readonly:'=', inputName:'@', pickerIcon: '@', pickerTitle: '@', pickerClass:'@', fetchColumns: '=', fetchRows: '=', onSelect: '&', onCompareEqual:'&', model: '=ngModel'}
        };
        return directive;

        function link(scope, element, attrs) {

            var data = scope.fetchRows;
            if (!data) {
                return;
            }
            var columns = scope.fetchColumns || [];
            console.log('====================', columns);

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
                            console.log('backfill reload data end');
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

            scope.pick = function () {
                if(scope.readonly) {
                   return;
                }

                console.log('open pick dialog...');
                ngDialog.open({
                    template: pickerUrl,
                    controller: pickerController,
                    className: 'ngdialog-theme-default ' + pickerDialogClass,
                    data: {
                        title: title,
                        columns: columns,
                        rows: scope.rows,
                        translatePath: function (key) {
                            return pickerUrl + '.' + key;
                        }
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

            $q.when(data).then(function (rows) {
                scope.rows = rows;
                setShowText();
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
