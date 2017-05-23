/**
 * Created by zppro on 17-5-23.
 */
var co = require('co');
var DIC = require('../pre-defined/dictionary-constants.json');

module.exports = {
    init: function (ctx) {
        console.log('init member service... ');
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

        return this;
    },
    psn$district$name: function (id) {
        var self = this;
        return co(function *() {
            try {
                var districts, elderlys, elderly, newDistrictName;
                if (id) {
                    districts = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_district'], {
                        select: 'name',
                        where: {
                            _id: id
                        }
                    });
                } else {
                    districts = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_district'], {
                        select: 'name',
                        where: {
                            status: 1
                        }
                    });
                }

                // console.log('districts:', districts);

                for (var i = 0, len = districts.length; i < len; i++) {
                    // 查找老人
                    elderlys = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_elderly'], {
                        select: 'room_summary',
                        where: {
                            'room_value.districtId': districts[i].id
                        }
                    });
                    newDistrictName = districts[i].name;
                    // console.log('elderlys:', elderlys);
                    for (var j = 0, lenj = elderlys.length; j < lenj; j++) {
                        elderly = elderlys[j];
                        var arr = elderly.room_summary.split('-');
                        arr[0] = newDistrictName;
                        elderly.room_summary = arr.join('-');
                        yield elderly.save();
                    }
                }
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    },
    psn$room$name: function (id) {
        var self = this;
        return co(function *() {
            try {
                var rooms, elderlys, elderly, newRoomName;
                if (id) {
                    rooms = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_room'], {
                        select: 'name',
                        where: {
                            _id: id
                        }
                    });
                } else {
                    rooms = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_room'], {
                        select: 'name',
                        where: {
                            status: 1
                        }
                    });
                }

                // console.log('districts:', districts);

                for (var i = 0, len = rooms.length; i < len; i++) {
                    // 查找老人
                    elderlys = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_elderly'], {
                        select: 'room_summary',
                        where: {
                            'room_value.roomId': rooms[i].id
                        }
                    });
                    newRoomName = rooms[i].name;
                    // console.log('elderlys:', elderlys);
                    for (var j = 0, lenj = elderlys.length; j < lenj; j++) {
                        elderly = elderlys[j];
                        var arr = elderly.room_summary.split('-');
                        arr[2] = newRoomName;
                        elderly.room_summary = arr.join('-');
                        yield elderly.save();
                    }
                }
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
            }
        }).catch(self.ctx.coOnError);
    }
};