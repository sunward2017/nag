/**
 * Created by zppro on 17-06-27.
 */
var co = require('co');
var xlsx = require('node-xlsx').default;

module.exports = {
    init: function (ctx) {
        console.log('init sleep... ');
        var self = this;
        this.file = __filename;
        this.filename = this.file.substr(this.file.lastIndexOf('/') + 1);
        this.log_name = 'bc_' + this.filename;
        this.ctx = ctx;
        this.logger = require('log4js').getLogger(this.log_name);

        if (!this.logger) {
            console.error('logger not loaded in ' + this.file);
        }
        else {
            this.logger.info(this.file + " loaded!");
        }
        console.log(this.filename + ' ready... ');


        if (typeof Object.assign != 'function') {
            console.log('polyfill');
            Object.assign = function(target) {
                'use strict';
                if (target == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }

                target = Object(target);
                for (var index = 1; index < arguments.length; index++) {
                    var source = arguments[index];
                    if (source != null) {
                        for (var key in source) {
                            if (Object.prototype.hasOwnProperty.call(source, key)) {
                                target[key] = source[key];
                            }
                        }
                    }
                }
                return target;
            };
        } else {
            console.log('no need polyfill');
        }

        return this;
    },
    build: function (sheetName, o, header) {
        var self = this;
        return co(function*() {
            try {

                if (!self.ctx._.isArray(o)) {
                    return null;
                }
                var data = [], row, rowValue;
                data.push(header);
                for (var i = 0, len = o.length; i < len; i++) {
                    row = [];
                    for (var j = 0, jLen = header.length; j < jLen; j++) {
                        rowValue = o[i][header[j]];
                        if (self.ctx._.isObject(rowValue)) {
                            row[j] = JSON.stringify(rowValue);
                        } else {
                            row[j] = rowValue;
                        }
                    }
                    data.push(row);
                }
                return xlsx.build([{name: sheetName, data: data}]);
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }

        }).catch(self.ctx.coOnError);
    }
};