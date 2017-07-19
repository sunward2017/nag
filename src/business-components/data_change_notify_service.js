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

                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e);
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
                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e);
            }
        }).catch(self.ctx.coOnError);
    },
    psn$nurse$$disabled: function (id) {
        var self = this;
        return co(function *() {
            try {
                // console.log('id:', id);
                yield self.ctx.modelFactory().model_update(self.ctx.models['pub_user'], id, { status: 0 });
                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e);
            }
        }).catch(self.ctx.coOnError);
    },
    pub$robot$$disabled: function (id, params) {
        var self = this;
        return co(function *() {
            try {
                // console.log('id:', id);
                // console.log('params:', params);
                var rooms = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_room'], {
                    select: 'robots',
                    where: {
                        tenantId: params.tenantId,
                        robots: {$elemMatch: {$eq: id }}
                    }
                });

                console.log('rooms:', rooms);

                var room, robots, index;
                for(var i=0,len = rooms.length;i<len;i++) {
                    room = rooms[i], robots = room.robots;
                    index = self.ctx._.findIndex(robots, (o)=> {
                        return o.toString() == id;
                    });
                    robots.splice(index,1);
                    yield room.save();
                }

                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e);
            }
        }).catch(self.ctx.coOnError);
    },
    pub$bedMonitor$$disabled: function (id, params) {
        var self = this;
        return co(function *() {
            try {
                console.log('id:', id);
                console.log('params:', params);
                var rooms = yield self.ctx.modelFactory().model_query(self.ctx.models['psn_room'], {
                    select: 'bedMonitors',
                    where: {
                        tenantId: params.tenantId,
                        bedMonitors: {$elemMatch: {bedMonitorId: id }}
                    }
                });

                console.log('rooms:', rooms);

                var room, bedMonitors, index;
                for(var i=0,len = rooms.length;i<len;i++) {
                    room = rooms[i], bedMonitors = room.bedMonitors;
                    index = self.ctx._.findIndex(bedMonitors, (o)=> {
                        return o.bedMonitorId.toString() == id;
                    });
                    bedMonitors.splice(index,1);
                    yield room.save();
                }

                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e);
            }
        }).catch(self.ctx.coOnError);
    },
    psn$drugDirectory$$syncToPubDrug: function (id) {
        var self = this;
        return co(function *() {
            try {
                console.log('psn$drugDirectory$$syncToPubDrug:', id);
                var drugDirectory, drug;
                drugDirectory = yield self.ctx.modelFactory().model_read(self.ctx.models['psn_drugDirectory'], id);
                if (!drugDirectory || drugDirectory.status == 0) {
                    return self.ctx.wrapper.res.error({message: '无效的本地药品目录'});
                }
                drug = yield self.ctx.modelFactory().model_one(self.ctx.models['pub_drug'], {
                    where:{
                        barcode: drugDirectory.barcode,
                        status: 1
                    }
                });
                console.log('drug:', drug);
                if (!drug) {
                    // 添加到远程库
                    if(drugDirectory.barcode){

                        var drugData = self.ctx._.extend({}, drugDirectory.toObject(),
                            {medical_insurance_flag: !!drugDirectory.health_care_flag, name: drugDirectory.full_name }
                        );
                        console.log('drugData:', drugData)
                        drug = yield self.ctx.modelFactory().model_create(self.ctx.models['pub_drug'],drugData);
                        drugDirectory.drugSourceId = drug._id;
                        yield drugDirectory.save();
                    }
                } else {
                    // 更新到远程库
                    if (drugDirectory.img) {
                        drug.img = drugDirectory.img;
                    }
                    if (drugDirectory.full_name) {
                        drug.name = drugDirectory.full_name;
                    }
                    if (drugDirectory.dosage_form) {
                        drug.dosage_form = drugDirectory.dosage_form;
                    }
                    if (drugDirectory.short_name) {
                        drug.short_name = drugDirectory.short_name;
                    }
                    if (drugDirectory.alias) {
                        drug.alias = drugDirectory.alias;
                    }
                    if (drugDirectory.english_name) {
                        drug.english_name = drugDirectory.english_name;
                    }
                    if (drugDirectory.specification) {
                        drug.specification = drugDirectory.specification;
                    }
                    if (drugDirectory.usage) {
                        drug.usage = drugDirectory.usage;
                    }
                    if (drugDirectory.indications_function) {
                        drug.indications_function = drugDirectory.indications_function;
                    }
                    if (drugDirectory.special_individuals) {
                        drug.special_individuals = drugDirectory.special_individuals;
                    }
                    drug.otc_flag = !!drugDirectory.otc_flag;
                    drug.medical_insurance_flag = !!drugDirectory.health_care_flag;
                    yield drug.save();
                }

                return self.ctx.wrapper.res.default();
            }
            catch (e) {
                console.log(e);
                self.logger.error(e.message);
                return self.ctx.wrapper.res.error(e);
            }
        }).catch(self.ctx.coOnError);
    }
};