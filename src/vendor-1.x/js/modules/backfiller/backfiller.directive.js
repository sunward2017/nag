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
            scope: {nameInput:'@', valInput:'@', readonly:'=', pickIcon:"@", fetchData: '=', onSelect: '&', model: '=ngModel'}
        };
        return directive;

        function link(scope, element, attrs) {

            var data = scope.fetchData;
            if (!data) {
                return;
            }
            var option = scope.$eval(attrs.option) || {};
            var selectItemFormat = option.selectItemFormat || 'id';
            var valueKey = scope.valueKey = option.valueKey || 'id';
            var textKey =  scope.textKey = option.textKey || 'name';

            scope.icon = scope.pickIcon || 'glyphicon-search';

            console.log('scope.pickIcon',scope.pickIcon);
            

            scope.$watch("fetchData",function(newValue,oldValue) {
                if (newValue != oldValue) {
                    $timeout(function () {
                        $q.when(newValue).then(function (items) {
                            scope.items = items;
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

                console.log('open pick dialog...')
                ngDialog.open({
                    template: 'backfiller-default-pick.html',
                    controller: 'BackfillerDefaultPickController',
                }).closePromise.then(function (ret) {
                    if(ret.value!='$document' && ret.value!='$closeButton' && ret.value!='$escape' ) {
                        console.log(ret.value);
                        var item = ret.value;
                        scope.model = selectItemFormat == 'object' ? item : item[valueKey];
                        if (scope.onSelect) {
                            $timeout(function () {
                                scope.onSelect({item: item});
                            }, 0);
                        }
                    }
                });

            };

            $q.when(data).then(function (items) {
                scope.items = items;
                console.log('backfiller:',scope.items);
                setShowText();
            });



            function setShowText() {
                scope.text = '';
                if (scope.items) {
                    for (var i = 0; i < scope.items.length; i++) {
                        if (selectItemFormat == 'object') {
                            if (scope.model && scope.items[i] == scope.model) { //|| (valueKey && scope.items[i][valueKey] == scope.model[valueKey])
                                scope.text = scope.items[i][textKey];
                                break;
                            }
                        }
                        else {
                            if (scope.items[i][valueKey] == scope.model) {
                                scope.text = scope.items[i][textKey];
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

})();
