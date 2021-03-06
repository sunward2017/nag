/**
 * idt Created by zppro on 17-2-15.
 * 养老机构接口
 */
var crypto = require('crypto');
var transliteration = require('transliteration');
var DIC = require('../pre-defined/dictionary-constants.json');

module.exports = {
  init: function (option) {
    var self = this;
    this.file = __filename;
    this.filename = this.file.substr(this.file.lastIndexOf('/') + 1);
    this.module_name = this.filename.substr(0, this.filename.lastIndexOf('.'));
    this.service_url_prefix = '/services/' + this.module_name.split('_').join('/');
    this.log_name = 'svc_' + this.filename;
    option = option || {};

    this.logger = require('log4js').getLogger(this.log_name);

    if (!this.logger) {
      console.error('logger not loaded in ' + this.file);
    } else {
      this.logger.info(this.file + " loaded!");
    }

    this.actions = [
      /**********************老人相关*****************************/
      {
        method: 'queryElderly',
        verb: 'post',
        url: this.service_url_prefix + "/q/elderly",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var keyword = this.request.body.keyword;
              var data = this.request.body.data;

              app._.extend(data.where, {
                status: 1,
                tenantId: tenantId
              });

              if (keyword) {
                var keywordReg = new RegExp(keyword);
                data.where.$or = [
                  {name: keywordReg},
                  {enter_code: keywordReg}
                ]
                if (!data.where.live_in_flag) {
                  data.where.live_in_flag = true;
                }
                if (!data.where.begin_exit_flow) {
                  data.where.begin_exit_flow = {$ne: true};
                }
              }
              console.log(data);
              var rows = yield app.modelFactory().model_query(app.models['psn_elderly'], data);
              console.log(rows);
              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'excel$eldelryPrintQRLabel',
        verb: 'post',
        url: this.service_url_prefix + "/excel/eldelryPrintQRLabel",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var file_name = this.request.body.file_name;
              var where = {
                status: 1,
                tenantId: tenantId,
                live_in_flag: true,
                begin_exit_flow: {$ne: true}
              }
              var rawRows = yield app.modelFactory().model_query(app.models['psn_elderly'], {
                select: 'name avatar enter_code tenantId',
                where: where
              }).populate('tenantId', 'name');
              var rows = app._.map(rawRows, (raw) => {
                return {
                  '单位名称': raw.tenantId.name,
                  '二维码': {tenantId: tenantId, elderlyId: raw.id, name: raw.name, avatar: raw.avatar},
                  '姓名': raw.name,
                  '入院号': raw.enter_code
                };
              });

              // this.response.attachment = file_name;
              this.set('Parse', 'no-parse');
              this.body = yield app.excel_service.build(file_name, rows, ['单位名称', '二维码', '姓名', '入院号']);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'elderlyInfo',
        verb: 'get',
        url: this.service_url_prefix + "/elderlyInfo/:_id/:select", //:select需要提取的字段域用逗号分割 e.g. name,type
        handler: function (app, options) {
          return function*(next) {
            try {
              var elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], this.params._id);
              var ret = app._.pick(elderly.toObject(), this.params.select.split(','));
              console.log('elderlyInfo:', ret);
              this.body = app.wrapper.res.ret(ret);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'changeElderlyRoomBed',
        verb: 'post',
        url: this.service_url_prefix + "/changeElderlyRoomBed",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var tenant, elderly, room;
            var oldRoomStatus, newRoomStatus, updateRoomStatus, old_roomOccupancyChangeHistory,
              new_roomOccupancyChangeHistory;
            var raw_elderly_room_value, raw_elderly_room_summary, raw_updateRoomStatus_occupied,
              raw_bed_status_for_cancel_occupy_roomStatus, raw_elderly_for_cancel_occupy_roomStatus, raw_in_flag;
            var cancel_occupy;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              var roomId = this.request.body.roomId;
              var bed_no = Number(this.request.body.bed_no);

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }
              room = yield app.modelFactory().model_read(app.models['psn_room'], roomId);
              if (!room || room.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到搬入房间资料!'});
                yield next;
                return;
              }

              var district = yield app.modelFactory().model_read(app.models['psn_district'], room.districtId);
              if (!district || district.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到搬入房间所在区域资料!'});
                yield next;
                return;
              }
              if (bed_no > room.capacity) {
                this.body = app.wrapper.res.error({message: '无效的床位号，该房间最多支持' + room.capacity + '床位!'});
                yield next;
                return;
              }

              var elderly_json = elderly.toObject();
              raw_elderly_room_value = app.clone(elderly_json.room_value);
              raw_elderly_room_summary = elderly_json.room_summary;

              if (raw_elderly_room_value.roomId == roomId && raw_elderly_room_value.bed_no == bed_no) {
                this.body = app.wrapper.res.error({message: '房间床位没有变化!'});
                yield next;
                return;
              }


              //检查入住老人有没有其他的预占用或在用记录
              console.log(raw_elderly_room_value.roomId.toString());
              var oldRoomStatuses = yield app.modelFactory().model_query(app.models['psn_roomStatus'], {
                where: {
                  tenantId: tenantId,
                  roomId: raw_elderly_room_value.roomId
                }
              });
              if (oldRoomStatuses.length == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人搬离房间床位信息!'});
                yield next;
                return;
              } else {
                oldRoomStatus = oldRoomStatuses[0];
              }
              if (!oldRoomStatus.occupied) {
                this.body = app.wrapper.res.error({message: '无法找到老人搬离房间床位信息!'});
                yield next;
                return;
              }
              var foundOccupy = false;
              for (var j = 0; j < oldRoomStatus.occupied.length; j++) {
                var occupy = oldRoomStatus.occupied[j];

                if (occupy.bed_no == raw_elderly_room_value.bed_no && elderlyId == occupy.elderlyId) {
                  foundOccupy = true;
                  if (occupy.bed_status == 'A0002') {
                    this.body = app.wrapper.res.error({message: '该老人旧床位仅仅被预占用，请使用修改预占用床位功能!'});
                    yield next;
                    return;
                  }

                  //rollback用
                  raw_bed_status_for_cancel_occupy_roomStatus = occupy.bed_status;
                  raw_elderly_for_cancel_occupy_roomStatus = occupy.elderlyId;
                  cancel_occupy = occupy;

                  occupy.bed_status = 'A0001';
                  occupy.elderlyId = undefined;
                }
              }

              if (!foundOccupy) {
                this.body = app.wrapper.res.error({message: '无法找到老人原来的房间床位信息!'});
                yield next;

                return;
              }
              console.log('前置检查完成');

              //修改room_summary,room_value
              elderly.room_value.districtId = room.districtId;
              elderly.room_value.roomId = roomId;
              elderly.room_value.bed_no = bed_no;
              elderly.room_summary = district.name + '-' + room.floor + 'F-' + room.name + '-' + bed_no + '#床';

              var newRoomStatuses = yield app.modelFactory().model_query(app.models['psn_roomStatus'], {
                where: {
                  tenantId: tenantId,
                  roomId: roomId
                }
              });
              if (newRoomStatuses.length == 0) {
                newRoomStatus = {
                  roomId: roomId,
                  occupied: [{bed_no: bed_no, bed_status: 'A0003', elderlyId: elderlyId}],
                  tenantId: tenantId
                };
              } else {
                updateRoomStatus = newRoomStatuses[0];

                //rollback用
                raw_updateRoomStatus_occupied = app.clone(updateRoomStatus.toObject().occupied);

                var bedInfo1;
                if (updateRoomStatus.occupied) {
                  for (var i = 0; i < updateRoomStatus.occupied.length; i++) {
                    if (bed_no == updateRoomStatus.occupied[i].bed_no) {
                      bedInfo1 = updateRoomStatus.occupied[i];
                    }
                  }
                }

                if (!bedInfo1) {
                  updateRoomStatus.occupied.push({
                    bed_no: bed_no,
                    bed_status: 'A0003',
                    elderlyId: elderlyId
                  });
                } else {
                  //判断要入住的床位是否有其他老人，如有其他老人已经预占则返回
                  if (bedInfo1.elderlyId) {
                    //改成
                    this.body = app.wrapper.res.error({message: '该床位已经被占用，请刷新床位信息!'});
                    yield next;
                    return;
                  }
                  bedInfo1.bed_status = 'A0003';
                  bedInfo1.elderlyId = elderlyId;
                }
              }


              //修改旧的占用历史(in_flag改为搬离，并设置搬离时间)
              console.log(raw_elderly_room_value.roomId);
              console.log(elderlyId);
              var roomOccupancyChangeHistories = yield app.modelFactory().model_query(app.models['psn_roomOccupancyChangeHistory'], {
                where: {
                  tenantId: tenantId,
                  roomId: raw_elderly_room_value.roomId,
                  bed_no: raw_elderly_room_value.bed_no,
                  elderlyId: elderlyId,
                  in_flag: true
                }, sort: {check_in_time: -1}
              });
              console.log(roomOccupancyChangeHistories);
              if (roomOccupancyChangeHistories && roomOccupancyChangeHistories.length > 0) {
                old_roomOccupancyChangeHistory = roomOccupancyChangeHistories[0];
                raw_in_flag = old_roomOccupancyChangeHistory.in_flag;
                old_roomOccupancyChangeHistory.in_flag = false;
                old_roomOccupancyChangeHistory.check_out_time = app.moment();
              } else {
                this.body = app.wrapper.res.error({message: '无法找到旧的房间占用历史!'});
                yield next;
                return;
              }

              //增加新的占用记录
              new_roomOccupancyChangeHistory = {
                roomId: roomId,
                room_summary: elderly.room_summary,
                bed_no: bed_no,
                elderlyId: elderly._id,
                elderly_summary: elderly.name + ' ' + elderly.id_no,
                in_flag: true,
                tenantId: tenantId
              };

              yield elderly.save();
              steps = "A";

              if (cancel_occupy) {
                yield oldRoomStatus.save();
              }
              steps += 'A';

              if (newRoomStatus) {
                newRoomStatus = yield app.modelFactory().model_create(app.models['psn_roomStatus'], newRoomStatus);
              } else if (updateRoomStatus) {
                yield updateRoomStatus.save();
              }
              steps += 'A';
              if (old_roomOccupancyChangeHistory) {
                yield old_roomOccupancyChangeHistory.save();
              }
              steps += 'A';

              new_roomOccupancyChangeHistory = yield app.modelFactory().model_create(app.models['psn_roomOccupancyChangeHistory'], new_roomOccupancyChangeHistory);
              steps += 'A';

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      elderly.room_value = raw_elderly_room_value;
                      elderly.room_summary = raw_elderly_room_summary;
                      yield elderly.save();
                      break;
                    case 1:
                      if (cancel_occupy) {
                        cancel_occupy.bed_status = raw_bed_status_for_cancel_occupy_roomStatus;
                        cancel_occupy.elderlyId = raw_elderly_for_cancel_occupy_roomStatus;
                        yield oldRoomStatus.save();
                      }
                      break;
                    case 2:
                      if (newRoomStatus) {
                        yield app.modelFactory().model_delete(app.models['pfta_roomStatus'], newRoomStatus._id);
                      } else if (updateRoomStatus) {
                        updateRoomStatus.occupied = raw_updateRoomStatus_occupied;
                        yield updateRoomStatus.save();
                      }
                      break;
                    case 3:
                      if (old_roomOccupancyChangeHistory) {
                        old_roomOccupancyChangeHistory.in_flag = raw_in_flag;
                        yield old_roomOccupancyChangeHistory.save();
                      }
                      break;
                    //case 4:
                    //    if(new_roomOccupancyChangeHistory) {
                    //        yield app.modelFactory().model_delete(app.models['pfta_roomOccupancyChangeHistory'], new_roomOccupancyChangeHistory._id);
                    //    }
                  }
                }
              }
            }
            yield next;
          };
        }
      }, {
        method: 'changeElderlyChargeItem',
        verb: 'post',
        url: this.service_url_prefix + "/changeElderlyChargeItem",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var tenant, elderly, charge_item;
            var journal_account_item_A0003, journal_account_item_B0001, tenantJournalAccount_B0006,
              tenantJournalAccount_A0001;
            var remove_elderly_charge_item_change_history_id, remove_tenantJournalAccount_B0006_id,
              remove_tenantJournalAccount_A0001_id;
            var summary_key;
            var raw_elderly_charging_on_of_monthly_prepay, old_elderly_charge_item_change_history,
              old_elderly_charge_items, old_elderly_journal_account, old_elderly_subsidiary_ledger,
              old_elderly_charge_item_catalog_summary, old_tenant_subsidiary_ledger;
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              var charge_item_catalog_id = this.request.body.charge_item_catalog_id;
              var old_charge_item_id = this.request.body.old_charge_item_id;
              var new_charge_item = this.request.body.new_charge_item;

              var arr_old_charge_item_id = old_charge_item_id.split('.');
              var arr_new_charge_item_id = new_charge_item.item_id.split('.');
              if (arr_old_charge_item_id.slice(0, arr_old_charge_item_id.length - 1).join('.') != arr_new_charge_item_id.slice(0, arr_new_charge_item_id.length - 1).join('.')) {
                this.body = app.wrapper.res.error({message: '更改的收费项目不是统一个收费类别下!'});
                yield next;
                return;
              }

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人资料!'});
                yield next;
                return;
              }

              charge_item = app._.findWhere(elderly.charge_items, {item_id: old_charge_item_id});
              if (!charge_item) {
                this.body = app.wrapper.res.error({message: '该老人数据中无法找到收费项目!'});
                yield next;
                return;
              }

              var tenant_json = tenant.toObject();
              var elderly_json = elderly.toObject();
              console.log('前置检查完成');

              raw_elderly_charging_on_of_monthly_prepay = app.clone(elderly_json.charging_on_of_monthly_prepay);

              //算法1，将旧收费项目中止，并计算退款，然后按照新收费项目重新按月预收
              //计算预付月收费日
              var firstPrepayDate = elderly.charging_on_of_monthly_prepay;
              if (!firstPrepayDate) {
                var arr_journal_account_B0001 = app._.where(elderly_json.journal_account, {revenue_and_expenditure_type: 'B0001'});
                var latest_journal_account_B0001 = app._.max(arr_journal_account_B0001, function (item) {
                  return item.check_in_time;
                });
                firstPrepayDate = latest_journal_account_B0001.check_in_time;
              }

              var daysOfMonthOnAverage = 30;

              var except_old_monthly_prepay_price = 0;
              var old_monthly_prepay_price = 0;
              app._.each(elderly.charge_items, function (item) {
                if (item.item_id != charge_item.item_id) {
                  except_old_monthly_prepay_price += item.period_price;
                }
              });
              old_monthly_prepay_price = except_old_monthly_prepay_price + charge_item.period_price;
              var new_monthly_prepay_price = except_old_monthly_prepay_price + new_charge_item.period_price;
              var old_charge_item_day_price = old_monthly_prepay_price / daysOfMonthOnAverage;

              ////->放弃从历史记录中计算变化的月租预付计费时间而是直接从elderly读取
              //if(elderly.charge_item_change_history && elderly.charge_item_change_history.length>0) {
              //    var latestChangeRecord = app._.max(app._.where(elderly.charge_item_change_history, {charge_item_catalog_id: charge_item_catalog_id}),
              //        function (item) {
              //            return item.check_in_time;
              //        });
              //    latestChangeRecord && (firstPrepayDate = latestChangeRecord.check_in_time);
              //}


              //当月周期未住满的天数
              var remainder = daysOfMonthOnAverage - app.moment().diff(firstPrepayDate, 'days') % daysOfMonthOnAverage;
              var refund = (old_charge_item_day_price * remainder).toFixed(2);
              console.log(refund);
              old_elderly_journal_account = app.clone(elderly_json.journal_account);

              //预付月租退款(按天计算)
              journal_account_item_A0003 = {
                voucher_no: yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, elderly_json.tenantId),
                revenue_and_expenditure_type: 'A0003',
                digest: app.moment().format('YYYY-MM-DD') + ':' + charge_item.item_name + '->' + new_charge_item.item_name + '重新计费,并退回' + remainder + '天预收款',
                amount: refund
              };

              //变化后的预付月租
              journal_account_item_B0001 = {
                voucher_no: yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, elderly_json.tenantId),
                revenue_and_expenditure_type: 'B0001',
                digest: app.moment().format('YYYY-MM-DD') + ':' + charge_item.item_name + '->' + new_charge_item.item_name + '重新计费',
                amount: new_monthly_prepay_price * 1
              };

              //记录老人流水账
              elderly.journal_account.push(journal_account_item_A0003);
              elderly.journal_account.push(journal_account_item_B0001);

              //修改老人明细账
              old_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
              elderly.subsidiary_ledger.self += journal_account_item_A0003.amount - journal_account_item_B0001.amount;

              //修改月租预付重新计费时间
              elderly.charging_on_of_monthly_prepay = app.moment(); //更新月租预付的计费时间

              //增加老人收费项目变动历史
              old_elderly_charge_item_change_history = app.clone(elderly_json.charge_item_change_history);
              var charge_item_change_record = {
                charge_item_catalog_id: charge_item_catalog_id,
                old_item_id: charge_item.item_id,
                old_item_name: charge_item.item_name,
                old_period_price: charge_item.period_price,
                old_period: charge_item.period,
                new_item_id: new_charge_item.item_id,
                new_item_name: new_charge_item.item_name,
                new_period_price: new_charge_item.period_price,
                new_period: new_charge_item.period
              };
              elderly.charge_item_change_history.push(charge_item_change_record);

              //修改老人收费项目
              old_elderly_charge_items = app.clone(elderly_json.charge_items);
              charge_item.item_id = new_charge_item.item_id;
              charge_item.item_name = new_charge_item.item_name;
              charge_item.period_price = new_charge_item.period_price;
              charge_item.period = new_charge_item.period;

              //除了房间床位分类，其他根据不同收费分类重新设置老人项目汇总信息
              var new_charge_item_catalog_name = arr_new_charge_item_id[arr_new_charge_item_id.length - 2].toLowerCase().replace('-' + elderly.charge_standard.toLowerCase(), '');


              if (new_charge_item_catalog_name != 'room') {
                summary_key = new_charge_item_catalog_name + '_summary';
                old_elderly_charge_item_catalog_summary = elderly[summary_key];
                elderly[summary_key] = new_charge_item.item_name;
              }

              //记录租户流水账
              tenantJournalAccount_B0006 = {
                voucher_no: journal_account_item_A0003.voucher_no,
                revenue_and_expenditure_type: 'B0006',
                digest: elderly.name + ' ' + journal_account_item_A0003.digest,
                amount: journal_account_item_A0003.amount,
                source_type: app.modelVariables.SOURCE_TYPES.ELDERLY,
                source_id: elderly._id,
                source_key: '$journal_account.voucher_no',
                tenantId: elderly.tenantId
              };

              tenantJournalAccount_A0001 = {
                voucher_no: journal_account_item_B0001.voucher_no,
                revenue_and_expenditure_type: 'A0001',
                digest: elderly.name + ' ' + journal_account_item_B0001.digest,
                amount: journal_account_item_B0001.amount,
                source_type: app.modelVariables.SOURCE_TYPES.ELDERLY,
                source_id: elderly._id,
                source_key: '$journal_account.voucher_no',
                tenantId: elderly.tenantId
              };
              //修改租户明细账
              old_tenant_subsidiary_ledger = app.clone(tenant_json.subsidiary_ledger);
              tenant.subsidiary_ledger.self += tenantJournalAccount_A0001.amount - tenantJournalAccount_B0006.amount;

              yield elderly.save();
              steps = "A";

              tenantJournalAccount_B0006 = yield app.modelFactory().model_create(app.models['pub_tenantJournalAccount'], tenantJournalAccount_B0006);
              remove_tenantJournalAccount_B0006_id = tenantJournalAccount_B0006._id;
              steps += "A";
              tenantJournalAccount_A0001 = yield app.modelFactory().model_create(app.models['pub_tenantJournalAccount'], tenantJournalAccount_A0001);
              remove_tenantJournalAccount_A0001_id = tenantJournalAccount_A0001._id;
              steps += "A";

              yield tenant.save();
              steps += "A";

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      elderly.charge_items = old_elderly_charge_items;
                      elderly.journal_account = old_elderly_journal_account;
                      elderly.subsidiary_ledger = old_elderly_subsidiary_ledger;
                      elderly.charging_on_of_monthly_prepay = raw_elderly_charging_on_of_monthly_prepay;
                      elderly.charge_item_change_history = old_elderly_charge_item_change_history;
                      if (summary_key) {
                        elderly[summary_key] = old_elderly_charge_item_catalog_summary;
                      }
                      yield elderly.save();
                      break;
                    case 1:
                      yield app.modelFactory().model_delete(app.models['pub_tenantJournalAccount'], remove_tenantJournalAccount_B0006_id);
                      break;
                    case 2:
                      yield app.modelFactory().model_delete(app.models['pub_tenantJournalAccount'], remove_tenantJournalAccount_A0001_id);
                      break;
                    case 3:
                      tenant.subsidiary_ledger = old_tenant_subsidiary_ledger;
                      tenant.save();
                      break;
                  }
                }
              }
            }
            yield next;
          };
        }
      }, {
        method: 'changeElderlyChargeItemForOtherAndCustomized',
        verb: 'post',
        url: this.service_url_prefix + "/changeElderlyChargeItemForOtherAndCustomized",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var tenant, elderly;
            var journal_account_item_A0003, journal_account_item_B0001, tenantJournalAccount_B0006,
              tenantJournalAccount_A0001;
            var remove_elderly_charge_item_change_history_id, remove_tenantJournalAccount_B0006_id,
              remove_tenantJournalAccount_A0001_id;
            var summary_key;
            var raw_elderly_charge_items, raw_elderly_charging_on_of_monthly_prepay,
              old_elderly_charge_item_change_history, old_elderly_charge_items, old_elderly_journal_account,
              old_elderly_subsidiary_ledger,
              old_elderly_charge_item_catalog_summary, old_tenant_subsidiary_ledger;
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              var charge_item_catalog_id = this.request.body.charge_item_catalog_id;
              var selectedOtherAndCustomized = this.request.body.selectedOtherAndCustomized;

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人资料!'});
                yield next;
                return;
              }

              var tenant_json = tenant.toObject();
              var elderly_json = elderly.toObject();
              console.log('前置检查完成');

              raw_elderly_charge_items = app.clone(elderly_json.charge_items);
              raw_elderly_charging_on_of_monthly_prepay = app.clone(elderly_json.charging_on_of_monthly_prepay);
              old_elderly_journal_account = app.clone(elderly_json.journal_account);
              old_elderly_charge_item_change_history = app.clone(elderly_json.charge_item_change_history);

              var charge_item_catalog_id_of_cutomized = app.modelVariables['PENSION-AGENCY'].CHARGE_ITEM_CUSTOMIZED_CATAGORY._ID + '-' + elderly_json.charge_standard;
              var charge_item_catalog_id_of_other = app.modelVariables['PENSION-AGENCY'].CHARGE_ITEM_OTHER_CATAGORY._ID + '-' + elderly_json.charge_standard;


              var charge_itemsForOtherAndCustomized = app._.filter(elderly_json.charge_items, function (o) {
                return app._.initial(o.item_id.split('.')).join('.') == charge_item_catalog_id_of_cutomized.toLowerCase() ||
                  app._.initial(o.item_id.split('.')).join('.') == charge_item_catalog_id_of_other.toLowerCase();
              });

              console.log('elderly_json.charge_items: ', elderly_json.charge_items);
              console.log('charge_item_catalog_id_of_cutomized:', charge_item_catalog_id_of_cutomized);
              console.log('charge_item_catalog_id_of_other:', charge_item_catalog_id_of_other);
              console.log('charge_itemsForOtherAndCustomized:', charge_itemsForOtherAndCustomized);

              var elderlyChargeItemIds = app._.pluck(charge_itemsForOtherAndCustomized, 'item_id');
              //先找出增加的项目和不变的项目并老人收费项目变动历史

              var tenantSelectedStandard = app._.find(tenant_json.charge_standards, function (o) {
                  return o.subsystem == app.modelVariables['PENSION-AGENCY'].SUB_SYSTEM && o.charge_standard == elderly_json.charge_standard;
                }) || {};

              for (var i = 0; i < selectedOtherAndCustomized.length; i++) {
                var chargeItemOfTenant = app._.findWhere(tenantSelectedStandard.charge_items, {item_id: selectedOtherAndCustomized[i]});

                if (app._.contains(elderlyChargeItemIds, selectedOtherAndCustomized[i])) {
                  //检查个人账户和租户账户中收费项目的定价是否一致
                  //如果不一至则需要将租户里的定价更新到老人中
                  var chargeItemOfElderly = app._.findWhere(charge_itemsForOtherAndCustomized, {item_id: selectedOtherAndCustomized[i]});

                  var chargeItemHistoryOfElderly = app._.findWhere(elderly_json.charge_item_change_history, {new_item_id: selectedOtherAndCustomized[i]});

                  if (chargeItemOfTenant.period_price != chargeItemOfElderly.period_price) {
                    for (var i = 0; i < charge_itemsForOtherAndCustomized.length; i++) {
                      if (elderly.charge_items[i].item_id == chargeItemOfElderly.item_id) {
                        elderly.charge_items[i].item_name = chargeItemOfTenant.item_name;
                        elderly.charge_items[i].period_price = chargeItemOfTenant.period_price;
                        elderly.charge_items[i].period = chargeItemOfTenant.period;
                      }
                    }

                    if (chargeItemHistoryOfElderly) {
                      //增加一条价格变化的数据
                      elderly.charge_item_change_history.push({
                        charge_item_catalog_id: chargeItemHistoryOfElderly.charge_item_catalog_id,
                        old_item_id: chargeItemHistoryOfElderly.item_id,
                        old_item_name: chargeItemHistoryOfElderly.item_name,
                        old_period_price: chargeItemHistoryOfElderly.period_price,
                        old_period: chargeItemHistoryOfElderly.period,
                        new_item_id: chargeItemOfTenant.item_id,
                        new_item_name: chargeItemOfTenant.item_name,
                        new_period_price: chargeItemOfTenant.period_price,
                        new_period: chargeItemOfTenant.period
                      });
                    } else {
                      //增加一条初始记录
                      elderly.charge_item_change_history.push({
                        charge_item_catalog_id: (chargeItemOfTenant.item_id.indexOf(charge_item_catalog_id.toLowerCase()) != -1) ? charge_item_catalog_id_of_cutomized : charge_item_catalog_id,
                        new_item_id: chargeItemOfTenant.item_id,
                        new_item_name: chargeItemOfTenant.item_name,
                        new_period_price: chargeItemOfTenant.period_price,
                        new_period: chargeItemOfTenant.period
                      });
                    }
                  }

                } else {

                  elderly.charge_items.push(chargeItemOfTenant);

                  elderly.charge_item_change_history.push({
                    charge_item_catalog_id: (chargeItemOfTenant.item_id.indexOf(charge_item_catalog_id.toLowerCase()) != -1) ? charge_item_catalog_id_of_cutomized : charge_item_catalog_id,
                    new_item_id: chargeItemOfTenant.item_id,
                    new_item_name: chargeItemOfTenant.item_name,
                    new_period_price: chargeItemOfTenant.period_price,
                    new_period: chargeItemOfTenant.period
                  });
                }
              }
              //再找出删除的项目并老人收费项目变动历史
              for (var i = 0; i < elderlyChargeItemIds.length; i++) {
                if (!app._.contains(selectedOtherAndCustomized, elderlyChargeItemIds[i])) {

                  var indexToRemove = -1;
                  for (var j = 0; j < elderly.charge_items.length; j++) {
                    if (elderlyChargeItemIds[i] == elderly.charge_items[j].item_id) {
                      indexToRemove = j;
                      break;
                    }
                  }
                  if (indexToRemove != -1) {
                    var arr_removed = elderly.charge_items.splice(indexToRemove, 1);
                    if (arr_removed.length > 0) {
                      var charge_item_to_remove = arr_removed[0];
                      elderly.charge_item_change_history.push({
                        charge_item_catalog_id: (charge_item_to_remove.item_id.indexOf(charge_item_catalog_id.toLowerCase()) != -1) ? charge_item_catalog_id_of_cutomized : charge_item_catalog_id,
                        old_item_id: charge_item_to_remove.item_id,
                        old_item_name: charge_item_to_remove.item_name,
                        old_period_price: charge_item_to_remove.period_price,
                        old_period: charge_item_to_remove.period
                      });
                    }
                  }
                }
              }

              //计算退还预付月租
              var firstPrepayDate = elderly.charging_on_of_monthly_prepay;
              if (!firstPrepayDate) {
                var arr_journal_account_B0001 = app._.where(elderly_json.journal_account, {revenue_and_expenditure_type: 'B0001'});
                var latest_journal_account_B0001 = app._.max(arr_journal_account_B0001, function (item) {
                  return item.check_in_time;
                });
                firstPrepayDate = latest_journal_account_B0001.check_in_time;
              }
              var daysOfMonthOnAverage = 30;
              var raw_monthly_prepay_price = app._.reduce(app._.pluck(raw_elderly_charge_items, 'period_price'), function (total, period_price) {
                return total + period_price;
              }, 0);

              var charge_item_day_price = raw_monthly_prepay_price / daysOfMonthOnAverage;
              var remainder = daysOfMonthOnAverage - app.moment().diff(firstPrepayDate, 'days') % daysOfMonthOnAverage;
              var refund = (charge_item_day_price * remainder);

              //预付月租退款(按天计算)
              journal_account_item_A0003 = {
                voucher_no: yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, elderly_json.tenantId),
                revenue_and_expenditure_type: 'A0003',
                digest: app.moment().format('YYYY-MM-DD') + ':其他及自定义收费项目变更而重新计费,并退回' + remainder + '天预收款',
                amount: refund
              };

              var new_monthly_prepay_price = app._.reduce(app._.pluck(elderly.charge_items, 'period_price'), function (total, period_price) {
                return total + period_price;
              }, 0);

              //变化后的预付月租
              journal_account_item_B0001 = {
                voucher_no: yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, elderly_json.tenantId),
                revenue_and_expenditure_type: 'B0001',
                digest: app.moment().format('YYYY-MM-DD') + ':其他及自定义收费项目变更而重新计费',
                amount: new_monthly_prepay_price * 1
              };

              //记录老人流水账
              elderly.journal_account.push(journal_account_item_A0003);
              elderly.journal_account.push(journal_account_item_B0001);

              //修改老人明细账
              old_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
              elderly.subsidiary_ledger.self += journal_account_item_A0003.amount - journal_account_item_B0001.amount;

              //修改月租预付重新计费时间
              elderly.charging_on_of_monthly_prepay = app.moment();

              //记录租户流水账
              tenantJournalAccount_B0006 = {
                voucher_no: journal_account_item_A0003.voucher_no,
                revenue_and_expenditure_type: 'B0006',
                digest: elderly.name + ' ' + journal_account_item_A0003.digest,
                amount: journal_account_item_A0003.amount,
                source_type: app.modelVariables.SOURCE_TYPES.ELDERLY,
                source_id: elderly._id,
                source_key: '$journal_account.voucher_no',
                tenantId: elderly.tenantId
              };

              tenantJournalAccount_A0001 = {
                voucher_no: journal_account_item_B0001.voucher_no,
                revenue_and_expenditure_type: 'A0001',
                digest: elderly.name + ' ' + journal_account_item_B0001.digest,
                amount: journal_account_item_B0001.amount,
                source_type: app.modelVariables.SOURCE_TYPES.ELDERLY,
                source_id: elderly._id,
                source_key: '$journal_account.voucher_no',
                tenantId: elderly.tenantId
              };
              //修改租户明细账
              old_tenant_subsidiary_ledger = app.clone(tenant_json.subsidiary_ledger);
              tenant.subsidiary_ledger.self += tenantJournalAccount_A0001.amount - tenantJournalAccount_B0006.amount;

              yield elderly.save();
              steps = "A";

              tenantJournalAccount_B0006 = yield app.modelFactory().model_create(app.models['pub_tenantJournalAccount'], tenantJournalAccount_B0006);
              remove_tenantJournalAccount_B0006_id = tenantJournalAccount_B0006._id;
              steps += "A";
              tenantJournalAccount_A0001 = yield app.modelFactory().model_create(app.models['pub_tenantJournalAccount'], tenantJournalAccount_A0001);
              remove_tenantJournalAccount_A0001_id = tenantJournalAccount_A0001._id;
              steps += "A";

              yield tenant.save();
              steps += "A";

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      elderly.charge_items = old_elderly_charge_items;
                      elderly.journal_account = old_elderly_journal_account;
                      elderly.subsidiary_ledger = old_elderly_subsidiary_ledger;
                      elderly.charging_on_of_monthly_prepay = raw_elderly_charging_on_of_monthly_prepay;
                      elderly.charge_item_change_history = old_elderly_charge_item_change_history;
                      yield elderly.save();
                      break;
                    case 1:
                      yield app.modelFactory().model_delete(app.models['pub_tenantJournalAccount'], remove_tenantJournalAccount_B0006_id);
                      break;
                    case 2:
                      yield app.modelFactory().model_delete(app.models['pub_tenantJournalAccount'], remove_tenantJournalAccount_A0001_id);
                      break;
                    case 3:
                      tenant.subsidiary_ledger = old_tenant_subsidiary_ledger;
                      tenant.save();
                      break;
                  }
                }
              }
            }
            yield next;
          };
        }
      }, {
        method: 'changeElderlyNursingLevel',
        verb: 'post',
        url: this.service_url_prefix + "/changeElderlyNursingLevel", //直接修改老人照护级别
        handler: function (app, options) {
          return function*(next) {
            var tenant, elderly, nursingLevel, nursingPlan;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }
              var elderlyId = this.request.body.elderlyId;
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }
              var nursingLevelId = this.request.body.nursingLevelId;
              nursingLevel = yield app.modelFactory().model_read(app.models['psn_nursingLevel'], nursingLevelId);
              if (!nursingLevel || nursingLevel.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到照护级别!'});
                yield next;
                return;
              }

              // console.log('nursingLevelId:', nursingLevelId);
              if (nursingLevelId === (elderly.nursingLevelId || '').toString()) {
                this.body = app.wrapper.res.error({message: '照护级别没有变化!'});
                yield next;
                return;
              }

              var oldNursingLevelId = elderly.nursingLevelId;

              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;

              elderly.nursingLevelId = nursingLevelId;
              yield elderly.save();

              yield app.modelFactory().model_create(app.models['psn_elderlySpecificSpotChangeLog'], {
                operated_by: operated_by,
                operated_by_name: operated_by_name,
                elderlyId: elderlyId,
                elderly_name: elderly.name,
                col_name: 'nursingLevelId',
                col_val_old: oldNursingLevelId || 'null',
                col_val_new: nursingLevelId,
                fromMethod: 'changeElderlyNursingLevel',
                tenantId: elderly.tenantId
              });

              // 如果更换照护等级,将清空对应的所有工作项目
              var elderlyNursingPlan = yield app.modelFactory().model_one(app.models['psn_nursingPlan'], {
                select: 'work_items',
                where: {
                  status: 1,
                  elderlyId: elderlyId,
                  tenantId: tenantId
                }
              });


              if (elderlyNursingPlan && elderlyNursingPlan.work_items) {

                elderlyNursingPlan.work_items = elderlyNursingPlan.work_items.filter(function (item) {
                  return item.type == DIC.D3017.DRUG_USE_ITEM
                });

                yield elderlyNursingPlan.save();
              }


              this.body = app.wrapper.res.ret({
                oldNursingLevelId: oldNursingLevelId,
                nursingLevelId: nursingLevelId,
                nursingLevelName: nursingLevel.name
              });
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************老人充值记账相关*****************************/
      {
        method: 'bookingRecharge',
        verb: 'post',
        url: this.service_url_prefix + "/bookingRecharge/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var recharge, elderly, tenant;
            var raw_recharge_operated_by, raw_recharge_operated_by_name;
            var raw_elderly_subsidiary_ledger, raw_elderly_journal_account;
            var new_elderly_journal_account_item_A0001;
            try {
              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;
              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }

              recharge = yield app.modelFactory().model_read(app.models['psn_recharge'], this.params._id);
              if (!recharge || recharge.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到充值记录!'});
                yield next;
                return;
              }
              if (recharge.voucher_no) {
                this.body = app.wrapper.res.error({message: '充值记录已经入账无需重新记账!'});
                yield next;
                return;
              }

              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], recharge.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人资料!'});
                yield next;
                return;
              }

              if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                this.body = app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法记账!'});
                yield next;
                return;
              }

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], recharge.tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var recharge_json = recharge.toObject();
              var elderly_json = elderly.toObject();
              console.log('前置检查完成');

              raw_recharge_operated_by = recharge_json.operated_by;
              raw_recharge_operated_by_name = recharge_json.operated_by_name;
              //raw_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
              //raw_elderly_journal_account = app.clone(elderly_json.journal_account);

              recharge.operated_by = operated_by;
              recharge.operated_by_name = operated_by_name;


              new_elderly_journal_account_item_A0001 = {
                voucher_no: yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, elderly_json.tenantId),
                revenue_and_expenditure_type: 'A0001',
                digest: app.moment(recharge_json.check_in_time).format('YYYY-MM-DD') + ':' + app.dictionary.pairs["D3005"][recharge_json.type].name,
                amount: recharge_json.amount
              };
              recharge.voucher_no = new_elderly_journal_account_item_A0001.voucher_no;

              elderly.journal_account.push(new_elderly_journal_account_item_A0001);

              //更新老人分类账
              elderly.subsidiary_ledger.self += new_elderly_journal_account_item_A0001.amount;

              ////现金业务不应该更新租户账户
              ////记录租户流水账
              //new_tenantJournalAccount_A0001 = {
              //    voucher_no : yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT,elderly_json.tenantId),
              //    revenue_and_expenditure_type: 'A0001',
              //    digest: elderly.name + ' ' + new_elderly_journal_account_item_A0001.digest,
              //    amount: new_elderly_journal_account_item_A0001.amount,
              //    tenantId: elderly.tenantId
              //};
              ////更新租户分类账
              //tenant.subsidiary_ledger.self += new_tenantJournalAccount_A0001.amount;

              yield recharge.save();
              steps = 'A';
              yield elderly.save();
              //steps += 'A';
              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      recharge.operated_by = raw_recharge_operated_by;
                      recharge.operated_by_name = raw_recharge_operated_by_name;
                      yield recharge.save();
                      break;
                    //case 1:
                    //    elderly.subsidiary_ledger = raw_elderly_subsidiary_ledger;
                    //    elderly.journal_account = raw_elderly_journal_account;
                    //    yield elderly.save();
                    //    break;
                  }
                }
              }
            }
            yield next;
          };
        }
      }, {
        method: 'checkCanChangeBookingOrUnbookingRecharge', //检测是否能够记账或撤销记账
        verb: 'get',
        url: this.service_url_prefix + "/checkCanChangeBookingOrUnbookingRecharge/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var recharge, elderly, tenant;

            try {

              recharge = yield app.modelFactory().model_read(app.models['psn_recharge'], this.params._id);
              if (!recharge || recharge.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到充值记录!'});
                yield next;
                return;
              }
              if (!recharge.voucher_no) {
                this.body = app.wrapper.res.ret({itCan: false});
                yield next;
                return;
              }

              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], recharge.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }
              if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                this.body = app.wrapper.res.error({itCan: false, message: '当前老人不在院或正在办理出院手续，无法记账!'});
                yield next;
                return;
              }

              var recharge_json = recharge.toObject();
              var elderly_json = elderly.toObject();
              console.log('前置检查完成');

              var bookingJournalAccountItem = app._.findWhere(elderly_json.journal_account, {
                voucher_no: recharge_json.voucher_no,
                carry_over_flag: false
              });

              this.body = app.wrapper.res.ret({itCan: bookingJournalAccountItem != null});
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

            }
            yield next;
          };
        }
      }, {
        method: 'disableRechargeAndUnbooking', //作废充值记录并撤销记账
        verb: 'post',
        url: this.service_url_prefix + "/disableRechargeAndUnbooking/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var recharge, elderly, tenant;
            var raw_recharge_status, raw_recharge_operated_by, raw_recharge_operated_by_name;
            var raw_elderly_subsidiary_ledger, raw_elderly_journal_account;
            try {
              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;
              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }

              recharge = yield app.modelFactory().model_read(app.models['psn_recharge'], this.params._id);
              if (!recharge || recharge.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到充值记录!'});
                yield next;
                return;
              }
              if (!recharge.voucher_no) {
                this.body = app.wrapper.res.error({message: '充值记录还未记账，无需撤销!'});
                yield next;
                return;
              }

              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], recharge.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }

              if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                this.body = app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法记账!'});
                yield next;
                return;
              }

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], recharge.tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var recharge_json = recharge.toObject();
              var elderly_json = elderly.toObject();
              console.log('前置检查完成');

              raw_recharge_status = recharge_json.status;
              raw_recharge_operated_by = recharge_json.operated_by;
              raw_recharge_operated_by_name = recharge_json.operated_by_name;
              //raw_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
              //raw_elderly_journal_account = app.clone(elderly_json.journal_account);

              recharge.status = 0;
              recharge.operated_by = operated_by;
              recharge.operated_by_name = operated_by_name;

              var isBookingJournalAccountItemCarryOver = false;
              var unbookingAmount = 0;
              var arr_journal_account = elderly.journal_account;
              for (var i = 0; i < arr_journal_account.length; i++) {
                //此处已经确定是充值，所以不用管是收入还是支出，其必定是收入
                if (arr_journal_account[i].voucher_no == recharge_json.voucher_no) {
                  if (arr_journal_account[i].carry_over_flag == false) {
                    unbookingAmount = arr_journal_account[i].amount;
                  } else {
                    isBookingJournalAccountItemCarryOver = true;
                  }
                }
              }

              if (isBookingJournalAccountItemCarryOver) {
                this.body = app.wrapper.res.error({message: '充值记录记账凭证已经结算，无需撤销!'});
                yield next;
                return;
              }


              elderly.journal_account = app._.reject(elderly_json.journal_account, {voucher_no: recharge_json.voucher_no});

              //更新老人分类账
              elderly.subsidiary_ledger.self -= unbookingAmount;


              yield recharge.save();
              steps = 'A';
              yield elderly.save();
              //steps += 'A';
              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      recharge.status = raw_recharge_status;
                      recharge.operated_by = raw_recharge_operated_by;
                      recharge.operated_by_name = raw_recharge_operated_by_name;
                      yield recharge.save();
                      break;
                    //case 1:
                    //    elderly.subsidiary_ledger = raw_elderly_subsidiary_ledger;
                    //    elderly.journal_account = raw_elderly_journal_account;
                    //    yield elderly.save();
                    //    break;
                  }
                }
              }
            }
            yield next;
          };
        }
      }, {
        method: 'changeRechargeBookingAmount', //修改充值记账的数额
        verb: 'post',
        url: this.service_url_prefix + "/changeRechargeBookingAmount/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var recharge, elderly, tenant;
            var raw_recharge_operated_by, raw_recharge_operated_by_name;
            var raw_elderly_subsidiary_ledger, raw_elderly_journal_account;

            try {
              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;
              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }

              recharge = yield app.modelFactory().model_read(app.models['psn_recharge'], this.params._id);
              if (!recharge || recharge.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到充值记录!'});
                yield next;
                return;
              }
              if (!recharge.voucher_no) {
                this.body = app.wrapper.res.error({message: '充值记录还未记账，无需撤销!'});
                yield next;
                return;
              }

              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], recharge.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }

              if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                this.body = app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法记账!'});
                yield next;
                return;
              }

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], recharge.tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var recharge_json = recharge.toObject();
              console.log('前置检查完成');

              raw_recharge_operated_by = recharge_json.operated_by;
              raw_recharge_operated_by_name = recharge_json.operated_by_name;

              recharge.operated_by = operated_by;
              recharge.operated_by_name = operated_by_name;

              var isBookingJournalAccountItemCarryOver = false;
              var newBookingAmount = recharge_json.amount;
              var oldBookingAmount = 0;
              var arr_journal_account = elderly.journal_account;
              for (var i = 0; i < arr_journal_account.length; i++) {
                //此处已经确定是充值，所以不用管是收入还是支出，其必定是收入
                if (arr_journal_account[i].voucher_no == recharge_json.voucher_no) {
                  if (arr_journal_account[i].carry_over_flag == false) {
                    oldBookingAmount = arr_journal_account[i].amount;
                    arr_journal_account[i].amount = newBookingAmount;
                  } else {
                    isBookingJournalAccountItemCarryOver = true;
                  }
                }
              }

              if (isBookingJournalAccountItemCarryOver) {
                this.body = app.wrapper.res.error({message: '充值记录记账凭证已经结算，无需撤销!'});
                yield next;
                return;
              }

              //更新老人分类账
              elderly.subsidiary_ledger.self = elderly.subsidiary_ledger.self - oldBookingAmount + newBookingAmount;


              yield recharge.save();
              steps = 'A';
              yield elderly.save();
              //steps += 'A';
              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      recharge.status = raw_recharge_status;
                      recharge.operated_by = raw_recharge_operated_by;
                      recharge.operated_by_name = raw_recharge_operated_by_name;
                      yield recharge.save();
                      break;
                    //case 1:
                    //    elderly.subsidiary_ledger = raw_elderly_subsidiary_ledger;
                    //    elderly.journal_account = raw_elderly_journal_account;
                    //    yield elderly.save();
                    //    break;
                  }
                }
              }
            }
            yield next;
          };
        }
      },
      /**********************老人充值记账后的冲红相关*****************************/
      {
        method: 'checkCanBookingRedToElderlyRecharge', //检查是否是系统内部记账，如果是则需要在前台做好提醒不需要冲红，但不强制禁止冲红
        verb: 'post',
        url: this.service_url_prefix + "/checkCanBookingRedToElderlyRecharge",
        handler: function (app, options) {
          return function*(next) {
            var recharge_to_red, tenantJournalAccount_to_red, elderly, tenant;
            try {
              var tenantId = this.request.body.tenantId;
              var voucher_no_to_red = this.request.body.voucher_no_to_red;

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到租户资料!'});
                yield next;
                return;
              }
              console.log('前置检查完成');

              recharge_to_red = yield app.modelFactory().model_one(app.models['psn_recharge'], {
                where: {
                  status: 1,
                  voucher_no: voucher_no_to_red,
                  tenantId: tenantId
                }
              });

              tenantJournalAccount_to_red = yield app.modelFactory().model_one(app.models['pub_tenantJournalAccount'], {
                where: {
                  status: 1,
                  voucher_no: voucher_no_to_red,
                  tenantId: tenantId
                }
              });

              console.log(voucher_no_to_red);

              var can_not_find_recharge_to_red = !recharge_to_red || recharge_to_red.status == 0;
              var can_not_find_tenantJournalAccount_to_red = !tenantJournalAccount_to_red || tenantJournalAccount_to_red.status == 0;

              if (can_not_find_recharge_to_red && can_not_find_tenantJournalAccount_to_red) {

                this.body = app.wrapper.res.error({message: '无法找到需要冲红的流水记录!'});
                yield next;
                return;
              }

              if (!can_not_find_recharge_to_red) {
                elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], recharge_to_red.elderlyId);
                if (!elderly || elderly.status == 0) {
                  this.body = app.wrapper.res.error({message: '无法找到老人!'});
                  yield next;
                  return;
                }

                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                  this.body = app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法冲红!'});
                  yield next;
                  return;
                }

                var journal_account = elderly.journal_account;
                for (var i = 0; i < journal_account.length; i++) {
                  if (journal_account[i].voucher_no == voucher_no_to_red && !journal_account[i].carry_over_flag) {
                    this.body = app.wrapper.res.error({message: '当前充值流水没有结转，无法冲红，可以修改或删除!'});
                    yield next;
                    return;
                  }
                }
              }

              if (!can_not_find_tenantJournalAccount_to_red) {
                if (!tenantJournalAccount_to_red.carry_over_flag) {
                  this.body = app.wrapper.res.error({message: '当前流水没有结转，无法冲红，可以修改或删除!'});
                  yield next;
                  return;
                }
              }


              this.body = app.wrapper.res.ret({
                itCan: true,
                isSystemInnerBooking: !can_not_find_tenantJournalAccount_to_red
              });
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

            }
            yield next;
          };
        }
      }, {
        method: 'bookingRedToElderlyRecharge',
        verb: 'post',
        url: this.service_url_prefix + "/bookingRedToElderlyRecharge",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var recharge_to_red, tenantJournalAccount_to_red, red, elderly, tenant;
            var raw_red_operated_by, raw_red_operated_by_name;
            var raw_elderly_subsidiary_ledger, raw_elderly_journal_account, raw_tenant_subsidiary_ledger;
            var new_elderly_journal_account_item_B0003, new_tenantJournalAccount_B0008;
            var remove_tenantJournalAccount_B0008_id;
            try {
              var voucher_no_to_red = this.request.body.voucher_no_to_red;
              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;
              var tenantId = this.request.body.tenantId;
              var isSystemInnerBooking = this.request.body.isSystemInnerBooking;
              var amount = this.request.body.amount;

              var voucher_no, remark;

              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }


              if (!isSystemInnerBooking) {
                //老人充值流水
                recharge_to_red = yield app.modelFactory().model_one(app.models['psn_recharge'], {
                  where: {
                    status: 1,
                    voucher_no: voucher_no_to_red,
                    tenantId: tenantId
                  }
                });
                if (!recharge_to_red || recharge_to_red.status == 0) {
                  this.body = app.wrapper.res.error({message: '无法找到需要冲红的流水记录!'});
                  yield next;
                  return;
                }

                elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], recharge_to_red.elderlyId);
                if (!elderly || elderly.status == 0) {
                  this.body = app.wrapper.res.error({message: '无法找到老人!'});
                  yield next;
                  return;
                }

                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                  this.body = app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法记账!'});
                  yield next;
                  return;
                }

                var journal_account = elderly.journal_account;
                for (var i = 0; i < journal_account.length; i++) {
                  if (journal_account[i].voucher_no == voucher_no_to_red && !journal_account[i].carry_over_flag) {
                    this.body = app.wrapper.res.error({message: '当前充值流水没有结转，无法冲红，可以修改或删除!'});
                    yield next;
                    return;
                  }
                }

                console.log('前置检查完成');


                var elderly_json = elderly.toObject();
                raw_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
                raw_elderly_journal_account = app.clone(elderly_json.journal_account);

                remark = elderly_json.name + '老人充值流水';
                voucher_no = yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, tenantId);
                //老人充值冲红记账
                new_elderly_journal_account_item_B0003 = {
                  voucher_no: voucher_no,
                  revenue_and_expenditure_type: 'B0003',
                  digest: voucher_no_to_red,
                  amount: amount,
                  red_flag: true
                };

                elderly.journal_account.push(new_elderly_journal_account_item_B0003);
                //冲红是支出+=
                elderly.subsidiary_ledger.self += (new_elderly_journal_account_item_B0003.revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * new_elderly_journal_account_item_B0003.amount;

                yield elderly.save();
                steps = 'A';
              } else {
                //系统内部流水
                tenantJournalAccount_to_red = yield app.modelFactory().model_one(app.models['pub_tenantJournalAccount'], {
                  where: {
                    status: 1,
                    voucher_no: voucher_no_to_red,
                    tenantId: tenantId
                  }
                });
                if (!tenantJournalAccount_to_red || tenantJournalAccount_to_red.status == 0) {
                  this.body = app.wrapper.res.error({message: '无法找到需要冲红的流水记录!'});
                  yield next;
                  return;
                }

                if (!tenantJournalAccount_to_red.carry_over_flag) {
                  this.body = app.wrapper.res.error({message: '当前流水没有结转，无法冲红，可以修改或删除!'});
                  yield next;
                  return;
                }

                if (tenantJournalAccount_to_red.source_type == app.modelVariables.SOURCE_TYPES.ELDERLY) {
                  elderly = yield app.modelFactory().model_read(app.models['pub_elderly'], tenantJournalAccount_to_red.source_id);
                  if (!elderly || elderly.status == 0) {
                    this.body = app.wrapper.res.error({message: '无法找到老人!'});
                    yield next;
                    return;
                  }
                  // source_key ='$journal_account.voucher_no';
                  if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                    this.body = app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法冲红!'});
                    yield next;
                    return;
                  }
                } else {
                  this.body = app.wrapper.res.error({message: '当前流水没有记录来源，无法冲红!'});
                  yield next;
                  return;
                }

                console.log('前置检查完成');

                var tenant_json = tenant.toObject();
                raw_tenant_subsidiary_ledger = app.clone(tenant_json.subsidiary_ledger);

                remark = '系统内部流水';
                voucher_no = yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, tenantId);

                if (elderly) {
                  //系统内部流水追溯到老人
                  var elderly_json = elderly.toObject();
                  raw_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
                  raw_elderly_journal_account = app.clone(elderly_json.journal_account);

                  new_elderly_journal_account_item_B0003 = {
                    voucher_no: voucher_no,
                    revenue_and_expenditure_type: 'B0003',
                    digest: voucher_no_to_red,
                    amount: amount,
                    red_flag: true
                  };

                  elderly.journal_account.push(new_elderly_journal_account_item_B0003);
                  //冲红是支出+=
                  elderly.subsidiary_ledger.self += (new_elderly_journal_account_item_B0003.revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * new_elderly_journal_account_item_B0003.amount;

                  yield elderly.save();
                  steps = 'A';
                } else {
                  steps = 'Z';
                }

                new_tenantJournalAccount_B0008 = {
                  voucher_no: voucher_no,
                  revenue_and_expenditure_type: 'B0008',
                  digest: voucher_no_to_red,
                  amount: amount,
                  red_flag: true,
                  tenantId: tenant._id,
                  source_type: app.modelVariables.SOURCE_TYPES.ELDERLY,
                  source_id: elderly._id,
                  source_key: '$journal_account.voucher_no'
                };

                //更新租户分类账,冲红是支出+=
                tenant.subsidiary_ledger.self += (new_tenantJournalAccount_B0008.revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * new_tenantJournalAccount_B0008.amount;


                yield tenant.save();
                steps += 'B';

                new_tenantJournalAccount_B0008 = yield app.modelFactory().model_create(app.models['pub_tenantJournalAccount'], new_tenantJournalAccount_B0008);
                remove_tenantJournalAccount_B0008_id = new_tenantJournalAccount_B0008._id;
                steps += 'B';


              }

              red = yield app.modelFactory().model_create(app.models['pub_red'], {
                operated_by: operated_by,
                operated_by_name: operated_by_name,
                amount: amount,
                voucher_no_to_red: voucher_no_to_red,
                voucher_no: voucher_no,
                remark: remark,
                tenantId: tenant._id
              });
              red = yield app.modelFactory().model_create(app.models['pub_red'], red);

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      if (steps[i] == 'A') {
                        elderly.journal_account = raw_elderly_journal_account;
                        elderly.subsidiary_ledger = raw_elderly_subsidiary_ledger;
                        yield elderly.save();
                      }
                      break;
                    case 1:
                      if (steps[i] == 'B') {
                        tenant.subsidiary_ledger = raw_tenant_subsidiary_ledger;
                        yield tenant.save();
                      }
                      break;
                    case 2:
                      if (steps[i] == 'B') {
                        yield app.modelFactory().model_delete(app.models['pub_tenantJournalAccount'], remove_tenantJournalAccount_B0008_id)
                      }
                      break;
                  }
                }
              }
            }
            yield next;
          };
        }
      }, {
        method: 'checkCanChangeBookingOrUnbookingRedToElderlyRecharge', //检测是否能够修改或撤销冲红记录
        verb: 'get',
        url: this.service_url_prefix + "/checkCanChangeBookingOrUnbookingRedToElderlyRecharge/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var red, recharge_to_red, tenantJournalAccount_to_red, elderly, tenant;

            try {
              var itCan = true;

              red = yield app.modelFactory().model_read(app.models['pub_red'], this.params._id);
              if (!red || red.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到冲红记录!'});
                yield next;
                return;
              }

              recharge_to_red = yield app.modelFactory().model_one(app.models['psn_recharge'], {
                where: {
                  status: 1,
                  voucher_no: red.voucher_no_to_red,
                  tenantId: red.tenantId
                }
              });

              var elderlyId;

              recharge_to_red && (elderlyId = recharge_to_red.elderlyId);


              if (!elderlyId) {
                //冲红的是系统内部流水
                console.log('前置检查完成');
                tenantJournalAccount_to_red = yield app.modelFactory().model_one(app.models['pub_tenantJournalAccount'], {
                  where: {
                    status: 1,
                    voucher_no: red.voucher_no,
                    carry_over_flag: false,
                    tenantId: red.tenantId
                  }
                });

                itCan = tenantJournalAccount_to_red != null;
              } else {
                //冲红的是充值记录，则通过其找到目标老人
                elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
                if (!elderly || elderly.status == 0) {
                  this.body = app.wrapper.res.error({message: '无法找到老人!'});
                  yield next;
                  return;
                }
                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                  this.body = app.wrapper.res.error({
                    itCan: false,
                    message: '当前老人不在院或正在办理出院手续，无法记账!'
                  });
                  yield next;
                  return;
                }

                console.log('前置检查完成');

                var elderly_json = elderly.toObject();

                var bookingJournalAccountItem = app._.findWhere(elderly_json.journal_account, {
                  voucher_no: red.voucher_no,
                  carry_over_flag: false
                });

                itCan = bookingJournalAccountItem != null;
              }

              this.body = app.wrapper.res.ret({itCan: itCan});
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

            }
            yield next;
          };
        }
      }, {
        method: 'disableRedAndUnbookingToElderlyRecharge',
        verb: 'post',
        url: this.service_url_prefix + "/disableRedAndUnbookingToElderlyRecharge/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var red, recharge_to_red, tenantJournalAccount_to_red, elderly, tenant;
            var raw_red_status, raw_red_operated_by, raw_red_operated_by_name, raw_elderly_subsidiary_ledger,
              raw_elderly_journal_account, raw_tenantJournalAccountStatus, raw_tenant_subsidiary_ledger;
            try {
              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;
              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }


              red = yield app.modelFactory().model_read(app.models['pub_red'], this.params._id);
              if (!red || red.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到充红记录!'});
                yield next;
                return;
              }

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], red.tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到租户资料!'});
                yield next;
                return;
              }

              recharge_to_red = yield app.modelFactory().model_one(app.models['psn_recharge'], {
                where: {
                  status: 1,
                  voucher_no: red.voucher_no_to_red,
                  tenantId: red.tenantId
                }
              });

              var elderlyId;
              recharge_to_red && recharge_to_red.status == 1 && (elderlyId = recharge_to_red.elderlyId);

              if (!elderlyId) {
                //撤销冲红的是系统内部流水
                tenantJournalAccount_to_red = yield app.modelFactory().model_one(app.models['pub_tenantJournalAccount'], {
                  where: {
                    status: 1,
                    voucher_no: red.voucher_no,
                    tenantId: red.tenantId,
                    red_flag: true
                  }
                });

                if (!tenantJournalAccount_to_red) {
                  this.body = app.wrapper.res.error({message: '无法找到需要撤销的流水记录!'});
                  yield next;
                  return;
                } else if (tenantJournalAccount_to_red.carry_over_flag) {
                  this.body = app.wrapper.res.error({message: '当前流水记录已经结转!'});
                  yield next;
                  return;
                }

                var index = -1,
                  elderly_json, amountOfElderlyJournalAccount;
                //通过source_type,source_id找到对应的老人冲红流水删除
                if (tenantJournalAccount_to_red.source_type == app.modelVariables.SOURCE_TYPES.ELDERLY) {
                  elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], tenantJournalAccount_to_red.source_id);
                  if (!elderly || elderly.status == 0) {
                    this.body = app.wrapper.res.error({message: '无法找到老人!'});
                    yield next;
                    return;
                  }
                  if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                    this.body = app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法撤销冲红!'});
                    yield next;
                    return;
                  }

                  elderly_json = elderly.toObject();
                  raw_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
                  raw_elderly_journal_account = app.clone(elderly_json.journal_account);

                  index = -1;
                  for (var i = 0; i < elderly.journal_account.length; i++) {
                    if (elderly.journal_account[i].voucher_no == red.voucher_no && elderly.journal_account[i].red_flag) {
                      index = i;
                      break;
                    }
                  }

                  if (index == -1) {
                    this.body = app.wrapper.res.error({message: '无法找到需要撤销的老人流水记录!'});
                    yield next;
                    return;
                  }

                  if (elderly.journal_account[index].carry_over_flag) {
                    this.body = app.wrapper.res.error({message: '当前流水记录已经结转!'});
                    yield next;
                    return;
                  }

                  amountOfElderlyJournalAccount = (elderly.journal_account[index].revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * elderly.journal_account[index].amount;

                  console.log('前置检查完成');
                  console.log(elderly.journal_account.length);
                  elderly.journal_account.splice(index, 1);
                  console.log(elderly.journal_account.length);
                  //冲红是支出，并且是撤销-=
                  elderly.subsidiary_ledger.self -= amountOfElderlyJournalAccount;

                  yield elderly.save();
                  steps = 'A';
                } else {
                  this.body = app.wrapper.res.error({message: '当前流水没有记录来源，无法撤销冲红!'});
                  yield next;
                  return;
                }

                var tenant_json = tenant.toObject();
                raw_tenant_subsidiary_ledger = app.clone(tenant_json.subsidiary_ledger);
                raw_tenantJournalAccountStatus = tenantJournalAccount_to_red.status;

                //更新租户分类账,撤销冲红-=
                tenant.subsidiary_ledger.self -= (tenantJournalAccount_to_red.revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * tenantJournalAccount_to_red.amount;
                yield tenant.save();
                steps += 'A';

                tenantJournalAccount_to_red.status = 0;
                yield tenantJournalAccount_to_red.save();
                steps += 'A';

              } else {
                //撤销冲红的是充值记录，则通过其找到目标老人

                elderly = yield app.modelFactory().model_read(app.models['pub_elderly'], recharge_to_red.elderlyId);
                if (!elderly || elderly.status == 0) {
                  this.body = app.wrapper.res.error({message: '无法找到老人资料!'});
                  yield next;
                  return;
                }

                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                  this.body = app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法记账!'});
                  yield next;
                  return;
                }

                elderly_json = elderly.toObject();
                raw_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
                raw_elderly_journal_account = app.clone(elderly_json.journal_account);

                index = -1;
                console.log('red.voucher_no:' + red.voucher_no);
                for (var i = 0; i < elderly.journal_account.length; i++) {

                  if (elderly.journal_account[i].voucher_no == red.voucher_no && elderly.journal_account[i].red_flag) {
                    index = i;
                    break;
                  }
                }

                if (index == -1) {
                  this.body = app.wrapper.res.error({message: '无法找到需要撤销的老人流水记录!'});
                  yield next;
                  return;
                }

                if (elderly.journal_account[index].carry_over_flag) {
                  this.body = app.wrapper.res.error({message: '当前流水记录已经结转!'});
                  yield next;
                  return;
                }

                amountOfElderlyJournalAccount = (elderly.journal_account[index].revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * elderly.journal_account[index].amount;

                console.log('前置检查完成');
                console.log(elderly.journal_account.length);
                elderly.journal_account.splice(index, 1);
                console.log(elderly.journal_account.length);
                //冲红是支出，并且是撤销-=
                elderly.subsidiary_ledger.self -= amountOfElderlyJournalAccount;

                yield elderly.save();
                steps = 'A';
              }

              raw_red_status = red.status;
              raw_red_operated_by = red.operated_by;
              raw_red_operated_by_name = red.operated_by_name;

              red.status = 0;
              red.operated_by = operated_by;
              red.operated_by_name = operated_by_name;

              yield red.save();
              steps += 'B';

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      elderly.subsidiary_ledger = raw_elderly_subsidiary_ledger;
                      elderly.journal_account = raw_elderly_journal_account;
                      yield elderly.save();
                      break;
                    case 1:
                      if (steps[i] == 'A') {
                        tenant.subsidiary_ledger = raw_tenant_subsidiary_ledger;
                        yield tenant.save();
                      }
                      break;
                    case 2:
                      tenantJournalAccount_to_red.status = raw_tenantJournalAccountStatus;
                      yield tenantJournalAccount_to_red.save();
                      break;
                  }
                }
              }
            }
            yield next;
          };
        }
      }, {
        method: 'changeRedBookingAmountToElderlyRecharge',
        verb: 'post',
        url: this.service_url_prefix + "/changeRedBookingAmountToElderlyRecharge/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var red, recharge_to_red, tenantJournalAccount_to_red, elderly, tenant;
            var raw_red_operated_by, raw_red_operated_by_name, raw_elderly_subsidiary_ledger,
              raw_elderly_journal_account, raw_tenantJournalAccountAmount, raw_tenant_subsidiary_ledger;
            try {
              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;
              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }

              red = yield app.modelFactory().model_read(app.models['pub_red'], this.params._id);
              if (!red || red.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到充红记录!'});
                yield next;
                return;
              }

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], red.tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到租户资料!'});
                yield next;
                return;
              }

              recharge_to_red = yield app.modelFactory().model_one(app.models['psn_recharge'], {
                where: {
                  status: 1,
                  voucher_no: red.voucher_no_to_red,
                  tenantId: red.tenantId
                }
              });

              var newBookingAmount = red.amount;
              var oldBookingAmount = 0;
              var elderlyId;
              recharge_to_red && recharge_to_red.status == 1 && (elderlyId = recharge_to_red.elderlyId);

              if (!elderlyId) {
                //撤销冲红的是系统内部流水
                tenantJournalAccount_to_red = yield app.modelFactory().model_one(app.models['pub_tenantJournalAccount'], {
                  where: {
                    status: 1,
                    voucher_no: red.voucher_no,
                    tenantId: red.tenantId,
                    red_flag: true
                  }
                });

                if (!tenantJournalAccount_to_red) {
                  this.body = app.wrapper.res.error({message: '无法找到需要修改的流水记录!'});
                  yield next;
                  return;
                } else if (tenantJournalAccount_to_red.carry_over_flag) {
                  this.body = app.wrapper.res.error({message: '当前流水记录已经结转!'});
                  yield next;
                  return;
                }

                var index = -1,
                  elderly_json, amountOfElderlyJournalAccountToCancel, amountOfElderlyJournalAccountToRed
                //通过source_type,source_id找到对应的老人冲红流水删除
                if (tenantJournalAccount_to_red.source_type == app.modelVariables.SOURCE_TYPES.ELDERLY) {
                  elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], tenantJournalAccount_to_red.source_id);
                  if (!elderly || elderly.status == 0) {
                    this.body = app.wrapper.res.error({message: '无法找到老人!'});
                    yield next;
                    return;
                  }
                  if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                    this.body = app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法修改冲红!'});
                    yield next;
                    return;
                  }

                  elderly_json = elderly.toObject();
                  raw_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
                  raw_elderly_journal_account = app.clone(elderly_json.journal_account);

                  for (var i = 0; i < elderly.journal_account.length; i++) {
                    if (elderly.journal_account[i].voucher_no == red.voucher_no && elderly.journal_account[i].red_flag) {
                      index = i;
                      oldBookingAmount = elderly.journal_account[i].amount;
                      elderly.journal_account[i].amount = newBookingAmount;
                      break;
                    }
                  }

                  console.log(oldBookingAmount);
                  console.log(newBookingAmount);

                  if (index == -1) {
                    this.body = app.wrapper.res.error({message: '无法找到需要撤销的老人流水记录!'});
                    yield next;
                    return;
                  }

                  if (elderly.journal_account[index].carry_over_flag) {
                    this.body = app.wrapper.res.error({message: '当前流水记录已经结转!'});
                    yield next;
                    return;
                  }

                  amountOfElderlyJournalAccountToCancel = (elderly.journal_account[index].revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * oldBookingAmount;
                  amountOfElderlyJournalAccountToRed = (elderly.journal_account[index].revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * newBookingAmount;

                  console.log('前置检查完成');
                  //冲红是支出，并且先撤销-=，后冲红+=
                  elderly.subsidiary_ledger.self -= amountOfElderlyJournalAccountToCancel;
                  elderly.subsidiary_ledger.self += amountOfElderlyJournalAccountToRed;

                  yield elderly.save();
                  steps = 'A';
                } else {
                  this.body = app.wrapper.res.error({message: '当前流水没有记录来源，无法修改冲红!'});
                  yield next;
                  return;
                }

                var tenant_json = tenant.toObject();
                raw_tenant_subsidiary_ledger = app.clone(tenant_json.subsidiary_ledger);
                raw_tenantJournalAccountAmount = tenantJournalAccount_to_red.amount;

                //更新租户分类账,先撤销冲红-=，后冲红+=
                tenant.subsidiary_ledger.self -= (tenantJournalAccount_to_red.revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * oldBookingAmount;
                tenant.subsidiary_ledger.self += (tenantJournalAccount_to_red.revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * newBookingAmount;
                yield tenant.save();
                steps += 'A';

                tenantJournalAccount_to_red.amount = newBookingAmount;
                yield tenantJournalAccount_to_red.save();
                steps += 'A';

              } else {
                //撤销冲红的是充值记录，则通过其找到目标老人

                elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], recharge_to_red.elderlyId);
                if (!elderly || elderly.status == 0) {
                  this.body = app.wrapper.res.error({message: '无法找到老人!'});
                  yield next;
                  return;
                }

                if (!elderly.live_in_flag || elderly.begin_exit_flow) {
                  this.body = app.wrapper.res.error({message: '当前老人不在院或正在办理出院手续，无法记账!'});
                  yield next;
                  return;
                }

                elderly_json = elderly.toObject();
                raw_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
                raw_elderly_journal_account = app.clone(elderly_json.journal_account);

                console.log('red.voucher_no:' + red.voucher_no);
                for (var i = 0; i < elderly.journal_account.length; i++) {

                  if (elderly.journal_account[i].voucher_no == red.voucher_no && elderly.journal_account[i].red_flag) {
                    index = i;
                    oldBookingAmount = elderly.journal_account[i].amount;
                    elderly.journal_account[i].amount = newBookingAmount;
                    break;
                  }
                }

                console.log(oldBookingAmount);
                console.log(newBookingAmount);

                if (index == -1) {
                  this.body = app.wrapper.res.error({message: '无法找到需要修改的老人流水记录!'});
                  yield next;
                  return;
                }

                if (elderly.journal_account[index].carry_over_flag) {
                  this.body = app.wrapper.res.error({message: '当前流水记录已经结转!'});
                  yield next;
                  return;
                }

                amountOfElderlyJournalAccountToCancel = (elderly.journal_account[index].revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * oldBookingAmount;
                amountOfElderlyJournalAccountToRed = (elderly.journal_account[index].revenue_and_expenditure_type.substr(0, 1) == 'B' ? -1 : 1) * newBookingAmount;

                console.log('前置检查完成');
                //冲红是支出，并且先撤销-= 后冲红+=
                elderly.subsidiary_ledger.self -= amountOfElderlyJournalAccountToCancel;
                elderly.subsidiary_ledger.self += amountOfElderlyJournalAccountToRed;

                yield elderly.save();
                steps = 'A';
              }


              raw_red_operated_by = red.operated_by;
              raw_red_operated_by_name = red.operated_by_name;

              red.operated_by = operated_by;
              red.operated_by_name = operated_by_name;

              yield red.save();
              steps += 'B';

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      elderly.subsidiary_ledger = raw_elderly_subsidiary_ledger;
                      elderly.journal_account = raw_elderly_journal_account;
                      yield elderly.save();
                      break;
                    case 1:
                      if (steps[i] == 'A') {
                        tenant.subsidiary_ledger = raw_tenant_subsidiary_ledger;
                        yield tenant.save();
                      }
                      break;
                    case 2:
                      tenantJournalAccount_to_red.amount = raw_tenantJournalAccountAmount;
                      yield tenantJournalAccount_to_red.save();
                      break;
                  }
                }
              }
            }
            yield next;
          };
        }
      },
      /**********************房间相关*****************************/
      {
        method: 'excel$roomBedPrintQRLabel',
        verb: 'post',
        url: this.service_url_prefix + "/excel/roomBedPrintQRLabel",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var file_name = this.request.body.file_name;
              var where = {
                status: 1,
                stop_flag: false,
                tenantId: tenantId
              }
              var rooms = yield app.modelFactory().model_query(app.models['psn_room'], {
                select: 'name floor capacity forbiddens districtId tenantId',
                where: where
              }).populate('districtId', 'name').populate('tenantId', 'name');
              // console.log('rooms:', rooms);
              var rows = [], room_full_name, forbiddens;
              app._.each(rooms, (room) => {
                for (var i = 0, len = room.capacity; i < len; i++) {
                  forbiddens = room.forbiddens;
                  console.log('room:', room);
                  if (forbiddens && forbiddens.length > 0 && app._.contains(forbiddens, i + 1)) {
                    continue;
                  }

                  room_full_name = [room.districtId.name, room.floor + 'F', room.name, (i + 1) + '#床'].join('-');
                  rows.push({
                    '单位名称': room.tenantId.name,
                    '二维码': {tenantId: tenantId, roomId: room.id, bed_no: (i + 1), name: room_full_name},
                    '房间床位': room_full_name
                  });
                }
              });

              console.log('rows:', rows);

              // this.response.attachment = file_name;
              this.set('Parse', 'no-parse');
              this.body = yield app.excel_service.build(file_name, rows, ['单位名称', '二维码', '房间床位']);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'roomStatusInfo',
        verb: 'get',
        url: this.service_url_prefix + "/roomStatusInfo/:tenantId",
        handler: function (app, options) {
          return function*(next) {
            try {

              var roomStatuses = yield app.modelFactory().model_query(app.models['psn_roomStatus'], {where: {tenantId: this.params.tenantId}})
                .populate({
                  path: 'occupied.elderlyId',
                  select: '-_id name'
                });
              this.body = app.wrapper.res.rows(roomStatuses);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'updateRoomStatusInfo',
        verb: 'post',
        url: this.service_url_prefix + "/updateRoomStatusInfo",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var tenant, elderly, room;
            var remove_created_roomStatus_id, raw_bed_status_for_cancel_occupy_roomStatus,
              raw_elderly_for_cancel_occupy_roomStatus;
            var cancel_occupy, cancel_occupy_roomStatus;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              var roomId = this.request.body.roomId;
              var bed_no = this.request.body.bed_no;
              var elderlyId = this.request.body.elderlyId;

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }
              room = yield app.modelFactory().model_read(app.models['psn_room'], roomId);
              if (!room || room.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到房间!'});
                yield next;
                return;
              }
              if (Number(bed_no) > room.capacity) {
                this.body = app.wrapper.res.error({message: '无效的床位号，该房间最多支持' + room.capacity + '床位!'});
                yield next;
                return;
              }
              console.log('前置检查完成');

              //检查入住老人有没有其他的预占用或在用记录
              var toUpdateRoomStatus = [];
              var toCreateRoomStatus;
              var roomStatuses = yield app.modelFactory().model_query(app.models['psn_roomStatus'], {where: {tenantId: tenantId}});
              for (var i = 0; i < roomStatuses.length; i++) {
                if (roomStatuses[i].occupied) {
                  for (var j = 0; j < roomStatuses[i].occupied.length; j++) {

                    var occupy = roomStatuses[i].occupied[j];
                    if (elderlyId == occupy.elderlyId) {
                      if (occupy.bed_status == 'A0003') {
                        this.body = app.wrapper.res.error({message: '该老人已经入住到其他床位，请使用换床功能!!'});
                        yield next;
                        return;
                      }

                      raw_bed_status_for_cancel_occupy_roomStatus = occupy.bed_status;
                      raw_elderly_for_cancel_occupy_roomStatus = occupy.elderlyId;
                      cancel_occupy = occupy;
                      cancel_occupy_roomStatus = roomStatuses[i];

                      occupy.bed_status = 'A0001';
                      occupy.elderlyId = undefined;

                      console.log(roomStatuses[i]);
                      toUpdateRoomStatus.push(roomStatuses[i]);

                    }
                  }
                }
              }


              var roomStatus;
              for (var i = 0; i < roomStatuses.length; i++) {
                if (roomId == roomStatuses[i].roomId) {
                  roomStatus = roomStatuses[i];
                  break;
                }
              }

              if (!roomStatus) {
                console.log('create:' + roomId);
                toCreateRoomStatus = {
                  roomId: roomId,
                  occupied: [{bed_no: bed_no, bed_status: 'A0002', elderlyId: elderlyId}],
                  tenantId: tenantId
                };
              } else {
                var bedInfo1
                for (var i = 0; i < roomStatus.occupied.length; i++) {
                  if (bed_no == roomStatus.occupied[i].bed_no) {
                    bedInfo1 = roomStatus.occupied[i];
                  }
                }

                if (!bedInfo1) {
                  roomStatus.occupied.push({
                    bed_no: bed_no,
                    bed_status: 'A0002',
                    elderlyId: elderlyId
                  });
                } else {
                  //判断要入住的床位是否有其他老人，如有其他老人已经预占则返回
                  if (bedInfo1.elderlyId && bedInfo1.elderlyId != elderlyId) {
                    //改成
                    this.body = app.wrapper.res.error({message: '该床位已经被占用，请刷新床位信息!'});
                    yield next;
                    return;
                  }
                  bedInfo1.bed_status = 'A0002';
                  bedInfo1.elderlyId = elderlyId;

                }

                toUpdateRoomStatus.push(roomStatus);
              }

              if (toCreateRoomStatus) {
                remove_created_roomStatus_id = (yield app.modelFactory().model_create(app.models['psn_roomStatus'], toCreateRoomStatus))._id;
                steps = 'A';
              }

              for (var i = 0; i < toUpdateRoomStatus.length; i++) {
                yield toUpdateRoomStatus[i].save();
                steps += "A";
              }
              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      yield app.modelFactory().model_delete(app.models['psn_roomStatus'], remove_created_roomStatus_id)
                      break;
                    case 1:
                      if (cancel_occupy_roomStatus) {
                        cancel_occupy.bed_status = raw_bed_status_for_cancel_occupy_roomStatus;
                        cancel_occupy.elderlyId = raw_elderly_for_cancel_occupy_roomStatus;
                      }
                      yield cancel_occupy_roomStatus.save();
                      break;
                  }
                }
              }
            }
            yield next;
          };
        }
      },
      /**********************房间配置相关*****************************/
      {
        method: 'robotRemoveRoomConfig',
        verb: 'post',
        url: this.service_url_prefix + "/robotRemoveRoomConfig",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var tenant, robot, rooms, room, robots;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              var robotId = this.request.body.robotId;

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              robot = yield app.modelFactory().model_read(app.models['pub_robot'], robotId);
              if (!robot || robot.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到机器人!'});
                yield next;
                return;
              }

              rooms = yield app.modelFactory().model_query(app.models['psn_room'], {
                where: {
                  robots: {$elemMatch: {$eq: robotId}},
                  tenantId: tenantId
                }
              });
              console.log(rooms);
              if (rooms.length == 0) {
                this.body = app.wrapper.res.default();
                yield next;
                return;
              }

              console.log('前置检查完成');

              for (var i = 0, len = rooms.length; i < len; i++) {
                room = rooms[i];
                robots = room.toObject().robots;
                var inIndex = robots.findIndex((o) => {
                  return o == robotId
                });

                if (inIndex != -1) {
                  robots.splice(inIndex, 1);
                }
                // console.log(inIndex)
                room.robots = robots;
                // console.log(room.robots)
                yield room.save();
              }

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'bedMonitorRemoveRoomConfig',
        verb: 'post',
        url: this.service_url_prefix + "/bedMonitorRemoveRoomConfig",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var tenant, bedMonitor, rooms, room, bedMonitors;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              var bedMonitorId = this.request.body.bedMonitorId;

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              bedMonitor = yield app.modelFactory().model_read(app.models['pub_bedMonitor'], bedMonitorId);
              if (!bedMonitor || bedMonitor.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到睡眠带!'});
                yield next;
                return;
              }

              rooms = yield app.modelFactory().model_query(app.models['psn_room'], {
                where: {
                  "bedMonitors.bedMonitorId": bedMonitorId, // bedMonitors: {$elemMatch:{bedMonitorId: bedMonitorId}},
                  tenantId: tenantId
                }
              });

              console.log(rooms);
              if (rooms.length == 0) {
                this.body = app.wrapper.res.default();
                yield next;
                return;
              }


              console.log('前置检查完成');
              for (var i = 0, len = rooms.length; i < len; i++) {
                room = rooms[i];
                bedMonitors = room.toObject().bedMonitors;
                var inIndex = bedMonitors.findIndex((o) => {
                  return o.bedMonitorId == bedMonitorId
                });

                if (inIndex != -1) {
                  bedMonitors.splice(inIndex, 1);
                }
                room.bedMonitors = bedMonitors;
                yield room.save();
              }

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'bedMonitorUseCheck',
        verb: 'post',
        url: this.service_url_prefix + "/bedMonitorUseCheck",
        handler: function (app, options) {
          return function*(next) {
            try {
              var bedMonitorName = this.request.body.bedMonitorName;
              var tenantId = this.request.body.tenantId;
              var resTxt, tenantIdsInUse = [];
              var bedMonitors = yield app.modelFactory().model_query(app.models['pub_bedMonitor'], {where: {name: bedMonitorName}});
              console.log('bedMonitors:', bedMonitors, 'bedMonitorName:', bedMonitorName);
              if (bedMonitors.length > 0) {
                for (var i = 0, len = bedMonitors.length; i < len; i++) {
                  if (!bedMonitors[i].stop_flag) {
                    tenantIdsInUse.push(bedMonitors[i].tenantId);
                  }
                }
              } else {
                if (bedMonitorName) {
                  resTxt = false;
                }
              }
              if (tenantIdsInUse.length > 0) {
                var tenantsInUse = yield app.modelFactory().model_query(app.models['pub_tenant'], {select: '-_id name', where: {_id: {$in: tenantIdsInUse}}});
                console.log('tenantsInUse:', tenantsInUse);
                resTxt = [];
                for (var i = 0, len = tenantsInUse.length; i < len; i++) {
                  resTxt.push(tenantsInUse[i].name);
                }
              } else if (bedMonitors.length > 0 && tenantIdsInUse.length == 0) {
                resTxt = false;
              }

              this.body = app.wrapper.res.ret(resTxt);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************入院相关*****************************/
      {
        method: 'completeEnter', //完成入院
        verb: 'post',
        url: this.service_url_prefix + "/completeEnter/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var enter, tenant, elderly, roomStatus, roomOccupancyChangeHistory, recharge,
              journal_account_item_A0001, journal_account_item_B0001,
              tenantJournalAccount_A0001;
            var raw_enter_operated_by, raw_enter_operated_by_name;
            var old_current_register_step, old_live_in_flag, old_enter_code, old_enter_on,
              old_charging_on_of_monthly_prepay, old_remark, old_roomStatus_occupied,
              old_elderly_journal_account, old_elderly_subsidiary_ledger, old_tenant_subsidiary_ledger;

            var remove_roomStatus_id, remove_roomOccupancyChangeHistory_id, remove_tenantJournalAccount_A0001_id;
            try {
              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;
              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }

              //1、订单状态改为[入院成功]
              enter = yield app.modelFactory().model_read(app.models['psn_enter'], this.params._id);

              if (!enter || enter.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到入院记录!'});
                yield next;
                return;
              }
              var enter_json = enter.toObject();
              raw_enter_operated_by = enter_json.operated_by;
              raw_enter_operated_by_name = enter_json.operated_by_name;
              old_current_register_step = enter_json.current_register_step;
              enter.operated_by = operated_by;
              enter.operated_by_name = operated_by_name;
              enter.current_register_step = 'A0007';
              console.log('prepare 1');
              //2、获取租户信息
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], enter.tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构资料!'});
                yield next;
                return;
              }
              console.log('prepare 2');
              //3、正式入院后从入院单中复制
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], enter.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }


              var elderly_json = elderly.toObject();


              old_live_in_flag = elderly.live_in_flag;
              old_enter_code = undefined;
              old_enter_on = undefined;
              old_charging_on_of_monthly_prepay = undefined;
              old_remark = elderly.remark;
              if (!old_remark)
                old_remark = undefined;

              elderly.live_in_flag = true;
              elderly.enter_code = enter.code;
              elderly.enter_on = enter.enter_on;
              elderly.charging_on_of_monthly_prepay = enter.enter_on;
              if (!elderly.remark)
                elderly.remark = enter.remark;
              console.log('prepare 3');
              //4、更新房间床位信息
              var roomId = elderly.room_value.roomId;
              var bed_no = elderly.room_value.bed_no;
              roomStatus = yield app.modelFactory().model_one(app.models['psn_roomStatus'], {where: {roomId: roomId}});
              if (!roomStatus) {
                roomStatus = {
                  roomId: roomId,
                  occupied: [{bed_no: bed_no, bed_status: 'A0003', elderlyId: enter.elderlyId}],
                  tenantId: enter.tenantId
                };
              } else {
                old_roomStatus_occupied = app.clone(roomStatus.toObject().occupied);
                if (!old_roomStatus_occupied)
                  old_roomStatus_occupied = undefined;

                if (roomStatus.occupied) {
                  for (var i = 0; i < roomStatus.occupied.length; i++) {
                    console.log(typeof elderly.toObject()._id);
                    console.log(typeof roomStatus.occupied[i].toObject().elderlyId);
                    console.log(elderly._id.equals(roomStatus.occupied[i].elderlyId));
                    if (roomStatus.occupied[i].bed_no == bed_no && elderly._id.equals(roomStatus.occupied[i].elderlyId)) {
                      roomStatus.occupied[i].bed_status = 'A0003';
                    }
                  }
                }
              }

              console.log('prepare 4');
              //5、增加房间状态变动历史
              roomOccupancyChangeHistory = {
                roomId: roomId,
                bed_no: bed_no,
                room_summary: elderly.room_summary,
                elderlyId: elderly._id,
                elderly_summary: elderly.name + ' ' + elderly.id_no,
                in_flag: true,
                tenantId: enter.tenantId
              };
              console.log('prepare 5');
              //6、增加老人资金流水
              //6.1个人存款
              journal_account_item_A0001 = {
                voucher_no: yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, elderly_json.tenantId),
                revenue_and_expenditure_type: 'A0001',
                digest: '入院登记号:' + enter.code + app.dictionary.pairs["D3002"]['A0001'].name,
                amount: enter.deposit
              };
              //个人预存增加一条充值记录
              recharge = {
                operated_by: operated_by,
                operated_by_name: operated_by_name,
                enter_code: enter_json.code,
                elderlyId: elderly._id,
                elderly_name: elderly_json.name,
                type: 'A0001',
                amount: journal_account_item_A0001.amount,
                voucher_no: journal_account_item_A0001.voucher_no,
                remark: '老人入院时支付完成',
                tenantId: elderly.tenantId
              };

              //6.2预付月租
              journal_account_item_B0001 = {
                voucher_no: yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, elderly_json.tenantId),
                revenue_and_expenditure_type: 'B0001',
                digest: app.moment().format('YYYY-MM'),
                amount: enter.sum_period_price * 1
              };

              old_elderly_journal_account = app.clone(elderly_json.journal_account);
              if (!old_elderly_journal_account)
                old_elderly_journal_account = undefined;

              if (!elderly.journal_account)
                elderly.journal_account = [];
              elderly.journal_account.push(journal_account_item_A0001);
              elderly.journal_account.push(journal_account_item_B0001);
              console.log('prepare 6');

              //7、增加租户资金流水
              tenantJournalAccount_A0001 = {
                voucher_no: journal_account_item_B0001.voucher_no,
                revenue_and_expenditure_type: 'A0001',
                digest: elderly.name + ' ' + journal_account_item_B0001.digest,
                amount: journal_account_item_B0001.amount,
                source_type: app.modelVariables.SOURCE_TYPES.ELDERLY,
                source_id: elderly._id,
                source_key: '$journal_account.voucher_no',
                tenantId: enter.tenantId
              };
              console.log('prepare 7');

              //8、修改老人明细账
              old_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
              elderly.subsidiary_ledger.self += journal_account_item_A0001.amount - journal_account_item_B0001.amount;
              console.log('prepare 8');
              //9、修改租户明细账
              old_tenant_subsidiary_ledger = app.clone(tenant.toObject().subsidiary_ledger);
              tenant.subsidiary_ledger.self += tenantJournalAccount_A0001.amount;
              console.log('prepare 9');
              //commit 原子事务性保存

              yield enter.save();
              steps = "A";
              yield elderly.save();
              steps += "A";
              if (roomStatus._id) {
                yield roomStatus.save();
                steps += "A";
              } else {
                roomStatus = yield app.modelFactory().model_create(app.models['psn_roomStatus'], roomStatus);
                remove_roomStatus_id = roomStatus._id;
                steps += "B";
              }
              roomOccupancyChangeHistory = yield app.modelFactory().model_create(app.models['psn_roomOccupancyChangeHistory'], roomOccupancyChangeHistory);
              remove_roomOccupancyChangeHistory_id = roomOccupancyChangeHistory._id;
              steps += "A";
              tenantJournalAccount_A0001 = yield app.modelFactory().model_create(app.models['pub_tenantJournalAccount'], tenantJournalAccount_A0001);
              remove_tenantJournalAccount_A0001_id = tenantJournalAccount_A0001._id;
              steps += "A";
              yield tenant.save();
              steps += "A";
              recharge = yield app.modelFactory().model_create(app.models['psn_recharge'], recharge);

              this.body = app.wrapper.res.ret({current_register_step: enter.current_register_step});
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      enter.operated_by = raw_enter_operated_by;
                      enter.operated_by_name = raw_enter_operated_by_name;
                      enter.current_register_step = old_current_register_step;
                      yield enter.save();
                      break;
                    case 1:
                      elderly.live_in_flag = old_live_in_flag;
                      elderly.enter_code = old_enter_code;
                      elderly.enter_on = old_enter_on;
                      elderly.charging_on_of_monthly_prepay = old_charging_on_of_monthly_prepay;
                      elderly.remark = old_remark;
                      elderly.journal_account = old_elderly_journal_account;
                      elderly.subsidiary_ledger = old_elderly_subsidiary_ledger;
                      yield elderly.save();
                      break;
                    case 2:
                      if (steps[i] == 'A') {
                        //修改
                        roomStatus.occupied = old_roomStatus_occupied;
                        yield roomStatus.save();
                      } else {
                        //删除
                        yield app.modelFactory().delete(roomStatusModelOption.model_name, roomStatusModelOption.model_path, remove_roomStatus_id);
                      }
                      break;
                    case 3:
                      yield app.modelFactory().model_delete(app.models['psn_roomOccupancyChangeHistory'], remove_roomOccupancyChangeHistory_id);
                      break;
                    case 4:
                      yield app.modelFactory().model_delete(app.models['pub_tenantJournalAccount'], remove_tenantJournalAccount_A0001_id);
                      break;
                    case 5:
                      tenant.subsidiary_ledger = old_tenant_subsidiary_ledger;
                      tenant.save();
                      break;
                  }
                }
              }

            }
            yield next;
          };
        }
      }, {
        method: 'disableEnterRelatedAction', //作废入院记录的相关动作
        verb: 'post',
        url: this.service_url_prefix + "/disableEnterRelatedAction/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var enter, tenant, elderly;
            var toUpdateRoomStatus = [];
            var arr_old_roomStatus_occupied = [];

            try {
              //1、订单状态改为[入院成功]
              enter = yield app.modelFactory().model_read(app.models['psn_enter'], this.params._id);
              if (!enter || enter.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到入院记录!'});
                yield next;
                return;
              }
              console.log('prepare 1');
              //2、获取租户信息
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], enter.tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }
              console.log('prepare 2');
              //3、判断老人是否在院
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], enter.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人资料!'});
                yield next;
                return;
              }
              if (elderly.live_in_flag) {
                this.body = app.wrapper.res.error({message: '老人已经在院，必须办理出院手续!'});
                yield next;
                return;
              }

              //解除预占用
              var roomStatuses = yield app.modelFactory().model_query(app.models['psn_roomStatus'], {where: {tenantId: enter.tenantId}});
              for (var i = 0; i < roomStatuses.length; i++) {
                if (roomStatuses[i].occupied) {
                  var old_roomStatus_occupied = app.clone(roomStatuses[i].toObject().occupied);

                  for (var j = 0; j < roomStatuses[i].occupied.length; j++) {
                    var occupy = roomStatuses[i].occupied[j];
                    if (elderly._id.equals(occupy.elderlyId)) {
                      occupy.bed_status = 'A0001';
                      occupy.elderlyId = undefined;
                      arr_old_roomStatus_occupied.push(old_roomStatus_occupied);
                      toUpdateRoomStatus.push(roomStatuses[i]);
                    }
                  }
                }
              }

              for (var i = 0; i < toUpdateRoomStatus.length; i++) {
                yield toUpdateRoomStatus[i].save();
                steps += "A";
              }

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  var roomStatus = toUpdateRoomStatus[i];
                  roomStatus.occupied = arr_old_roomStatus_occupied[i];
                  yield roomStatus.save();
                }
              }

            }
            yield next;
          };
        }
      }, {
        method: 'checkBeforeAddEnter', //入院前前检测
        verb: 'get',
        url: this.service_url_prefix + "/checkBeforeAddEnter/:tenantId/:id_no",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var enter, tenant, elderly;
            var toUpdateRoomStatus = [];
            var arr_old_roomStatus_occupied = [];

            try {
              var tenantId = this.params.tenantId;
              var id_no = this.params.id_no;
              var canAdd = true;

              //1、获取租户信息
              tenant = yield app.modelFactory().model_read(app.models["pub_tenant"], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构资料!'});
                yield next;
                return;
              }
              console.log('prepare 1');
              //2、判断老人是否在院
              elderly = yield app.modelFactory().model_one(app.models['psn_elderly'], {
                where: {
                  id_no: id_no,
                  tenantId: tenantId
                },
                select: '_id status live_in_flag name id_no sex birthday marriage home_address family_members medical_insurance politics_status inhabit_status financial_status hobbies medical_histories remark'
              });
              if (elderly && elderly.status == 1) {

                if (elderly.live_in_flag) {
                  console.log('老人已经在院，无法办理入院手续!');
                  this.body = app.wrapper.res.error({message: '老人已经在院，无法办理入院手续!'});
                  yield next;
                  return;
                }
              }
              console.log('prepare 2');
              //3、判断老人是否同时存在其他未确认的入院记录
              if (elderly && elderly._id) {
                var enters = yield app.modelFactory().model_query(app.models['psn_enter'], {
                  where: {
                    elderlyId: elderly._id,
                    current_register_step: {"$in": ['A0001', 'A0003', 'A0005']},
                    tenantId: tenantId,
                    status: 1
                  }
                });

                if (enters && enters.length > 0) {
                  this.body = app.wrapper.res.error({message: '系统检测到该老人已经存在其他入院记录，无法办理入院手续!'});
                  yield next;
                  return;
                }
              }

              this.body = app.wrapper.res.ret({elderly: elderly});
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

            }
            yield next;
          };
        }
      }, {
        method: 'nursingLevelsByAssessmentGrade',
        verb: 'post',
        url: this.service_url_prefix + "/nursingLevelsByAssessmentGrade",
        handler: function (app, options) {
          return function*(next) {
            try {
              var nursing_assessment_grade = this.request.body.nursing_assessment_grade;
              var tenantId = this.request.body.tenantId;
              if (!nursing_assessment_grade) {
                this.body = app.wrapper.res.error({message: '缺少评估等级!'});
                yield next;
                return;
              }
              if (!tenantId) {
                this.body = app.wrapper.res.error({message: '缺少养老机构!'});
                yield next;
                return;
              }
              var nursing_levels = yield app.modelFactory().model_query(app.models['psn_nursingLevel'], {
                where: {
                  nursing_assessment_grade: nursing_assessment_grade,
                  status: 1,
                  tenantId: tenantId
                }
              });
              this.body = app.wrapper.res.rows(nursing_levels);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
          }
        }
      }, {
        method: 'nursingLevels',
        verb: 'post',
        url: this.service_url_prefix + "/nursingLevels",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              if (!tenantId) {
                this.body = app.wrapper.res.error({message: '缺少养老机构!'});
                yield next;
                return;
              }
              var nursing_levels = yield app.modelFactory().model_query(app.models['psn_nursingLevel'], {
                where: {
                  status: 1,
                  tenantId: tenantId
                }
              });
              this.body = app.wrapper.res.rows(nursing_levels);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
          }
        }
      },
      /**********************出院相关*****************************/
      {
        method: 'submitApplicationToExit', //提交出院申请
        verb: 'post',
        url: this.service_url_prefix + "/submitApplicationToExit/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var elderly, newExit;
            var raw_elderly_begin_exit_flow;
            try {

              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;

              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }

              //1、判断老人是否在院
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], this.params._id);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }
              if (!elderly.live_in_flag) {
                this.body = app.wrapper.res.error({message: '老人已经出院!'});
                yield next;
                return;
              }

              if (elderly.begin_exit_flow || (yield app.modelFactory().model_totals(app.models['psn_exit'], {
                  where: {
                    tenantId: elderly.tenantId,
                    elderlyId: elderly._id,
                    enter_code: elderly.enter_code
                  }
                })).length > 0) {
                this.body = app.wrapper.res.error({message: '老人出院申请已经提交，请按照出院流程办理出院手续!'});
                yield next;
                return;
              }


              console.log('前置检查完成');

              //更改老人
              raw_elderly_begin_exit_flow = elderly.begin_exit_flow;
              elderly.begin_exit_flow = true;

              //出院申请
              newExit = {
                operated_by: operated_by,
                operated_by_name: operated_by_name,
                current_step: 'A0001',
                enter_code: elderly.enter_code,
                enter_on: elderly.enter_on,
                elderlyId: elderly._id,
                elderly_name: elderly.name,
                elderly_id_no: elderly.id_no,
                elderly_sex: elderly.sex,
                elderly_birthday: elderly.birthday,
                elderly_home_address: elderly.home_address,
                tenantId: elderly.tenantId
              };


              yield elderly.save();
              steps = "A";
              newExit = yield app.modelFactory().model_create(app.models['psn_exit'], newExit);

              this.body = app.wrapper.res.ret({begin_exit_flow: elderly.begin_exit_flow});
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      elderly.begin_exit_flow = raw_elderly_begin_exit_flow;
                      yield elderly.save();
                      break;
                  }
                }
              }

            }
            yield next;
          };
        }
      }, {
        method: 'submitToAuditItemReturn', //提交归还物品检查
        verb: 'post',
        url: this.service_url_prefix + "/submitToAuditItemReturn/:_id",
        handler: function (app, options) {
          return function*(next) {
            var exit;
            try {
              exit = yield app.modelFactory().model_read(app.models['psn_exit'], this.params._id);
              if (!exit || exit.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人出院申请!'});
                yield next;
                return;
              }
              if (exit.current_step != 'A0001') {
                this.body = app.wrapper.res.error({message: '出院流程步骤错误，当前状态下不能提交!'});
                yield next;
                return;
              }

              console.log('前置检查完成');

              exit.current_step = 'A0003';

              yield exit.save();

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'submitToAuditSettlement', //提交出院结算审核
        verb: 'post',
        url: this.service_url_prefix + "/submitToAuditSettlement/:_id",
        handler: function (app, options) {
          return function*(next) {
            var exit;
            try {
              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;
              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }

              exit = yield app.modelFactory().model_read(app.models['psn_exit'], this.params._id);
              if (!exit || exit.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人出院申请!'});
                yield next;
                return;
              }
              if (exit.current_step != 'A0003') {
                this.body = app.wrapper.res.error({message: '出院流程步骤错误，当前状态下不能提交!'});
                yield next;
                return;
              }

              console.log('前置检查完成');

              exit.current_step = 'A0005';
              if (!exit.item_return_audit)
                exit.item_return_audit = {};
              exit.item_return_audit.operated_by = operated_by;
              exit.item_return_audit.operated_by_name = operated_by_name;
              exit.item_return_audit.pass_flag = true;
              exit.item_return_audit.comment = this.request.body.comment;

              yield exit.save();

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'submitToConfirmExit', //提交到确认出院步骤
        verb: 'post',
        url: this.service_url_prefix + "/submitToConfirmExit/:_id",
        handler: function (app, options) {
          return function*(next) {
            var exit;
            try {
              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;
              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }

              exit = yield app.modelFactory().model_read(app.models['psn_exit'], this.params._id);
              if (!exit || exit.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人出院申请!'});
                yield next;
                return;
              }
              if (exit.current_step != 'A0005') {
                this.body = app.wrapper.res.error({message: '出院流程步骤错误，当前状态下不能提交!'});
                yield next;
                return;
              }

              console.log('前置检查完成');

              exit.current_step = 'A0007';
              if (!exit.settlement_audit)
                exit.settlement_audit = {};
              exit.settlement_audit.operated_by = operated_by;
              exit.settlement_audit.operated_by_name = operated_by_name;
              exit.settlement_audit.pass_flag = true;
              exit.settlement_audit.comment = this.request.body.comment;

              yield exit.save();

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'advancePaymentItemsWhenExitSettlement',
        verb: 'get',
        url: this.service_url_prefix + "/advancePaymentItemsWhenExitSettlement/:_id",
        handler: function (app, options) {
          return function*(next) {
            try {
              var exit = yield app.modelFactory().model_read(app.models['psn_exit'], this.params._id);
              if (!exit || exit.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人出院申请!'});
                yield next;
                return;
              }

              var elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], exit.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }

              if (!elderly.begin_exit_flow) {
                this.body = app.wrapper.res.error({message: '当前老人没有办理出院流程，无法获取结算信息!'});
                yield next;
                return;
              }

              var advancePaymentItems = [];

              var balance_brought_forward_payment_item = {digest: '上期结转', amount: elderly.general_ledger};
              advancePaymentItems.push(balance_brought_forward_payment_item);
              var arr_journal_account = elderly.journal_account;
              for (var i = 0; i < arr_journal_account.length; i++) {
                if (arr_journal_account[i].carry_over_flag == false && (arr_journal_account[i].revenue_and_expenditure_type == 'A0001' || arr_journal_account[i].revenue_and_expenditure_type == 'A0002')) {
                  advancePaymentItems.push({
                    digest: app.dictionary.pairs["D3002"][arr_journal_account[i].revenue_and_expenditure_type].name + ':' + arr_journal_account[i].digest,
                    amount: arr_journal_account[i].amount
                  });
                }
              }

              this.body = app.wrapper.res.rows(advancePaymentItems);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'chargeItemsRecordedWhenExitSettlement',
        verb: 'get',
        url: this.service_url_prefix + "/chargeItemsRecordedWhenExitSettlement/:_id",
        handler: function (app, options) {
          return function*(next) {
            try {
              var exit = yield app.modelFactory().model_read(app.models['psn_exit'], this.params._id);
              if (!exit || exit.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人出院申请!'});
                yield next;
                return;
              }

              var elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], exit.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人资料!'});
                yield next;
                return;
              }

              if (!elderly.begin_exit_flow) {
                this.body = app.wrapper.res.error({message: '当前老人没有办理出院流程，无法获取结算信息!'});
                yield next;
                return;
              }

              var chargeItems = [];
              var arr_journal_account = elderly.journal_account;
              for (var i = 0; i < arr_journal_account.length; i++) {
                if (arr_journal_account[i].carry_over_flag == false && arr_journal_account[i].revenue_and_expenditure_type != 'A0001' && arr_journal_account[i].revenue_and_expenditure_type != 'A0002') {
                  var revenue_and_expenditure_type_Prefix = arr_journal_account[i].revenue_and_expenditure_type.substr(0, 1);
                  chargeItems.push({
                    digest: app.dictionary.pairs["D3002"][arr_journal_account[i].revenue_and_expenditure_type].name + ':' + arr_journal_account[i].digest,
                    amount: (revenue_and_expenditure_type_Prefix == 'A' ? -1 : 1) * arr_journal_account[i].amount
                  });
                }
              }


              this.body = app.wrapper.res.rows(chargeItems);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'chargeItemsUnRecordedWhenExitSettlement',
        verb: 'get',
        url: this.service_url_prefix + "/chargeItemsUnRecordedWhenExitSettlement/:_id",
        handler: function (app, options) {
          return function*(next) {
            try {
              var exit = yield app.modelFactory().model_read(app.models['psn_exit'], this.params._id);
              if (!exit || exit.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人出院申请!'});
                yield next;
                return;
              }

              var elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], exit.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人资料!'});
                yield next;
                return;
              }

              if (!elderly.begin_exit_flow) {
                this.body = app.wrapper.res.error({message: '当前老人没有办理出院流程，无法获取结算信息!'});
                yield next;
                return;
              }

              var elderly_json = elderly.toObject();

              //1、寻找最后一次的预付月租并计算到今天为止应该退还多少租金
              var chargeItems = [];

              //改用elderly.charging_on_of_monthly_prepay
              var firstPrepayDate = elderly.charging_on_of_monthly_prepay;
              if (!firstPrepayDate) {
                var arr_journal_account_B0001 = app._.where(elderly_json.journal_account, {revenue_and_expenditure_type: 'B0001'});
                var latest_journal_account_B0001 = app._.max(arr_journal_account_B0001, function (item) {
                  return item.check_in_time;
                });

                firstPrepayDate = latest_journal_account_B0001.check_in_time;
              }
              var daysOfMonthOnAverage = 30;
              var monthly_prepay_price = app._.reduce(app._.pluck(elderly_json.charge_items, 'period_price'), function (total, period_price) {
                return total + period_price;
              }, 0);

              var charge_item_day_price = monthly_prepay_price / daysOfMonthOnAverage;

              var remainder = daysOfMonthOnAverage - app.moment().diff(firstPrepayDate, 'days') % daysOfMonthOnAverage;
              var refund = (charge_item_day_price * remainder).toFixed(2);

              chargeItems.push({
                digest: app.dictionary.pairs["D3002"]['A0003'].name + ':' + remainder + '天预收款',
                amount: -1 * refund
              });
              //2、赔偿物品


              this.body = app.wrapper.res.rows(chargeItems);

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'exitSettlement', //出院结算
        verb: 'post',
        url: this.service_url_prefix + "/exitSettlement/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var exit, elderly, tenant;
            var raw_elderly_general_ledger, raw_elderly_subsidiary_ledger, raw_elderly_journal_account;
            var raw_tenant_general_ledger, raw_tenant_subsidiary_ledger;
            var raw_exit_settlement_info;
            var new_elderly_journal_account_item_A0003; //未入账费用当前仅A0003预付月租退款
            var new_tenantJournalAccount_B0006, remove_tenantJournalAccount_B0006_id;
            var new_elderly_journal_account_item, new_tenantJournalAccount_item, remove_tenantJournalAccount_item_id;
            try {
              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;
              if (!operated_by) {
                this.body = app.wrapper.res.error({message: '缺少操作人数据!'});
                yield next;
                return;
              }

              exit = yield app.modelFactory().model_read(app.models['psn_exit'], this.params._id);
              if (!exit || exit.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人出院申请!'});
                yield next;
                return;
              }
              if (exit.current_step != 'A0005') {
                this.body = app.wrapper.res.error({message: '出院流程步骤错误，当前状态下不能提交!'});
                yield next;
                return;
              }

              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], exit.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人资料!'});
                yield next;
                return;
              }

              if (!elderly.begin_exit_flow) {
                this.body = app.wrapper.res.error({message: '当前老人没有办理出院流程，无法结算!'});
                yield next;
                return;
              }

              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], exit.tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构资料!'});
                yield next;
                return;
              }


              var exit_json = exit.toObject();
              var elderly_json = elderly.toObject();
              var tenant_json = tenant.toObject();
              console.log('前置检查完成');

              raw_elderly_general_ledger = elderly_json.general_ledger;
              raw_elderly_subsidiary_ledger = app.clone(elderly_json.subsidiary_ledger);
              raw_elderly_journal_account = app.clone(elderly_json.journal_account);
              raw_tenant_general_ledger = tenant_json.general_ledger;
              raw_tenant_subsidiary_ledger = app.clone(tenant_json.subsidiary_ledger);
              if (exit_json.settlement_info) {
                raw_exit_settlement_info = app.clone(tenant_json.settlement_info);
              } else {
                raw_exit_settlement_info = undefined;
              }


              //预缴金额
              var advancePayment = elderly_json.general_ledger;
              var arr_journal_account = elderly_json.journal_account;
              for (var i = 0; i < arr_journal_account.length; i++) {
                if (arr_journal_account[i].carry_over_flag == false && (arr_journal_account[i].revenue_and_expenditure_type == 'A0001' || arr_journal_account[i].revenue_and_expenditure_type == 'A0002')) {
                  advancePayment += arr_journal_account[i].amount;
                }
              }

              //已入账费用合计
              var recorded_charge_total = 0;
              var arr_journal_account = elderly_json.journal_account;
              for (var i = 0; i < arr_journal_account.length; i++) {
                if (arr_journal_account[i].carry_over_flag == false && arr_journal_account[i].revenue_and_expenditure_type != 'A0001' && arr_journal_account[i].revenue_and_expenditure_type != 'A0002') {
                  var revenue_and_expenditure_type_Prefix = arr_journal_account[i].revenue_and_expenditure_type.substr(0, 1);
                  recorded_charge_total += (revenue_and_expenditure_type_Prefix == 'A' ? -1 : 1) * arr_journal_account[i].amount;
                }
              }

              //未入账费用合计 改用elderly.charging_on_of_monthly_prepay
              var unrecorded_charge_total = 0;
              var firstPrepayDate = elderly.charging_on_of_monthly_prepay;
              if (!firstPrepayDate) {
                var arr_journal_account_B0001 = app._.where(elderly_json.journal_account, {revenue_and_expenditure_type: 'B0001'});
                var latest_journal_account_B0001 = app._.max(arr_journal_account_B0001, function (item) {
                  return item.check_in_time;
                });
                firstPrepayDate = latest_journal_account_B0001.check_in_time;
              }
              var daysOfMonthOnAverage = 30;
              var monthly_prepay_price = app._.reduce(app._.pluck(elderly_json.charge_items, 'period_price'), function (total, period_price) {
                return total + period_price;
              }, 0);

              var charge_item_day_price = monthly_prepay_price / daysOfMonthOnAverage;
              var remainder = daysOfMonthOnAverage - app.moment().diff(firstPrepayDate, 'days') % daysOfMonthOnAverage;
              var refund = (charge_item_day_price * remainder);

              //未入账费用
              unrecorded_charge_total += -1 * refund;

              //记入老人资金流水
              //此处因为是最后一次的出院结算，因此直接将结算标志设置为true
              new_elderly_journal_account_item_A0003 = {
                voucher_no: yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, elderly_json.tenantId),
                revenue_and_expenditure_type: 'A0003',
                digest: app.moment().format('YYYY-MM-DD') + ':' + app.dictionary.pairs["D3002"]['A0003'].name + '并退回' + remainder + '天预收款',
                carry_over_flag: true,
                amount: refund
              };
              elderly.journal_account.push(new_elderly_journal_account_item_A0003);

              //更新老人分类账
              elderly.subsidiary_ledger.self = elderly.subsidiary_ledger.self + refund;

              //记录租户流水账(不在此处结算)
              new_tenantJournalAccount_B0006 = {
                voucher_no: new_elderly_journal_account_item_A0003.voucher_no,
                revenue_and_expenditure_type: 'B0006',
                digest: elderly.name + ' ' + new_elderly_journal_account_item_A0003.digest,
                amount: new_elderly_journal_account_item_A0003.amount,
                source_type: app.modelVariables.SOURCE_TYPES.ELDERLY,
                source_id: elderly._id,
                source_key: '$journal_account.voucher_no',
                tenantId: elderly.tenantId
              };
              //更新租户分类账
              tenant.subsidiary_ledger.self += -new_tenantJournalAccount_B0006.amount;


              //更新明细流水结算
              for (var i = 0; i < elderly.journal_account.length; i++) {
                if (!elderly.journal_account[i].carry_over_flag) {
                  elderly.journal_account[i].carry_over_flag = true;
                }
              }

              //更新老人总账
              elderly.general_ledger = advancePayment - (recorded_charge_total + unrecorded_charge_total);

              if (elderly.general_ledger != 0) {

                var sign = elderly.general_ledger > 0 ? -1 : 1;
                new_elderly_journal_account_item = {
                  voucher_no: yield app.sequenceFactory.getSequenceVal(app.modelVariables.SEQUENCE_DEFS.BOOKING_TO_TENANT, elderly_json.tenantId),
                  revenue_and_expenditure_type: elderly.general_ledger > 0 ? 'B0002' : 'A0004', //租户需要退款给老人:老人需要补缴给租户欠费
                  digest: '出院' + exit.enter_code,
                  carry_over_flag: true,
                  amount: elderly.general_ledger
                };
                elderly.journal_account.push(new_elderly_journal_account_item);

                //计算结果老人分类账应该为0
                new_tenantJournalAccount_item = {
                  voucher_no: new_elderly_journal_account_item.voucher_no,
                  revenue_and_expenditure_type: elderly.general_ledger > 0 ? 'B0007' : 'A0004', //租户需要退款给老人:老人需要补缴给租户欠费
                  digest: elderly.name + ' ' + new_elderly_journal_account_item.digest,
                  amount: new_elderly_journal_account_item.amount,
                  source_type: app.modelVariables.SOURCE_TYPES.ELDERLY,
                  source_id: elderly._id,
                  source_key: '$journal_account.voucher_no',
                  tenantId: elderly.tenantId
                };

                elderly.subsidiary_ledger.self += sign * new_elderly_journal_account_item.amount;
                elderly.general_ledger = 0;
                tenant.subsidiary_ledger.self += sign * new_tenantJournalAccount_item.amount;

              }


              //更新出院结算信息
              if (!exit.settlement_info) {
                exit.settlement_info = {};
              }
              exit.settlement_info.operated_on = app.moment();
              exit.settlement_info.operated_by = operated_by;
              exit.settlement_info.operated_by_name = operated_by_name;
              exit.settlement_info.settlement_flag = true;
              exit.settlement_info.advance_payment_amount = advancePayment;
              exit.settlement_info.charge_total = recorded_charge_total + unrecorded_charge_total;


              yield exit.save();
              steps = "A";

              yield elderly.save();
              steps += "A";


              new_tenantJournalAccount_B0006 = yield app.modelFactory().model_create(app.models['pub_tenantJournalAccount'], new_tenantJournalAccount_B0006);
              remove_tenantJournalAccount_B0006_id = new_tenantJournalAccount_B0006._id;
              steps += "A";

              if (new_tenantJournalAccount_item) {
                new_tenantJournalAccount_item = yield app.modelFactory().model_create(app.models['pub_tenantJournalAccount'], new_tenantJournalAccount_item);
                remove_tenantJournalAccount_item_id = new_tenantJournalAccount_item._id;
                steps += "A";
              }


              yield tenant.save();

              this.body = app.wrapper.res.ret(exit.settlement_info);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      exit.settlement_info = raw_exit_settlement_info;
                      yield exit.save();
                      break;
                    case 1:
                      elderly.general_ledger = raw_elderly_general_ledger;
                      elderly.subsidiary_ledger = raw_elderly_subsidiary_ledger;
                      elderly.journal_account = raw_elderly_journal_account;
                      yield elderly.save();
                      break;
                    case 2:
                      yield app.modelFactory().model_delete(app.models['pub_tenantJournalAccount'], remove_tenantJournalAccount_B0006_id);
                      break;
                    case 3:
                      yield app.modelFactory().model_delete(app.models['pub_tenantJournalAccount'], remove_tenantJournalAccount_item_id);
                      break;
                  }
                }
              }
            }
            yield next;
          };
        }
      }, {
        method: 'completeExit', //完成出院
        verb: 'post',
        url: this.service_url_prefix + "/completeExit/:_id",
        handler: function (app, options) {
          return function*(next) {
            var steps;
            var exit, tenant, elderly, roomStatus, now_roomOccupancyChangeHistory, new_roomOccupancyChangeHistory;
            var raw_exit_current_step, raw_exit_exit_on, raw_exit_elderly_snapshot,
              raw_elderly_live_in_flag, raw_elderly_begin_exit_flow, raw_elderly_room_value, raw_elderly_room_summary,
              raw_elderly_exit_on,
              raw_roomStatus_occupied, raw_roomOccupancyChangeHistory_in_flag,
              raw_roomOccupancyChangeHistory_check_out_time;
            var remove_roomOccupancyChangeHistory_id;
            try {
              exit = yield app.modelFactory().model_read(app.models["psn_exit"], this.params._id);
              if (!exit || exit.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到出院记录!'});
                yield next;
                return;
              }

              elderly = yield app.modelFactory().model_read(app.models["psn_elderly"], exit.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人资料!'});
                yield next;
                return;
              }

              if (!elderly.live_in_flag) {
                this.body = app.wrapper.res.error({message: '该老人已出院!'});
                yield next;
                return;
              }

              roomStatus = yield app.modelFactory().model_one(app.models["psn_roomStatus"], {
                where: {
                  roomId: elderly.room_value.roomId,
                  'occupied.bed_no': elderly.room_value.bed_no,
                  'occupied.elderlyId': elderly._id,
                  'occupied.bed_status': 'A0003'
                }
              });

              if (roomStatus == null) {
                this.body = app.wrapper.res.error({message: '无法找到当前老人在用的床位状态资料!'});
                yield next;
                return;
              }

              var roomOccupancyChangeHistories = yield app.modelFactory().model_query(app.models['psn_roomOccupancyChangeHistory'], {
                where: {
                  tenantId: exit.tenantId,
                  roomId: elderly.room_value.roomId,
                  bed_no: elderly.room_value.bed_no,
                  elderlyId: elderly._id,
                  in_flag: true
                },
                sort: {check_in_time: -1}
              });

              if (roomOccupancyChangeHistories && roomOccupancyChangeHistories.length > 0) {
                now_roomOccupancyChangeHistory = roomOccupancyChangeHistories[0];
              } else {
                this.body = app.wrapper.res.error({message: '无法找到旧的房间占用历史!'});
                yield next;
                return;
              }


              var exit_json = exit.toObject();
              var elderly_json = elderly.toObject();
              var roomStatus_json = roomStatus.toObject();
              console.log('前置检查完成');

              raw_exit_current_step = exit_json.current_step;
              raw_exit_exit_on = undefined;
              raw_exit_elderly_snapshot = undefined;
              raw_elderly_live_in_flag = elderly_json.live_in_flag;
              raw_elderly_begin_exit_flow = elderly_json.begin_exit_flow;
              raw_elderly_room_value = app.clone(elderly_json.room_value);
              raw_elderly_room_summary = elderly_json.room_summary;
              raw_elderly_exit_on = undefined;
              raw_roomStatus_occupied = app.clone(roomStatus_json.occupied);
              raw_roomOccupancyChangeHistory_in_flag = now_roomOccupancyChangeHistory.in_flag;
              raw_roomOccupancyChangeHistory_check_out_time = undefined;


              now_roomOccupancyChangeHistory.in_flag = true;
              now_roomOccupancyChangeHistory.check_out_time = app.moment();

              for (var i = 0; i < roomStatus.occupied.length; i++) {
                var occupy = roomStatus.occupied[i];
                if (elderly._id.equals(occupy.elderlyId) && elderly.room_value.bed_no == occupy.bed_no
                    && (occupy.bed_status == 'A0002' ||  occupy.bed_status == 'A0003')
                ) {
                  console.log('update roomOccupy')
                  occupy.bed_status = 'A0001';
                  occupy.elderlyId = undefined;
                }
              }

              exit.current_step = 'A0009';
              exit.exit_on = app.moment();
              exit.elderly_snapshot = {
                charge_standard: elderly_json.charge_standard,
                charge_items: elderly_json.charge_items,
                journal_account: elderly_json.journal_account,
                charge_item_change_history: elderly_json.charge_item_change_history
              };

              elderly.live_in_flag = false;
              elderly.begin_exit_flow = false;
              elderly.room_value = undefined;
              elderly.room_summary = undefined;
              elderly.exit_on = exit.exit_on;

              yield now_roomOccupancyChangeHistory.save();
              steps = "A";

              yield roomStatus.save();
              steps += "A";

              yield exit.save();
              steps += "A";

              yield elderly.save();

              this.body = app.wrapper.res.ret({current_step: exit.current_step, exit_on: exit.exit_on});

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);

              //roll back
              if (steps) {
                for (var i = 0; i < steps.length; i++) {
                  switch (i) {
                    case 0:
                      now_roomOccupancyChangeHistory.in_flag = raw_roomOccupancyChangeHistory_in_flag;
                      now_roomOccupancyChangeHistory.check_out_time = raw_roomOccupancyChangeHistory_check_out_time;
                      yield now_roomOccupancyChangeHistory.save();
                      break;
                    case 1:
                      roomStatus.occupied = raw_roomStatus_occupied;
                      yield roomStatus.save();
                      break;
                    case 2:
                      exit.current_step = raw_exit_current_step;
                      exit.exit_on = raw_exit_exit_on;
                      exit.elderly_snapshot = raw_exit_elderly_snapshot;
                      yield exit.save();
                      break;
                  }
                }
              }
            }
            yield next;
          };
        }
      },
      /**********************接待与外出管理*****************************/
      {
        method: 'receptionVisiterSyncElderlyFamilyMembers',
        verb: 'post',
        url: this.service_url_prefix + "/receptionVisiterSyncElderlyFamilyMembers/:_id",
        handler: function (app, options) {
          return function*(next) {
            var reception, elderly;
            try {
              reception = yield app.modelFactory().model_read(app.models['psn_reception'], this.params._id);
              if (!reception || reception.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到接待记录!'});
                yield next;
                return;
              }

              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], reception.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }

              console.log('receptionVisiterSyncElderlyFamilyMembers 前置检查完成');

              var member;
              for (var i = 0; i < elderly.family_members.length; i++) {
                if (elderly.family_members[i].name == reception.visit_info.name) {
                  member = elderly.family_members[i];
                  break;
                }
              }

              if (!member) {
                elderly.family_members.push(app._.extend({}, reception.toObject().visit_info));
              } else {

                reception.visit_info.id_no && (member.id_no = reception.visit_info.id_no);
                reception.visit_info.sex && (member.sex = reception.visit_info.sex);
                reception.visit_info.relation_with && (member.relation_with = reception.visit_info.relation_with);
                reception.visit_info.phone && (member.phone = reception.visit_info.phone);
                reception.visit_info.address && (member.address = reception.visit_info.address);
              }

              yield elderly.save();

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'leaveAccompanierSyncElderlyFamilyMembers',
        verb: 'post',
        url: this.service_url_prefix + "/leaveAccompanierSyncElderlyFamilyMembers/:_id",
        handler: function (app, options) {
          return function*(next) {
            var leave, elderly;
            try {
              leave = yield app.modelFactory().model_read(app.models['psn_leave'], this.params._id);
              if (!leave || leave.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到外出记录!'});
                yield next;
                return;
              }

              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], leave.elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }

              console.log('receptionAccompanierSyncElderlyFamilyMembers 前置检查完成');


              var member;
              for (var i = 0; i < elderly.family_members.length; i++) {
                if (elderly.family_members[i].name == leave.accompany_info.name) {
                  member = elderly.family_members[i];
                  break;
                }
              }

              if (!member) {
                elderly.family_members.push(app._.extend({}, leave.toObject().accompany_info));
              } else {

                leave.accompany_info.id_no && (member.id_no = leave.accompany_info.id_no);
                leave.accompany_info.sex && (member.sex = leave.accompany_info.sex);
                leave.accompany_info.relation_with && (member.relation_with = leave.accompany_info.relation_with);
                leave.accompany_info.phone && (member.phone = leave.accompany_info.phone);
                leave.accompany_info.address && (member.address = leave.accompany_info.address);
              }

              yield elderly.save();

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************房间值班日程*****************************/
      {
        method: 'nursingScheduleWeekly',
        verb: 'post',
        url: this.service_url_prefix + "/nursingScheduleWeekly", //按周查找房间值班日程
        handler: function (app, options) {
          return function*(next) {
            var tenant, xAxisValueStart, xAxisValueEnd;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var xAxisRangePoints = this.request.body.x_axis_range_points;
              xAxisValueStart = app.moment(xAxisRangePoints.start);
              xAxisValueEnd = app.moment(xAxisRangePoints.end);

              console.log('xAxisRangePoints:');
              console.log(xAxisRangePoints);

              console.log('前置检查完成');

              var rows = yield app.modelFactory().model_query(app.models['psn_nursingSchedule'], {
                select: 'x_axis y_axis aggr_value',
                where: {
                  tenantId: tenantId,
                  x_axis: {
                    '$gte': xAxisValueStart.toDate(),
                    '$lt': xAxisValueEnd.add(1, 'days').toDate()
                  }
                }
              });

              var yAxisData = app._.map(app._.uniq(app._.map(rows, (o) => {
                return o.y_axis.toString();
              })), (o) => {
                return {_id: o};
              });
              // console.log(yAxisData);
              // console.log(rows);
              this.body = app.wrapper.res.ret({
                yAxisData: yAxisData,
                items: rows
              });
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'nursingScheduleSave',
        verb: 'post',
        url: this.service_url_prefix + "/nursingScheduleSave",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var toSaveRows = this.request.body.toSaveRows;
              app._.each(toSaveRows, (o) => {
                o.tenantId = tenantId
              });

              // 查找x_axis range & y_axis_range
              var xAxisValue;
              var xAxisRange = app._.uniq(app._.map(toSaveRows, (o) => {
                xAxisValue = app.moment(o.x_axis);
                return {
                  'x_axis': {
                    '$gte': xAxisValue.toDate(),
                    '$lt': xAxisValue.add(1, 'days').toDate()
                  }
                }
              }));
              var yAxisRange = app._.uniq(app._.map(toSaveRows, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              console.log('xAxisRange:');
              console.log(xAxisRange);
              console.log('yAxisRange:');
              console.log(yAxisRange);

              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_bulkInsert(app.models['psn_nursingSchedule'], {
                rows: toSaveRows,
                removeWhere: removeWhere
              });

              console.log('排班保存成功');

              var groupedSaveRows = app._.groupBy(toSaveRows, (o) => {
                "use strict";
                return o.x_axis + '$' + o.y_axis + '$' + o.tenantId;
              });

              var isSyncToNursingRecord = true;
              if (isSyncToNursingRecord) {
                var now = app.moment(),
                  toSaveRow, assigned_workers, groupKey_x_axis, groupKey_y_axis, groupKeyTenantId,
                  exec_start, exec_end, nursingRecordsMatched, nursingRecordIds, batchConditions, batchModel,
                  needUpdateNursingRecord;
                for (var groupKey in groupedSaveRows) {
                  console.log('key:', groupKey);
                  var arr = groupKey.split('$');
                  groupKey_x_axis = arr[0];
                  groupKey_y_axis = arr[1];
                  groupKeyTenantId = arr[2];
                  console.log(groupKey_x_axis, groupKey_y_axis, groupKeyTenantId);
                  assigned_workers = app._.map(groupedSaveRows[groupKey], (o) => {
                    return o.aggr_value;
                  });
                  console.log('assigned_workers:', assigned_workers);


                  exec_start = app.moment(groupKey_x_axis);
                  exec_end = app.moment(exec_start).add(1, 'days');

                  if (now.isAfter(exec_end)) {
                    needUpdateNursingRecord = true;
                  } else if (now.isBefore(exec_start)) {
                    needUpdateNursingRecord = false;
                  } else {
                    // now 与排班是在同一天,计算时间部分
                    exec_start = now;
                  }

                  nursingRecordsMatched = yield app.modelFactory().model_query(app.models['psn_nursingRecord'], {
                    select: '_id',
                    where: {
                      exec_on: {'$gte': exec_start, '$lt': exec_end},
                      roomId: groupKey_y_axis,
                      tenantId: groupKeyTenantId
                    }
                  });

                  if (nursingRecordsMatched.length > 0) {
                    nursingRecordIds = app._.map(nursingRecordsMatched, (o) => {
                      return o._id;
                    });


                    console.log('bulkUpdate nursingRecordIds:', nursingRecordIds);

                    batchConditions = {"_id": {"$in": nursingRecordIds}};
                    batchModel = {assigned_workers: assigned_workers};

                    yield app.modelFactory().model_bulkUpdate(app.models['psn_nursingRecord'], {
                      conditions: batchConditions,
                      batchModel: batchModel
                    });
                  }
                }
              }

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'nursingScheduleRemove',
        verb: 'post',
        url: this.service_url_prefix + "/nursingScheduleRemove",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var toRemoveRows = this.request.body.toRemoveRows;


              console.log('toRemoveRows:');
              console.log(toRemoveRows);

              var xAxisValue;
              var xAxisRange = app._.uniq(app._.map(toRemoveRows, (o) => {
                xAxisValue = app.moment(o.x_axis);
                return {
                  'x_axis': {
                    '$gte': xAxisValue.toDate(),
                    '$lt': xAxisValue.add(1, 'days').toDate()
                  }
                }
              }));
              var yAxisRange = app._.uniq(app._.map(toRemoveRows, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_remove(app.models['psn_nursingSchedule'], removeWhere);
              this.body = app.wrapper.res.default();


              console.log('排班删除成功');
              var now = app.moment(),
                toRemoveRow, exec_start, exec_end, nursingRecordsMatched, nursingRecordIds, batchConditions, batchModel,
                needUpdateNursingRecord;
              for (var i = 0, len = toRemoveRows.length; i < len; i++) {
                toRemoveRow = toRemoveRows[i];
                exec_start = app.moment(toRemoveRow.x_axis);
                exec_end = app.moment(exec_start).add(1, 'days');

                if (now.isAfter(exec_end)) {
                  needUpdateNursingRecord = true;
                } else if (now.isBefore(exec_start)) {
                  needUpdateNursingRecord = false;
                } else {
                  // now 与排班是在同一天,计算时间部分
                  exec_start = now;
                }

                // console.log('exec_start:', exec_start.format('YYYY-MM-DD HH:mm'));
                // console.log('exec_end:', exec_end.format('YYYY-MM-DD HH:mm'));
                // console.log('roomId:', toSaveRow.y_axis);
                // console.log('tenantId', toSaveRow.tenantId);

                nursingRecordsMatched = yield app.modelFactory().model_query(app.models['psn_nursingRecord'], {
                  select: '_id',
                  where: {
                    exec_on: {'$gte': exec_start, '$lt': exec_end},
                    roomId: toRemoveRow.y_axis,
                    tenantId: tenantId
                  }
                });

                if (nursingRecordsMatched.length > 0) {
                  nursingRecordIds = app._.map(nursingRecordsMatched, (o) => {
                    return o._id;
                  });

                  console.log('bulkUpdate nursingRecordIds:', nursingRecordIds);

                  batchConditions = {"_id": {"$in": nursingRecordIds}};
                  batchModel = {$unset: {assigned_workers: 1}};

                  yield app.modelFactory().model_bulkUpdate(app.models['psn_nursingRecord'], {
                    conditions: batchConditions,
                    batchModel: batchModel
                  });
                }
              }
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'nursingScheduleTemplateImport',
        verb: 'post',
        url: this.service_url_prefix + "/nursingScheduleTemplateImport",
        handler: function (app, options) {
          return function*(next) {
            var nursingScheduleTemplate;
            try {
              //this.request.body
              var nursingScheduleTemplateId = this.request.body.nursingScheduleTemplateId;
              nursingScheduleTemplate = yield app.modelFactory().model_read(app.models['psn_nursingScheduleTemplate'], nursingScheduleTemplateId);
              if (!nursingScheduleTemplate || nursingScheduleTemplate.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到房间值班日程模版!'});
                yield next;
                return;
              }

              var toImportXAxisRange = this.request.body.toImportXAxisRange;


              console.log('toImportXAxisRange:');
              console.log(toImportXAxisRange);

              var xAxisValue, xAxisDate;
              var xAxisDayDateMap = {};
              var xAxisRange = app._.map(toImportXAxisRange, (o) => {
                xAxisValue = app.moment(o);
                xAxisDate = xAxisValue.toDate();
                xAxisDayDateMap[xAxisValue.day()] = xAxisDate;
                return {'x_axis': {'$gte': xAxisDate, '$lt': xAxisValue.add(1, 'days').toDate()}}
              });

              var templateItems = nursingScheduleTemplate.content;
              var yAxisRange = app._.uniq(app._.map(templateItems, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: nursingScheduleTemplate.tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              var toSaveRows = app._.map(templateItems, (o) => {
                var x_axis = xAxisDayDateMap[o.x_axis];
                return {
                  x_axis: x_axis,
                  y_axis: o.y_axis,
                  aggr_value: o.aggr_value,
                  tenantId: nursingScheduleTemplate.tenantId
                };
              });


              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_bulkInsert(app.models['psn_nursingSchedule'], {
                rows: toSaveRows,
                removeWhere: removeWhere
              });

              console.log('排班模版导入成功');

              var groupedSaveRows = app._.groupBy(toSaveRows, (o) => {
                "use strict";
                return o.x_axis + '$' + o.y_axis + '$' + o.tenantId;
              });

              var isSyncToNursingRecord = true;
              if (isSyncToNursingRecord) {
                var now = app.moment(),
                  toSaveRow, assigned_workers, groupKey_x_axis, groupKey_y_axis, groupKeyTenantId,
                  exec_start, exec_end, nursingRecordsMatched, nursingRecordIds, batchConditions, batchModel,
                  needUpdateNursingRecord;
                for (var groupKey in groupedSaveRows) {
                  console.log('key:', groupKey);
                  var arr = groupKey.split('$');
                  groupKey_x_axis = arr[0];
                  groupKey_y_axis = arr[1];
                  groupKeyTenantId = arr[2];
                  console.log(groupKey_x_axis, groupKey_y_axis, groupKeyTenantId);
                  assigned_workers = app._.map(groupedSaveRows[groupKey], (o) => {
                    return o.aggr_value;
                  });
                  console.log('assigned_workers:', assigned_workers);

                  exec_start = app.moment(groupKey_x_axis);
                  exec_end = app.moment(exec_start).add(1, 'days');

                  if (now.isAfter(exec_end)) {
                    needUpdateNursingRecord = true;
                  } else if (now.isBefore(exec_start)) {
                    needUpdateNursingRecord = false;
                  } else {
                    // now 与排班是在同一天,计算时间部分
                    exec_start = now;
                  }

                  nursingRecordsMatched = yield app.modelFactory().model_query(app.models['psn_nursingRecord'], {
                    select: '_id',
                    where: {
                      exec_on: {'$gte': exec_start, '$lt': exec_end},
                      roomId: groupKey_y_axis,
                      tenantId: groupKeyTenantId
                    }
                  });

                  if (nursingRecordsMatched.length > 0) {
                    nursingRecordIds = app._.map(nursingRecordsMatched, (o) => {
                      return o._id;
                    });


                    console.log('bulkUpdate nursingRecordIds:', nursingRecordIds);

                    batchConditions = {"_id": {"$in": nursingRecordIds}};
                    batchModel = {assigned_workers: assigned_workers};

                    yield app.modelFactory().model_bulkUpdate(app.models['psn_nursingRecord'], {
                      conditions: batchConditions,
                      batchModel: batchModel
                    });
                  }
                }
              }

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'nursingScheduleSaveAsTemplateWeekly',
        verb: 'post',
        url: this.service_url_prefix + "/nursingScheduleSaveAsTemplateWeekly",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var nursingScheduleTemplateName = this.request.body.nursingScheduleTemplateName;
              var toSaveRows = this.request.body.toSaveRows;
              app._.each(toSaveRows, (o) => {
                o.tenantId = tenantId
              });

              console.log('toSaveRows:', toSaveRows);

              var nursingScheduleTemplate = yield app.modelFactory().model_one(app.models['psn_nursingScheduleTemplate'], {
                where: {
                  status: 1,
                  name: nursingScheduleTemplateName,
                  type: DIC.D3010.WEEKLY,
                  tenantId: tenantId
                }
              });

              console.log('前置检查完成');
              var isCreate = !nursingScheduleTemplate;
              if (isCreate) {
                yield app.modelFactory().model_create(app.models['psn_nursingScheduleTemplate'], {
                  name: nursingScheduleTemplateName,
                  type: DIC.D3010.WEEKLY,
                  content: toSaveRows,
                  tenantId: tenantId
                });
              } else {
                nursingScheduleTemplate.content = toSaveRows;
                yield nursingScheduleTemplate.save();
              }

              this.body = app.wrapper.res.ret(isCreate);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'nursingScheduleByElderlyDaily',
        verb: 'post',
        url: this.service_url_prefix + "/nursingScheduleByElderlyDaily", //按老人和天查找照护排班
        handler: function (app, options) {
          return function*(next) {
            var tenant, elderly, dateString, xAxisValueStart;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var elderlyId = this.request.body.elderlyId;
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }

              dateString = this.request.body.dateString || app.moment().format('YYYY-MM-DD');
              console.log(dateString.format('YYYY-MM-DD HH:mm:ss'))
              xAxisValueStart = app.moment(dateString);

              var rows = yield app.modelFactory().model_query(app.models['psn_nursingSchedule'], {
                select: 'aggr_value',
                where: {
                  tenantId: tenantId,
                  y_axis: elderly.room_value.roomId,
                  x_axis: {
                    '$gte': xAxisValueStart.toDate(),
                    '$lt': xAxisValueStart.add(1, 'days').toDate()
                  }
                }
              }).populate('aggr_value');
              // console.log(yAxisData);
              // console.log(rows);
              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************医生排班*****************************/
      {
        method: 'doctorGenerateUser',
        verb: 'post',
        url: this.service_url_prefix + "/doctorGenerateUser",
        handler: function (app, options) {
          return function*(next) {
            try {
              var doctor = yield app.modelFactory().model_read(app.models['psn_doctor'], this.request.body.doctorId);
              if (!doctor || doctor.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到医生!'});
                yield next;
                return;
              }

              if (!doctor.userId) {
                var user = yield app.modelFactory().model_create(app.models['pub_user'],
                  {
                    _id: doctor._id,
                    code: doctor.code,
                    name: doctor.name,
                    phone: doctor.phone,
                    type: DIC.D1000.TENANT,
                    roles: ['2'],
                    stop_flag: doctor.stop_flag,
                    tenantId: doctor.tenantId
                  });
                doctor.userId = user._id;
                yield doctor.save();
              } else {
                yield app.modelFactory().model_update(app.models['pub_user'], doctor.userId,
                    {
                      code: doctor.code,
                      name: doctor.name,
                      phone: doctor.phone,
                      stop_flag: doctor.stop_flag
                    });
              }

              this.body = app.wrapper.res.ret(doctor.userId);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'doctorNurseScheduleWeekly',
        verb: 'post',
        url: this.service_url_prefix + "/doctorNurseScheduleWeekly", //按周查找医护排班
        handler: function (app, options) {
          return function*(next) {
            var tenant, xAxisValueStart, xAxisValueEnd;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var xAxisRangePoints = this.request.body.x_axis_range_points;
              xAxisValueStart = app.moment(xAxisRangePoints.start);
              xAxisValueEnd = app.moment(xAxisRangePoints.end);

              console.log('xAxisRangePoints:');
              console.log(xAxisRangePoints);

              console.log('前置检查完成-----------------');

              var rows= yield app.modelFactory().model_query(app.models['psn_doctorNurseSchedule'], {
                select: 'x_axis y_axis aggr_value type',
                where: {
                  tenantId: tenantId,
                  x_axis: {
                    '$gte': xAxisValueStart.toDate(),
                    '$lt': xAxisValueEnd.add(1, 'days').toDate()
                  }
                },
                sort: {type: 1}
              });

              console.log('rows:', rows);
              this.body = app.wrapper.res.ret({items:rows});
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'doctorNurseScheduleSave',
        verb: 'post',
        url: this.service_url_prefix + "/doctorNurseScheduleSave",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var toSaveRows = this.request.body.toSaveRows;
              app._.each(toSaveRows, (o) => {
                o.tenantId = tenantId
              });

              // 查找x_axis range & y_axis_range
              var xAxisValue;
              var xAxisRange = app._.uniq(app._.map(toSaveRows, (o) => {
                xAxisValue = app.moment(o.x_axis);
                return {
                  'x_axis': {
                    '$gte': xAxisValue.toDate(),
                    '$lt': xAxisValue.add(1, 'days').toDate()
                  }
                }
              }));
              var yAxisRange = app._.uniq(app._.map(toSaveRows, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              console.log('removeWhere:', removeWhere);
              console.log('xAxisRange:',xAxisRange);

              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_bulkInsert(app.models['psn_doctorNurseSchedule'], {
                rows: toSaveRows,
                removeWhere: removeWhere
              });

              console.log('排班保存成功---');
              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'doctorNurseScheduleRemove',
        verb: 'post',
        url: this.service_url_prefix + "/doctorNurseScheduleRemove",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var toRemoveRows = this.request.body.toRemoveRows;
              console.log('toRemoveRows:',toRemoveRows);

              var xAxisValue;
              var xAxisRange = app._.uniq(app._.map(toRemoveRows, (o) => {
                xAxisValue = app.moment(o.x_axis);
                return {
                  'x_axis': {
                    '$gte': xAxisValue.toDate(),
                    '$lt': xAxisValue.add(1, 'days').toDate()
                  }
                }
              }));
              var yAxisRange = app._.uniq(app._.map(toRemoveRows, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };//对角的情况下会误删

              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_remove(app.models['psn_doctorNurseSchedule'], removeWhere);
              this.body = app.wrapper.res.default();
              console.log('排班删除成功');

            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'doctorNurseScheduleTemplateImport',
        verb: 'post',
        url: this.service_url_prefix + "/doctorNurseScheduleTemplateImport",
        handler: function (app, options) {
          return function*(next) {
            var doctorNurseScheduleTemplate;
            try {
              console.log('body:',this.request.body);
              var doctorNurseScheduleTemplateId = this.request.body.doctorNurseScheduleTemplateId;
              doctorNurseScheduleTemplate = yield app.modelFactory().model_read(app.models['psn_doctorNurseScheduleTemplate'], doctorNurseScheduleTemplateId);
              if (!doctorNurseScheduleTemplate || doctorNurseScheduleTemplate.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到医护排班模版!'});
                yield next;
                return;
              }

              var toImportXAxisRange = this.request.body.toImportXAxisRange;

              var xAxisValue, xAxisDate;
              var xAxisDayDateMap = {};
              var xAxisRange = app._.map(toImportXAxisRange, (o) => {
                xAxisValue = app.moment(o);
                xAxisDate = xAxisValue.toDate();
                xAxisDayDateMap[xAxisValue.day()] = xAxisDate;//xAxisValue.day():0-6
                return {'x_axis': {'$gte': xAxisDate, '$lt': xAxisValue.add(1, 'days').toDate()}}
              });
              console.log('xAxisDayDateMap:',xAxisDayDateMap,'xAxisRange:',xAxisRange);

              var templateItems = doctorNurseScheduleTemplate.content;
              var yAxisRange = app._.uniq(app._.map(templateItems, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: doctorNurseScheduleTemplate.tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              var toSaveRows = app._.map(templateItems, (o) => {
                var x_axis = xAxisDayDateMap[o.x_axis];
                return {
                  x_axis: x_axis,
                  y_axis: o.y_axis,
                  type:o.type,
                  aggr_value: o.aggr_value,
                  tenantId: doctorNurseScheduleTemplate.tenantId
                };
              });
              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_bulkInsert(app.models['psn_doctorNurseSchedule'], {
                rows: toSaveRows,
                removeWhere: removeWhere
              });

              console.log('医护模版导入成功');

              var groupedSaveRows = app._.groupBy(toSaveRows, (o) => {
                "use strict";
                return o.x_axis + '$' + o.y_axis + '$' + o.tenantId;
              });

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'doctorNurseScheduleSaveAsTemplateWeekly',
        verb: 'post',
        url: this.service_url_prefix + "/doctorNurseScheduleSaveAsTemplateWeekly",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var doctorNurseScheduleTemplateName = this.request.body.doctorNurseScheduleTemplateName;
              var toSaveRows = this.request.body.toSaveRows;
              app._.each(toSaveRows, (o) => {
                o.tenantId = tenantId
              });

              console.log('toSaveRows:', toSaveRows);

              var doctorNurseScheduleTemplate = yield app.modelFactory().model_one(app.models['psn_doctorNurseScheduleTemplate'], {
                where: {
                  status: 1,
                  name: doctorNurseScheduleTemplateName,
                  templateType: DIC.D3010.WEEKLY,
                  tenantId: tenantId
                }
              });

              console.log('前置检查完成');
              var isCreate = !doctorNurseScheduleTemplate;
              if (isCreate) {
                yield app.modelFactory().model_create(app.models['psn_doctorNurseScheduleTemplate'], {
                  name: doctorNurseScheduleTemplateName,
                  templateType: DIC.D3010.WEEKLY,
                  content: toSaveRows,
                  tenantId: tenantId
                });
              } else {
                doctorNurseScheduleTemplate.content = toSaveRows;
                yield doctorNurseScheduleTemplate.save();
              }

              this.body = app.wrapper.res.ret(isCreate);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************护士排班*****************************/
      {
        method: 'nurseGenerateUser',
        verb: 'post',
        url: this.service_url_prefix + "/nurseGenerateUser",
        handler: function (app, options) {
          return function*(next) {
            try {
              var nurse = yield app.modelFactory().model_read(app.models['psn_nurse'], this.request.body.nurseId);
              if (!nurse || nurse.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到护士!'});
                yield next;
                return;
              }

              if (!nurse.userId) {
                var user = yield app.modelFactory().model_create(app.models['pub_user'],
                  {
                    _id: nurse._id,
                    code: nurse.code,
                    name: nurse.name,
                    phone: nurse.phone,
                    type: DIC.D1000.TENANT,
                    roles: ['2'],
                    stop_flag: nurse.stop_flag,
                    tenantId: nurse.tenantId
                  });
                nurse.userId = user._id;
                yield nurse.save();
              } else {
                yield app.modelFactory().model_update(app.models['pub_user'], nurse.userId,
                  {
                    code: nurse.code,
                    name: nurse.name,
                    phone: nurse.phone,
                    stop_flag: nurse.stop_flag
                  });
              }

              this.body = app.wrapper.res.ret(nurse.userId);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************护工排班*****************************/
      {
        method: 'nursingWorkerScheduleWeekly',
        verb: 'post',
        url: this.service_url_prefix + "/nursingWorkerScheduleWeekly", //按周查找护工排班
        handler: function (app, options) {
          return function*(next) {
            var tenant, xAxisValueStart, xAxisValueEnd;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var xAxisRangePoints = this.request.body.x_axis_range_points;
              xAxisValueStart = app.moment(xAxisRangePoints.start);
              xAxisValueEnd = app.moment(xAxisRangePoints.end);

              console.log('xAxisRangePoints:');
              console.log(xAxisRangePoints);

              console.log('前置检查完成-----------------');

              var rows = yield app.modelFactory().model_query(app.models['psn_nursingWorkerSchedule'], {
                select: 'x_axis y_axis aggr_value',
                where: {
                  tenantId: tenantId,
                  x_axis: {
                    '$gte': xAxisValueStart.toDate(),
                    '$lt': xAxisValueEnd.add(1, 'days').toDate()
                  }
                }
              });


              console.log('rows:', rows);

              var yAxisData = app._.map(app._.uniq(app._.map(rows, (o) => {
                return o.y_axis.toString();
              })), (o) => {
                return {_id: o};
              });
              // console.log(yAxisData);
              // console.log(rows);
              this.body = app.wrapper.res.ret({
                yAxisData: yAxisData,
                items: rows
              });
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'nursingWorkerScheduleSave',
        verb: 'post',
        url: this.service_url_prefix + "/nursingWorkerScheduleSave",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var toSaveRows = this.request.body.toSaveRows;
              app._.each(toSaveRows, (o) => {
                o.tenantId = tenantId
              });

              // 查找x_axis range & y_axis_range
              var xAxisValue;
              var xAxisRange = app._.uniq(app._.map(toSaveRows, (o) => {
                xAxisValue = app.moment(o.x_axis);
                return {
                  'x_axis': {
                    '$gte': xAxisValue.toDate(),
                    '$lt': xAxisValue.add(1, 'days').toDate()
                  }
                }
              }));
              var yAxisRange = app._.uniq(app._.map(toSaveRows, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              console.log('removeWhere:', removeWhere);

              console.log('xAxisRange:');
              console.log(xAxisRange);
              console.log('yAxisRange:');
              console.log(yAxisRange);

              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_bulkInsert(app.models['psn_nursingWorkerSchedule'], {
                rows: toSaveRows,
                removeWhere: removeWhere
              });

              console.log('护工排班保存成功');

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'nursingWorkerScheduleRemove',
        verb: 'post',
        url: this.service_url_prefix + "/nursingWorkerScheduleRemove",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var toRemoveRows = this.request.body.toRemoveRows;


              console.log('toRemoveRows:');
              console.log(toRemoveRows);

              var xAxisValue;
              var xAxisRange = app._.uniq(app._.map(toRemoveRows, (o) => {
                xAxisValue = app.moment(o.x_axis);
                return {
                  'x_axis': {
                    '$gte': xAxisValue.toDate(),
                    '$lt': xAxisValue.add(1, 'days').toDate()
                  }
                }
              }));
              var yAxisRange = app._.uniq(app._.map(toRemoveRows, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_remove(app.models['psn_nursingWorkerSchedule'], removeWhere);
              this.body = app.wrapper.res.default();


              console.log('排班删除成功');

            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'nursingWorkerScheduleTemplateImport',
        verb: 'post',
        url: this.service_url_prefix + "/nursingWorkerScheduleTemplateImport",
        handler: function (app, options) {
          return function*(next) {
            var nursingWorkerScheduleTemplate;
            try {
              //this.request.body
              var nursingWorkerScheduleTemplateId = this.request.body.nursingWorkerScheduleTemplateId;
              nursingWorkerScheduleTemplate = yield app.modelFactory().model_read(app.models['psn_nursingWorkerScheduleTemplate'], nursingWorkerScheduleTemplateId);
              if (!nursingWorkerScheduleTemplate || nursingWorkerScheduleTemplate.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到护工排班模版!'});
                yield next;
                return;
              }

              var toImportXAxisRange = this.request.body.toImportXAxisRange;


              console.log('toImportXAxisRange:');
              console.log(toImportXAxisRange);

              var xAxisValue, xAxisDate;
              var xAxisDayDateMap = {};
              var xAxisRange = app._.map(toImportXAxisRange, (o) => {
                xAxisValue = app.moment(o);
                xAxisDate = xAxisValue.toDate();
                xAxisDayDateMap[xAxisValue.day()] = xAxisDate;
                return {'x_axis': {'$gte': xAxisDate, '$lt': xAxisValue.add(1, 'days').toDate()}}
              });

              var templateItems = nursingWorkerScheduleTemplate.content;
              var yAxisRange = app._.uniq(app._.map(templateItems, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: nursingWorkerScheduleTemplate.tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              var toSaveRows = app._.map(templateItems, (o) => {
                var x_axis = xAxisDayDateMap[o.x_axis];
                return {
                  x_axis: x_axis,
                  y_axis: o.y_axis,
                  aggr_value: o.aggr_value,
                  tenantId: nursingWorkerScheduleTemplate.tenantId
                };
              });


              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_bulkInsert(app.models['psn_nursingWorkerSchedule'], {
                rows: toSaveRows,
                removeWhere: removeWhere
              });

              console.log('护工模版导入成功');

              var groupedSaveRows = app._.groupBy(toSaveRows, (o) => {
                "use strict";
                return o.x_axis + '$' + o.y_axis + '$' + o.tenantId;
              });

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'nursingWorkerScheduleSaveAsTemplateWeekly',
        verb: 'post',
        url: this.service_url_prefix + "/nursingWorkerScheduleSaveAsTemplateWeekly",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              //this.request.body
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var nursingWorkerScheduleTemplateName = this.request.body.nursingWorkerScheduleTemplateName;
              var toSaveRows = this.request.body.toSaveRows;
              app._.each(toSaveRows, (o) => {
                o.tenantId = tenantId
              });

              console.log('toSaveRows:', toSaveRows);

              var nursingWorkerScheduleTemplate = yield app.modelFactory().model_one(app.models['psn_nursingWorkerScheduleTemplate'], {
                where: {
                  status: 1,
                  name: nursingWorkerScheduleTemplateName,
                  type: DIC.D3010.WEEKLY,
                  tenantId: tenantId
                }
              });

              console.log('前置检查完成');
              var isCreate = !nursingWorkerScheduleTemplate;
              if (isCreate) {
                yield app.modelFactory().model_create(app.models['psn_nursingWorkerScheduleTemplate'], {
                  name: nursingWorkerScheduleTemplateName,
                  type: DIC.D3010.WEEKLY,
                  content: toSaveRows,
                  tenantId: tenantId
                });
              } else {
                nursingWorkerScheduleTemplate.content = toSaveRows;
                yield nursingWorkerScheduleTemplate.save();
              }

              this.body = app.wrapper.res.ret(isCreate);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************照护计划*****************************/
      {
        method: 'nursingPlansByRoom',
        verb: 'post',
        url: this.service_url_prefix + "/nursingPlansByRoom", //按房间查找入住老人的照护计划
        handler: function (app, options) {
          return function*(next) {
            var tenant, elderly, nursingPlan;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var elderlySelectArray = this.request.body.elderlySelectArray;
              if (elderlySelectArray.indexOf('room_value') == -1) {
                elderlySelectArray.push('room_value');
              }
              var nursingPlanSelectArray = this.request.body.nursingPlanSelectArray;

              var rooms = yield app.modelFactory().model_query(app.models['psn_room'], {
                select: 'name capacity',
                where: {
                  status: 1,
                  tenantId: tenantId
                }
              });

              var elderlys = yield app.modelFactory().model_query(app.models['psn_elderly'], {
                select: elderlySelectArray.join(' '),
                where: {
                  status: 1,
                  live_in_flag: true,
                  begin_exit_flow: {$ne: true},
                  tenantId: tenantId
                }
              });


              var nursingPlans = yield app.modelFactory().model_query(app.models['psn_nursingPlan'], {
                select: nursingPlanSelectArray.join(' '),
                where: {
                  status: 1,
                  tenantId: tenantId
                }
              }).populate('work_items.drugUseTemplateId', 'name order_no');

              var nursingPlansByRoom = {};
              app._.each(rooms, function (o) {
                for (var i = 1, len = o.capacity; i <= len; i++) {
                  elderly = app._.find(elderlys, (o2) => {
                    return o2.room_value.roomId.toString() == o._id.toString() && o2.room_value.bed_no == i;
                  });

                  if (elderly) {
                    nursingPlan = app._.find(nursingPlans, (o3) => {
                      return o3.elderlyId.toString() == elderly._id.toString();
                    });
                  }

                  nursingPlansByRoom[o._id + '$' + i] = {
                    roomId: o._id,
                    room_name: o.name,
                    bed_no: i,
                    elderly: elderly || {},
                    nursing_plan: nursingPlan || {}
                  };
                }
              });

              console.log('nursingPlansByRoom:', nursingPlansByRoom);

              this.body = app.wrapper.res.ret(nursingPlansByRoom);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'workItemQuery',
        verb: 'post',
        url: this.service_url_prefix + "/q/workItem",
        handler: function (app, options) {
          return function*(next) {
            try {
              var workItemId = this.request.body.workItemId;
              // console.log("workItemId",workItemId)
              var rows = yield app.modelFactory().model_read(app.models['psn_workItem'], workItemId);
              if (!rows) {
                this.body = app.wrapper.res.error({message: '无法找到工作项目!'});
                yield next;
                return;
              }
              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'workItemCopy',
        verb: 'post',
        url: this.service_url_prefix + "/workItemCopy",
        handler: function (app, options) {
          return function*(next) {
            try {
              var nursingLevelIds = this.request.body.nursingLevelIds;
              var workItemId = this.request.body.workItemId;

              var workItem = yield app.modelFactory().model_read(app.models['psn_workItem'], workItemId);

              if (!workItem) {
                this.body = app.wrapper.res.error({message: '无法找到工作项目!'});
                yield next;
                return;
              }

              var row = workItem.toObject();
              row.check_in_time = undefined;
              row._id = undefined;
              row.operated_on = undefined;
              var workItems = [];
              for (var i = 0, len = nursingLevelIds.length; i < len; i++) {
                row.nursingLevelId = nursingLevelIds[i];
                workItems.push(app._.extend({}, row));
              }
              yield app.modelFactory().model_bulkInsert(app.models['psn_workItem'], {rows: workItems});
              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'overdueWorkItem',
        verb: 'post',
        url: this.service_url_prefix + "/overdueWorkItem",
        handler: function (app, options) {
          return function*(next) {
            var tenantId = this.request.body.tenantId;
            try {
              var rows = yield app.modelFactory().model_query(app.models['psn_nursingRecord'], {
                select: 'roomId bed_no elderly_name category name description exec_on confirmed_on',
                where: {
                  tenantId: tenantId,
                  confirmed_flag: true
                }
              }).populate('roomId', 'name', 'psn_room');
              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              // console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'robotQuery',
        verb: 'post',
        url: this.service_url_prefix + "/robotQuery",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;

              var localRobots = yield app.modelFactory().model_query(app.models['pub_robot'], {where: {tenantId: tenantId}});
              var remoteRobots = yield app.robot_service.getRobotList();
              // console.log("remoterobpots",remoteRobots)

              for (var i = 0, len = localRobots.length; i < len; i++) {
                var code = localRobots[i].code;
                var index = app._.findIndex(remoteRobots, function (o) {
                  return o.robotId === code;
                })
                if (index != -1) {
                  remoteRobots.splice(index, 1);
                }
              }
              // console.log("remoterobpots",remoteRobots)
              var rows = [];
              for (var j = 0, l = remoteRobots.length; j < l; j++) {
                var obj = {};
                obj._id = remoteRobots[j].robotId + '_' + remoteRobots[j].robotName + '_' + remoteRobots[j].onlineFlag;
                obj.id = remoteRobots[j].robotId + '_' + remoteRobots[j].robotName;
                obj.name = remoteRobots[j].robotId + '_' + remoteRobots[j].robotName + '(' + (remoteRobots[j].onlineFlag == 1 ? "在线)" : "离线)");
                rows.push(obj);
              }

              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }

      }, {
        method: 'robotImport',
        verb: 'post',
        url: this.service_url_prefix + "/robotImport",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var robotIds = this.request.body.robotIds;
              // console.log(tenantId);
              // console.log(robotIds);
              var robotRows = [];
              app._.each(robotIds, function (o) {
                var robot = o.split('_');
                var obj = {};
                obj.code = robot[0];
                obj.tenantId = tenantId
                obj.name = robot[1];
                if (robot[2] == "1") {
                  obj.robot_status = "A0001"
                } else {
                  obj.robot_status = "A0003"
                }
                ;
                robotRows.push(obj)
              })
              // console.log(robotRows);
              var ret = yield app.modelFactory().model_bulkInsert(app.models['pub_robot'], {
                rows: robotRows,
              });
              this.body = app.wrapper.res.default();
            } catch (e) {
              // console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'nursingPlanSaveNursingItem',
        verb: 'post',
        url: this.service_url_prefix + "/nursingPlanSaveNursingItem", //为老人保存一条照护类目
        handler: function (app, options) {
          return function*(next) {
            var tenant, elderly, workItem, nursingPlan, toProcessWorkItem
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var elderlyId = this.request.body.elderlyId;
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }

              var workItemCheckInfo = this.request.body.work_item_check_info;
              var toProcessWorkItemId = workItemCheckInfo.id;
              var type = workItemCheckInfo.type;
              if (type == DIC.D3017.NURSING_ITEM) {
                workItem = yield app.modelFactory().model_read(app.models['psn_workItem'], toProcessWorkItemId);
                if (!workItem || workItem.status == 0) {
                  this.body = app.wrapper.res.error({message: '无法找到工作项目!'});
                  yield next;
                  return;
                }
                toProcessWorkItem = workItem.toObject();
                toProcessWorkItem.type = type;
                toProcessWorkItem.workItemId = toProcessWorkItemId;

              } else if (type == DIC.D3017.DRUG_USE_ITEM) {
                workItem = yield app.modelFactory().model_read(app.models['psn_drugUseItem'], toProcessWorkItemId);
                if (!workItem || workItem.status == 0) {
                  this.body = app.wrapper.res.error({message: '无法找到用药管理项目!'});
                  yield next;
                  return;
                }
                toProcessWorkItem = workItem.toObject();
                toProcessWorkItem.type = type;
                toProcessWorkItem.drugUseItemId = toProcessWorkItemId;
              }
              var isRemoved = !workItemCheckInfo.checked;
              var elderlyNursingPlan = yield app.modelFactory().model_one(app.models['psn_nursingPlan'], {
                select: 'work_items',
                where: {
                  status: 1,
                  elderlyId: elderlyId,
                  tenantId: tenantId
                }
              });
              if (!elderlyNursingPlan) {
                if (!isRemoved) {

                  yield app.modelFactory().model_create(app.models['psn_nursingPlan'], {
                    elderlyId: elderlyId,
                    elderly_name: elderly.name,
                    work_items: [toProcessWorkItem],
                    tenantId: elderly.tenantId
                  });
                }
              } else {
                var workItems = elderlyNursingPlan.work_items;
                var index = app._.findIndex(workItems, (o) => {
                  var flag;
                  if (o.type == DIC.D3017.NURSING_ITEM) {

                    console.log('workerItem: ', o);
                    console.log('------------------: ', o.workItemId);
                    flag = (o.workItemId.toString() == toProcessWorkItemId);
                  } else {
                    flag = (o.drugUseItemId.toString() == toProcessWorkItemId);
                  }
                  return flag;
                });
                if (!isRemoved) {
                  // 加入
                  if (index == -1) {
                    workItems.push(toProcessWorkItem);
                  }
                } else {
                  if (index != -1) {
                    workItems.splice(index, 1);
                  }
                }

                elderlyNursingPlan.work_items = workItems;

                yield elderlyNursingPlan.save();
              }

              // added by zppro 2017-5-26
              console.log('如果是用药项目,则需要反向同步到用药');
              if (toProcessWorkItem.type == DIC.D3017.DRUG_USE_ITEM) {
                var drugUseItem = yield app.modelFactory().model_read(app.models['psn_drugUseItem'], toProcessWorkItem.drugUseItemId);
                if (drugUseItem) {
                  drugUseItem.stop_flag = isRemoved;
                  yield drugUseItem.save();
                }
              }


              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'nursingPlanSaveAll',
        verb: 'post',
        url: this.service_url_prefix + "/nursingPlanSaveAll",
        handler: function (app, options) {
          return function*(next) {
            var type, workItemIds, checked, tenant, elderly, workItems;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var elderlyId = this.request.body.elderlyId;
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }
              type = this.request.body.type;
              workItemIds = this.request.body.workItemIds;
              checked = this.request.body.checked;

              var elderlyNursingPlan = yield app.modelFactory().model_one(app.models['psn_nursingPlan'], {
                select: 'work_items',
                where: {
                  status: 1,
                  elderlyId: elderlyId,
                  tenantId: tenantId
                }
              });
              var workItemsByElderly = [];
              if (!elderlyNursingPlan) {
                if (checked == true && type == DIC.D3017.NURSING_ITEM) {
                  for (var i = 0, len = workItemIds.length; i < len; i++) {
                    var workItemId = workItemIds[i];
                    var workItem = yield app.modelFactory().model_read(app.models['psn_workItem'], workItemId);
                    if (!workItem || workItem.status == 0) {
                      this.body = app.wrapper.res.error({message: '无法找到工作项目!'});
                      yield next;
                      return;
                    } else {
                      var workItemObj = workItem.toObject();
                      workItemObj.type = type;
                      workItemObj.workItemId = workItemId;
                      workItemsByElderly.push(workItemObj);
                    }
                  }
                } else if (checked == true && type == DIC.D3017.DRUG_USE_ITEM) {
                  for (var i = 0, len = workItemIds.length; i < len; i++) {
                    var workItemId = workItemIds[i];
                    var workItem = yield app.modelFactory().model_read(app.models['psn_drugUseItem'], workItemId);
                    if (!workItem || workItem.status == 0) {
                      this.body = app.wrapper.res.error({message: '无法找到用药项目!'});
                      yield next;
                      return;
                    } else {
                      var workItemObj = workItem.toObject();
                      workItemObj.type = type;
                      workItemObj.drugUseItemId = workItemId;
                      workItemsByElderly.push(workItemObj);
                    }
                  }
                }
                // console.log("workItemByElderly",workItemsByElderly);
                yield app.modelFactory().model_create(app.models['psn_nursingPlan'], {
                  elderlyId: elderlyId,
                  elderly_name: elderly.name,
                  work_items: workItemsByElderly,
                  tenantId: tenantId
                });
              } else {
                workItems = elderlyNursingPlan.work_items;
                // console.log("******",workItems);
                if (type == DIC.D3017.NURSING_ITEM) {
                  var baseWorkItems = workItems.filter(function (o) {
                    return o.type == DIC.D3017.DRUG_USE_ITEM
                  })
                  // console.log("baseWorkItemsOfDrugUseItem",baseWorkItems);
                  if (checked == true) {
                    for (var i = 0, len = workItemIds.length; i < len; i++) {
                      var workItemId = workItemIds[i];
                      var workItem = yield app.modelFactory().model_read(app.models['psn_workItem'], workItemId);
                      if (!workItem || workItem.status == 0) {
                        this.body = app.wrapper.res.error({message: '无法找到工作项目!'});
                        yield next;
                        return;
                      } else {
                        var workItemObj = workItem.toObject();
                        workItemObj.type = type;
                        workItemObj.workItemId = workItemId;
                        baseWorkItems.push(workItemObj);
                      }
                    }

                  }
                  workItemsByElderly = baseWorkItems;
                  //  console.log("workItemsofnursingItem",workItemsByElderly)
                } else if (type == DIC.D3017.DRUG_USE_ITEM) {
                  var baseWorkItems = workItems.filter(function (o) {
                    return o.type == DIC.D3017.NURSING_ITEM
                  })
                  // console.log("baseWorkItemsOfNursingItem",baseWorkItems);
                  if (checked == true) {
                    for (var i = 0, len = workItemIds.length; i < len; i++) {
                      var workItemId = workItemIds[i];
                      var workItem = yield app.modelFactory().model_read(app.models['psn_drugUseItem'], workItemId);
                      if (!workItem || workItem.status == 0) {
                        this.body = app.wrapper.res.error({message: '无法找到用药项目!'});
                        yield next;
                        return;
                      } else {
                        var workItemObj = workItem.toObject();
                        workItemObj.type = type;
                        workItemObj.drugUseItemId = workItemId;
                        baseWorkItems.push(workItemObj);
                      }
                    }


                  }
                  workItemsByElderly = baseWorkItems;
                  // console.log("workItemsofdrug",workItemsByElderly)
                }
                elderlyNursingPlan.work_items = workItemsByElderly;
                //  console.log("workItemsByElderly",workItemsByElderly)
                yield elderlyNursingPlan.save();

                if (type == DIC.D3017.DRUG_USE_ITEM) {
                  console.log('如果是用药项目,则需要反向同步到用药');
                  var drugUseItemsToSync = yield app.modelFactory().model_bulkUpdate(app.models['psn_drugUseItem'], {
                    conditions: {_id: {$in: workItemIds}},
                    batchModel: {stop_flag: !checked}
                  });
                }

              }
              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'nursingPlanSaveRemark',
        verb: 'post',
        url: this.service_url_prefix + "/nursingPlanSaveRemark", //为老人保存一条照护项目
        handler: function (app, options) {
          return function*(next) {
            var tenant, elderly, nursingPlan;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var elderlyId = this.request.body.elderlyId;
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }

              var remark = this.request.body.remark;
              var elderlyNursingPlan = yield app.modelFactory().model_one(app.models['psn_nursingPlan'], {
                select: 'remark',
                where: {
                  status: 1,
                  elderlyId: elderlyId,
                  tenantId: tenantId
                }
              });

              if (!elderlyNursingPlan) {
                yield app.modelFactory().model_create(app.models['psn_nursingPlan'], {
                  elderlyId: elderlyId,
                  elderly_name: elderly.name,
                  remark: remark,
                  tenantId: elderly.tenantId
                });
              } else {

                elderlyNursingPlan.remark = remark;

                yield elderlyNursingPlan.save();
              }

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************自定义工作项目******************************/
      {
        method: 'customizedWorkItem',
        verb: 'post',
        url: this.service_url_prefix + "/customizedWorkItem",
        handler: function (app, options) {
          return function*(next) {
            try {
              var workItemId = this.request.body.workItemId, newWorkItemId;
              // console.log("<<<workItemId", workItemId);
              var customizedWorkItem = this.request.body.customizedWorkItem;
              // console.log(">>>>>customizeWorkItem", customizedWorkItem);
              var workItem = yield app.modelFactory().model_read(app.models['psn_workItem'], workItemId);
              // console.log('<<<<workItem', workItem);
              if (workItem.customize_flag == false) {
                delete customizedWorkItem._id;
                customizedWorkItem.customize_flag = true;
                customizedWorkItem.sourceId = workItemId;
                customizedWorkItem.name += "+";
                newWorkItem = yield app.modelFactory().model_create(app.models['psn_workItem'], customizedWorkItem);
              } else {
                yield app.modelFactory().model_delete(app.models['psn_workItem'], workItemId);
                newWorkItem = yield app.modelFactory().model_create(app.models['psn_workItem'], customizedWorkItem);
              }
              // console.log("newWorkItem", newWorkItem);
              var elderlyId = this.request.body.customizedWorkItem.elderlyId;
              var tenantId = this.request.body.customizedWorkItem.tenantId;
              var elderlyNursingPlan = yield app.modelFactory().model_one(app.models['psn_nursingPlan'], {
                select: 'work_items',
                where: {
                  status: 1,
                  elderlyId: elderlyId,
                  tenantId: tenantId
                }
              });
              // console.log("elderlyNursingPlan",elderlyNursingPlan);
              if (elderlyNursingPlan && elderlyNursingPlan.work_items) {

                elderlyNursingPlan.work_items = elderlyNursingPlan.work_items.filter(function (item) {
                  return item.workItemId != workItemId;
                });
                // console.log("elderlyNursingPlan",elderlyNursingPlan);
                yield elderlyNursingPlan.save();
              }

              this.body = app.wrapper.res.rows(newWorkItem);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************照护计划执行(照护记录)*****************************/
      {
        method: 'nursingRecordGenerate',
        verb: 'post',
        url: this.service_url_prefix + "/nursingRecordGenerate", //按照照护计划一轮照护记录
        handler: function (app, options) {

          return function*(next) {
            try {
              var ret = yield app.psn_nursingRecord_generate_service.generateByTenantId(this.request.body.tenantId, this.request.body.elderlyId);
              this.body = ret;
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'nursingRecordsByElderlyToday',
        verb: 'post',
        url: this.service_url_prefix + "/nursingRecordsByElderlyToday", //老人的今日的照护记录
        handler: function (app, options) {
          return function*(next) {
            var tenant, elderly, nursingPlan;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var elderlyId = this.request.body.elderlyId;
              elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              if (!elderly || elderly.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到老人!'});
                yield next;
                return;
              }
              var today = app.moment(app.moment().format('YYYY-MM-DD') + " 00:00:00");
              var rows = yield app.modelFactory().model_query(app.models['psn_nursingRecord'], {
                select: 'exec_on executed_flag name type description duration assigned_workers confirmed_flag confirmed_on workItemId',
                where: {
                  elderlyId: elderlyId,
                  exec_on: {$gte: today.toDate(), $lte: today.add(1, 'days').toDate()},
                  tenantId: tenantId
                },
                sort: 'exec_on'
              }).populate('assigned_workers').populate('workItemId', 'name drugId', 'psn_drugUseItem');
              // console.log('nursingRecordsByElderlyToday:', rows);
              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************护士台*****************************/
      {
        method: 'elderlysByDistrictFloors',
        verb: 'post',
        url: this.service_url_prefix + "/elderlysByDistrictFloors", //按片区楼层查找入住老人
        handler: function (app, options) {
          return function*(next) {
            var tenant, districtFloors, pairOfDistrictFloor, roomObjects, roomIds, elderlyObjects, elderlyIds;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              // console.log('districtFloors:', this.request.body.districtFloors);
              var districtFloors = app._.map(this.request.body.districtFloors, (o) => {
                pairOfDistrictFloor = o.split('$');
                return {'$and': [{districtId: pairOfDistrictFloor[0]}, {floor: pairOfDistrictFloor[1]}]};
              });

              // console.log('districtFloors:', districtFloors);
              roomObjects = yield app.modelFactory().model_query(app.models['psn_room'], {
                select: '_id',
                where: {
                  status: 1,
                  '$or': districtFloors,
                  tenantId: tenantId
                }
              });

              roomIds = app._.map(roomObjects, (o) => {
                return o._id;
              });
              // console.log('roomIds:', roomIds);
              elderlyObjects = yield app.modelFactory().model_query(app.models['psn_roomOccupancyChangeHistory'], {
                select: 'elderlyId',
                where: {
                  roomId: {'$in': roomIds},
                  in_flag: true,
                  check_out_time: {$exists: false},
                  tenantId: tenantId
                }
              });

              // console.log('elderlyObjects:', elderlyObjects);
              elderlyIds = app._.map(elderlyObjects, (o) => {

                return o.elderlyId;
              });

              var rows = yield app.modelFactory().model_query(app.models['psn_elderly'], {
                select: 'name birthday nursingLevelId room_value avatar',
                where: {
                  status: 1,
                  live_in_flag: true,
                  _id: {'$in': elderlyIds},
                  tenantId: tenantId
                },
                sort: {'room_value.roomId': 1}
              }).populate('nursingLevelId', 'name short_name nursing_assessment_grade', 'psn_nursingLevel')
                .populate('room_value.roomId', 'name bedMonitors', 'psn_room');

              // console.log('elderlys:', rows);

              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }, {
        method: 'nursingStationCloseBedMonitorAlarm',
        verb: 'post',
        url: this.service_url_prefix + "/nursingStationCloseBedMonitorAlarm", //关闭离床报警,此处永远为插入记录,因为采用报警数据后置插入模型
        handler: function (app, options) {
          return function*(next) {
            var alarm; //, tenant, elderly, bedMonitor;
            try {

              var alarmId = this.request.body.alarmId;
              alarm = yield app.modelFactory().model_read(app.models['pub_alarm'], alarmId);
              if (!alarm || alarm.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到警报信息!'});
                yield next;
                return;
              }

              // var tenantId = this.request.body.tenantId;
              // tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              // if (!tenant || tenant.status == 0) {
              //     this.body = app.wrapper.res.error({ message: '无法找到养老机构!' });
              //     yield next;
              //     return;
              // }
              //
              // var elderlyId = this.request.body.elderlyId;
              // elderly = yield app.modelFactory().model_read(app.models['psn_elderly'], elderlyId);
              // if (!elderly || elderly.status == 0) {
              //     this.body = app.wrapper.res.error({ message: '无法找到老人!' });
              //     yield next;
              //     return;
              // }
              //
              // var bedMonitorName = this.request.body.bedMonitorName;
              //
              // bedMonitor = yield app.modelFactory().model_one(app.models['pub_bedMonitor'], {
              //     select: 'name',
              //     where: {
              //         status: 1,
              //         name: bedMonitorName,
              //         tenantId: tenantId
              //     }
              // });
              //
              // if (!bedMonitor) {
              //     this.body = app.wrapper.res.error({ message: '无法找到睡眠带!' });
              //     yield next;
              //     return;
              // }
              //
              // var reason = this.request.body.reason;


              var operated_by = this.request.body.operated_by;
              var operated_by_name = this.request.body.operated_by_name;

              console.log('前置检查完成');

              app.pub_alarm_service.closeBedMonitorAlarm(alarm, operated_by, operated_by_name);

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************药品相关*****************************/
      {
        method: 'queryDrug',
        verb: 'post',
        url: this.service_url_prefix + "/q/drug",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              var keyword = this.request.body.keyword;
              var data = this.request.body.data;

              data.where = app._.extend(data.where || {}, {
                status: 1,
                tenantId: tenantId
              });

              console.log('data.where:', data.where, elderlyId);

              if (keyword) {
                var keywordReg = new RegExp(keyword);

                data.where.$or = [
                  {full_name: keywordReg},
                  {$and: [{short_name: {$exists: true}}, {short_name: keywordReg}]},
                  {$and: [{alias: {$exists: true}}, {alias: keywordReg}]},
                  {$and: [{vender: {$exists: true}}, {vender: keywordReg}]}
                ]
                // data.where.full_name = new RegExp(keyword);
              }
              var drugs = []
              var rows = yield app.modelFactory().model_query(app.models['psn_drugDirectory'], data);
              if (data.select && data.select.indexOf('$stock') != -1 && elderlyId) {
                console.log('need $stock')
                var elderlyStock = yield app.psn_drug_stock_service._elderlyStockObject2(tenantId, elderlyId);
                // console.log('elderlyStock:', elderlyStock);
                app._.each(rows, (o) => {
                  var drug = o.toObject()

                  var drugStock = elderlyStock[drug.id];
                  console.log('drugStock:', drug.id, drugStock)
                  if (drugStock) {
                    drug.$stock = drugStock.total + drugStock.unit_name
                  }
                  drugs.push(drug);
                })
              } else {
                drugs = rows
              }
              console.log('rows:', drugs)

              this.body = app.wrapper.res.rows(drugs);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /************************查询所有库***************************/
      {
        method: 'drugQueryAll',
        verb: 'post',
        url: this.service_url_prefix + "/drugQueryAll",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var barcode = this.request.body.barcode;
              var psnDrug = yield app.modelFactory().model_one(app.models['psn_drugDirectory'], {
                // select:"full_name vender barcode",
                where: {
                  status: 1,
                  tenantId: tenantId,
                  barcode: barcode
                }
              });
              // console.log("psnDrug", psnDrug);
              if (!psnDrug) {
                var pubDrug_json = yield app.modelFactory().model_one(app.models['pub_drug'], {where: {barcode: barcode}});
                if (pubDrug_json) {
                  var rows = {
                    barcode: pubDrug_json.barcode, //条形码 added by zppro 2017.5.12
                    full_name: pubDrug_json.name,
                    vender: pubDrug_json.vender,//厂家 added by zppro 2017.5.12
                    drugSourceId: pubDrug_json.id
                  };
                  this.body = app.wrapper.res.rows(rows);
                } else {
                  this.body = app.wrapper.res.rows({});
                }
              } else {
                this.body = app.wrapper.res.rows(psnDrug);
              }

            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      /***********************用药项目保存**********************/
      {
        method: 'drugUseItemSave',
        verb: 'post',
        url: this.service_url_prefix + "/drugUseItemSave",
        handler: function (app, options) {
          return function*(next) {
            try {
              var data = this.request.body;
              var elderlyId = data.elderlyId;
              var elderly_name = data.elderly_name;
              var tenantId = data.tenantId;
              var drugUseItemId = data._id;
              var elderlyNursingPlan = yield app.modelFactory().model_one(app.models['psn_nursingPlan'], {
                select: 'work_items',
                where: {
                  status: 1,
                  elderlyId: elderlyId,
                  tenantId: tenantId
                }
              });
              if (data.stop_flag) {
                data.stoped_on = app.moment();
              }
              var drugUseItem = data, workItem;
              console.log('drugUseItemId:', drugUseItemId);
              if (drugUseItemId) {
                // 修改老人的用药项目
                yield app.modelFactory().model_update(app.models['psn_drugUseItem'], drugUseItemId, drugUseItem);

                //更新老人照护计划中
                drugUseItem.type = DIC.D3017.DRUG_USE_ITEM;
                drugUseItem.drugUseItemId = drugUseItem._id;
                if (elderlyNursingPlan) {
                  var workItems = elderlyNursingPlan.work_items;
                  var index = app._.findIndex(workItems, (o) => {
                    return o.type == DIC.D3017.DRUG_USE_ITEM && o.drugUseItemId.toString() == drugUseItemId;
                  });
                  if (index != -1) {
                    console.log('找到照护计划中的用药项目...');
                    if (!drugUseItem.stop_flag) {
                      console.log('修改用药项目,同步到照护计划中');
                      workItems.splice(index, 1, drugUseItem);
                    } else {
                      console.log('修改用药项目,删除照护计划中的用药项目');
                      workItems.splice(index, 1);
                    }
                  } else {
                    console.log('没有找到照护计划中的用药项目...');
                    if (!drugUseItem.stop_flag) {
                      //添加到照护计划中
                      console.log('修改用药项目,添加用药项目到照护计划中');
                      drugUseItem.type = DIC.D3017.DRUG_USE_ITEM;
                      drugUseItem.drugUseItemId = drugUseItem._id;
                      workItems.push(drugUseItem);
                    } else {
                      this.body = app.wrapper.res.default();
                      return;
                    }
                  }

                  elderlyNursingPlan.work_items = workItems;
                  yield elderlyNursingPlan.save();
                } else {
                  yield app.modelFactory().model_create(app.models['psn_nursingPlan'], {
                    elderlyId: elderlyId,
                    elderly_name: elderly_name,
                    work_items: [drugUseItem],
                    tenantId: tenantId
                  });
                }
              } else {
                // 新增老人的用药项目
                drugUseItem = yield app.modelFactory().model_create(app.models['psn_drugUseItem'], drugUseItem);
                drugUseItem = drugUseItem.toObject();
                drugUseItem.type = DIC.D3017.DRUG_USE_ITEM;
                drugUseItem.drugUseItemId = drugUseItem._id;
                console.log('drugUseItem:', drugUseItem);
                // 如果用药项目没有停用 更新老人照护计划中
                if (!drugUseItem.stop_flag) {
                  console.log('新增用药项目,添加用药项目到照护计划中');

                  if (elderlyNursingPlan) {
                    elderlyNursingPlan.work_items.push(drugUseItem);
                    yield elderlyNursingPlan.save();
                  } else {
                    yield app.modelFactory().model_create(app.models['psn_nursingPlan'], {
                      elderlyId: elderlyId,
                      elderly_name: elderly_name,
                      work_items: [drugUseItem],
                      tenantId: tenantId
                    });
                  }
                }
              }
              this.body = app.wrapper.res.default();

            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      /**************************用药项目删除*******************************/
      {
        method: 'drugUseItemRemove',
        verb: 'post',
        url: this.service_url_prefix + "/drugUseItemRemove",
        handler: function (app, options) {
          return function*(next) {
            console.log("body", this.request.body)
            var elderlyId = this.request.body.elderlyId;
            var tenantId = this.request.body.tenantId;
            var drugUseItemIds = this.request.body.drugUseItemIds;
            try {
              var elderlyNursingPlan = yield app.modelFactory().model_one(app.models['psn_nursingPlan'], {
                select: 'work_items',
                where: {
                  status: 1,
                  elderlyId: elderlyId,
                  tenantId: tenantId
                }
              });
              if (elderlyNursingPlan) {
                var workItems = elderlyNursingPlan.work_items;
                for (var i = 0, len = drugUseItemIds.length; i < len; i++) {
                  var Id = drugUseItemIds[i];

                  var inIndex = app._.findIndex(workItems, (o) => {
                    return o.type == DIC.D3017.DRUG_USE_ITEM && o.drugUseItemId.toString() == Id;
                  });
                  if (inIndex != -1) {
                    workItems.splice(inIndex, 1);
                  }
                }
                elderlyNursingPlan.work_items = workItems;
                yield elderlyNursingPlan.save();
              }

              yield app.modelFactory().model_remove(app.models['psn_drugUseItem'], {_id: {$in: drugUseItemIds}});

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          }
        }
      },
      /**************************导出用药管理*******************************/
      {
        method: 'excel$elderlyDrugUseItem',
        verb: 'post',
        url: this.service_url_prefix + "/excel/elderlyDrugUseItem",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var file_name = this.request.body.file_name;
              var elderlyId = this.request.body.elderlyId;
              var where;
              if (elderlyId) {
                where = {
                  status: 1,
                  tenantId: tenantId,
                  elderlyId: elderlyId
                };
              } else {
                var liveInElderlys = yield app.modelFactory().model_query(app.models['psn_elderly'], {
                  select: 'name ',
                  where: {
                    status: 1,
                    tenantId: tenantId,
                    live_in_flag: true
                  }
                });
                console.log('liveInElderlys:', liveInElderlys);
                var elderlyIds = [];
                app._.each(liveInElderlys, (o) => {
                  elderlyIds.push(o._id);
                });
                where = {
                  status: 1,
                  tenantId: tenantId,
                  elderlyId: {$in: elderlyIds}
                };
              }

              var rawRows = yield app.modelFactory().model_query(app.models['psn_drugUseItem'], {
                select: 'elderly_name drugId quantity unit  description ',
                where: where
              }).populate('drugId', 'full_name short_name mini_unit');
              console.log('rawRows:', rawRows);
              var drugName;
              var rows = app._.map(rawRows, (raw) => {
                drugName = raw.drugId.short_name || raw.drugId.full_name;
                if (!raw.description) {
                  raw.description = '';
                }
                return {
                  '姓名': raw.elderly_name,
                  '药品名称': drugName,
                  '服用方法': raw.description,
                };
              });
              this.set('Parse', 'no-parse');
              this.body = yield app.excel_service.build(file_name, rows, ['姓名', '药品名称', '服用方法']);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************药品出入库*****************************/
      {
        method: 'drugInStock',
        verb: 'post',
        url: this.service_url_prefix + "/inStock",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.operated_by;
              var inStockData = this.request.body.inStockData;
              this.body = yield app.psn_drug_stock_service.inStock(tenantId, inStockData, operated_by);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'centerDrugInStock',
        verb: 'post',
        url: this.service_url_prefix + "/centerDrugInStock",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.operated_by;
              var inStockData = this.request.body.inStockData;
              this.body = yield app.psn_drug_stock_service.centerInStock(tenantId, inStockData, operated_by);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'drugStockInRecordCheck',
        verb: 'post',
        url: this.service_url_prefix + "/drugStockInRecordCheck",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var drugInOutStockId = this.request.body.drugInOutStockId;
              this.body = yield app.psn_drug_stock_service.stockInRecordCheck(tenantId, drugInOutStockId);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'updateDrugsInStock',
        verb: 'post',
        url: this.service_url_prefix + "/updateDrugsInStock",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var drugInOutStockId = this.request.body.drugInOutStockId;
              var inStockData = this.request.body.inStockData;
              var operated_by = this.request.body.operated_by;
              this.body = yield app.psn_drug_stock_service.updateInStock(tenantId, drugInOutStockId, inStockData, operated_by);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'elderlyDrugStockList',
        verb: 'post',
        url: this.service_url_prefix + "/elderlyDrugStockList",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;

              this.body = yield app.psn_drug_stock_service.elderlyStockList(tenantId, elderlyId);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'elderlyDrugUseWithStockList',
        verb: 'post',
        url: this.service_url_prefix + "/elderlyDrugUseWithStockList",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              this.body = yield app.psn_drug_stock_service.elderlyDrugUseWithStockList(tenantId, elderlyId);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'elderlyStockObject',
        verb: 'post',
        url: this.service_url_prefix + "/elderlyStockObject",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;

              var elderlyStockObject = yield app.psn_drug_stock_service._elderlyStockObject2(tenantId, elderlyId);
              this.body = app.wrapper.res.ret(elderlyStockObject);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'elderlyDrugStockSummary',
        verb: 'post',
        url: this.service_url_prefix + "/elderlyDrugStockSummary",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              var drugId = this.request.body.drugId;
              if (app._.isObject(drugId)) {
                drugId = drugId.id
              }
              this.body = yield app.psn_drug_stock_service.elderlyStockSummary(tenantId, elderlyId, drugId);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'allotdrugStockInRecordCheck',
        verb: 'post',
        url: this.service_url_prefix + "/allotdrugStockInRecordCheck",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              this.body = yield app.psn_drug_stock_service.allotdrugStockInRecordCheck(tenantId, elderlyId);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'backoutAllotDrug',
        verb: 'post',
        url: this.service_url_prefix + "/backoutAllotDrug",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.operated_by;
              var drugStockRowData = this.request.body.drugStockRowData;
              this.body = yield app.psn_drug_stock_service.backoutAllotDrug(tenantId, drugStockRowData, operated_by);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'drugOutStock',
        verb: 'post',
        url: this.service_url_prefix + "/outStock",
        handler: function (app, options) {
          return function*(next) {
            var tenant, elderly, drug;
            try {
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.operated_by;
              var outStockData = this.request.body.outStockData;
              this.body = yield app.psn_drug_stock_service.outStockByPeriod(tenantId, outStockData, operated_by);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'centerDrugOutStock',
        verb: 'post',
        url: this.service_url_prefix + "/centerDrugOutStock",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.operated_by;
              var outStockData = this.request.body.outStockData;
              this.body = yield app.psn_drug_stock_service.centerOutStock(tenantId, outStockData, operated_by);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'allotDrugToCenterStock',
        verb: 'post',
        url: this.service_url_prefix + "/allotToCenterStock",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.operated_by;
              var allotDrugData = this.request.body.allotDrugData;
              this.body = yield app.psn_drug_stock_service.allotToCenterStock(tenantId, allotDrugData, operated_by);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'scrapDrugOutStock',
        verb: 'post',
        url: this.service_url_prefix + "/scrapDrug",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var operated_by = this.request.body.operated_by;
              var scrapDrugData = this.request.body.scrapDrugData;
              this.body = yield app.psn_drug_stock_service.scrapDrug(tenantId, scrapDrugData, operated_by);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'leftElderlyDrugStockSummary',
        verb: 'post',
        url: this.service_url_prefix + "/leftElderlyDrugStockSummary",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var page = this.request.body.page;
              this.body = yield app.psn_drug_stock_service.leftElderlyDrugStockSummary(tenantId, page);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'updateDrugsOutStock',
        verb: 'post',
        url: this.service_url_prefix + "/updateDrugsOutStock",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var drugInOutStockId = this.request.body.drugInOutStockId;
              var outStockData = this.request.body.outStockData;
              var operated_by = this.request.body.operated_by;
              this.body = yield app.psn_drug_stock_service.updateOutStock(tenantId, drugInOutStockId, outStockData, operated_by);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'queryCenterStockAllotRecords',
        verb: 'post',
        url: this.service_url_prefix + "/queryCenterStockAllotRecords",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var page = this.request.body.page;
              this.body = yield app.psn_drug_stock_service.queryCenterStockAllotRecords(tenantId, page);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'queryElderlyDrugStock',
        verb: 'post',
        url: this.service_url_prefix + "/q/elderlyDrugStock",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              var keyword = this.request.body.keyword;
              this.body = yield app.psn_drug_stock_service.elderlyStockQuery(tenantId, elderlyId, keyword);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'drugOutStockInvalid',
        verb: 'post',
        url: this.service_url_prefix + "/drugOutStockInvalid",
        handler: function (app, options) {
          return function*(next) {
            try {
              var drugInOutStockId = this.request.body.drugInOutStockId;
              console.log(drugInOutStockId);
              var drugInOutStock = yield app.modelFactory().model_read(app.models['psn_drugInOutStock'], drugInOutStockId);
              if (!drugInOutStock || drugInOutStock.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到出入库记录!'});
                yield next;
                return;
              } else {
                var drugStock = yield app.modelFactory().model_one(app.models['psn_drugStock'], {
                  where: {
                    status: 1,
                    elderlyId: drugInOutStock.elderlyId,
                    drugId: drugInOutStock.drugId,
                    tenantId: drugInOutStock.tenantId,
                    unit: drugInOutStock.unit
                  }
                });
                drugStock.current_quantity = parseInt(drugStock.current_quantity) + parseInt(drugInOutStock.in_out_quantity);

                yield drugStock.save();
                drugInOutStock.valid_flag = false;
                yield drugInOutStock.save();

              }
              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'drugStockEditLogInsert',
        verb: 'post',
        url: this.service_url_prefix + "/drugStockEditLogInsert",
        handler: function (app, options) {
          return function*(next) {
            try {
              var drugStockId = this.request.body.drugStockId;
              var revised_quantity = this.request.body.revised_quantity;
              var origin_quantity = this.request.body.origin_quantity;
              var tenantId = this.request.body.tenantId;
              var operated_by_name = this.request.body.operated_by_name;
              var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }
              var drugStock = yield app.modelFactory().model_read(app.models['psn_drugStock'], drugStockId);
              if (!drugStock || drugStock.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到库存记录!'});
                yield next;
                return;
              } else {
                yield app.modelFactory().model_create(app.models['psn_drugStockEditLog'], {
                  tenantId: tenantId,
                  revised_quantity: revised_quantity,
                  origin_quantity: origin_quantity,
                  status: 1,
                  drugStockId: drugStockId,
                  operated_by_name: operated_by_name
                });
              }
              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
              var ret = yield app.bed_monitor_status.checkSessionAndGetLatestSmbPerMinuteRecord(this.request.body.devId, this.request.body.openId);
            }
            yield next;
          };
        }
      },
      {
        method: 'updateMiniUnitOfDrugStockItem',
        verb: 'post',
        url: this.service_url_prefix + "/updateMiniUnitOfDrugStockItem",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var elderlyId = this.request.body.elderlyId;
              var drugStockId = this.request.body.drugStockId;
              var new_mini_unit = this.request.body.new_mini_unit;
              var operated_by = this.request.body.operated_by;
              this.body = yield app.psn_drug_stock_service.updateMiniUnitOfDrugStockItem(tenantId, elderlyId, drugStockId, new_mini_unit, operated_by);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************生命体征-上海万沣 睡眠带*****************************/
      {
        method: 'getLatestSmbPerMinuteRecord',
        verb: 'post',
        url: this.service_url_prefix + "/getLatestSmbPerMinuteRecord",
        handler: function (app, options) {
          return function*(next) {
            try {
              var ret = yield app.bed_monitor_status.checkSessionAndGetLatestSmbPerMinuteRecord(this.request.body.devId, this.request.body.openId);
              this.body = ret;
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************生命体征-铭众医疗 一体机*****************************/
      {
        method: 'vitalSign$MingZhong$updateElderlyUsers',
        verb: 'post',
        url: this.service_url_prefix + "/vitalSign$MingZhong$updateElderlyUsers",
        handler: function (app, options) {
          return function *(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var doctorAccountId = this.request.body.doctorAccountId;
              yield app.vital_sign_status.mingzhong$update_elderly_users(tenantId, doctorAccountId);
              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************餐饮管理*****************************/
      {
        method: 'mealMenuSchedule',
        verb: 'post',
        url: this.service_url_prefix + "/mealMenuSchedule", //按周查找菜单
        handler: function (app, options) {
          return function*(next) {
            var tenant, xAxisValueStart, xAxisValueEnd;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var xAxisRangePoints = this.request.body.x_axis_range_points;
              xAxisValueStart = app.moment(xAxisRangePoints.start);
              xAxisValueEnd = app.moment(xAxisRangePoints.end);

              console.log('xAxisRangePoints:', xAxisRangePoints);
              console.log('前置检查完成-----------------');

              var rows = yield app.modelFactory().model_query(app.models['psn_mealMenu'], {
                select: 'x_axis y_axis aggr_value',
                where: {
                  tenantId: tenantId,
                  x_axis: {
                    '$gte': xAxisValueStart.toDate(),
                    '$lt': xAxisValueEnd.add(1, 'days').toDate()
                  }
                }
              });
              console.log('rows:', rows);

              this.body = app.wrapper.res.ret({
                items: rows
              });
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'mealMenuScheduleSave',
        verb: 'post',
        url: this.service_url_prefix + "/mealMenuScheduleSave",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var toSaveRows = this.request.body.toSaveRows;
              app._.each(toSaveRows, (o) => {
                o.tenantId = tenantId
              });

              // 查找x_axis range & y_axis_range
              var xAxisValue;
              var xAxisRange = app._.uniq(app._.map(toSaveRows, (o) => {
                xAxisValue = app.moment(o.x_axis);
                return {
                  'x_axis': {
                    '$gte': xAxisValue.toDate(),
                    '$lt': xAxisValue.add(1, 'days').toDate()
                  }
                }
              }));
              var yAxisRange = app._.uniq(app._.map(toSaveRows, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              console.log('removeWhere:', removeWhere);
              console.log('xAxisRange:', xAxisRange);
              console.log('yAxisRange:', yAxisRange);

              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_bulkInsert(app.models['psn_mealMenu'], {
                rows: toSaveRows,
                removeWhere: removeWhere
              });

              console.log('配餐保存成功....');

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'mealMenuScheduleRemove',
        verb: 'post',
        url: this.service_url_prefix + "/mealMenuScheduleRemove",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var toRemoveRows = this.request.body.toRemoveRows;


              console.log('toRemoveRows:', toRemoveRows);

              var xAxisValue;
              var xAxisRange = app._.uniq(app._.map(toRemoveRows, (o) => {
                xAxisValue = app.moment(o.x_axis);
                return {
                  'x_axis': {
                    '$gte': xAxisValue.toDate(),
                    '$lt': xAxisValue.add(1, 'days').toDate()
                  }
                }
              }));
              var yAxisRange = app._.uniq(app._.map(toRemoveRows, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              console.log('前置检查完成');

              var ret = yield app.modelFactory().model_remove(app.models['psn_mealMenu'], removeWhere);
              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'mealMenuTemplateImport',
        verb: 'post',
        url: this.service_url_prefix + "/mealMenuTemplateImport",
        handler: function (app, options) {
          return function*(next) {
            try {
              var mealMenuTemplateId = this.request.body.mealMenuTemplateId;
              var mealMenuTemplate = yield app.modelFactory().model_read(app.models['psn_mealMenuTemplate'], mealMenuTemplateId);
              if (!mealMenuTemplate || mealMenuTemplate.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到排餐模版!'});
                yield next;
                return;
              }

              var toImportXAxisRange = this.request.body.toImportXAxisRange;

              var xAxisValue, xAxisDate;
              var xAxisDayDateMap = {};
              var xAxisRange = app._.map(toImportXAxisRange, (o) => {
                xAxisValue = app.moment(o);
                xAxisDate = xAxisValue.toDate();
                xAxisDayDateMap[xAxisValue.day()] = xAxisDate; //xAxisValue.day()为0-6表示的星期几
                return {'x_axis': {'$gte': xAxisDate, '$lt': xAxisValue.add(1, 'days').toDate()}}
              });
              console.log('xAxisRange:', xAxisRange);
              console.log('xAxisDayDateMap :', xAxisDayDateMap);

              var templateItems = mealMenuTemplate.content;
              var yAxisRange = app._.uniq(app._.map(templateItems, (o) => {
                return o.y_axis;
              }));

              var removeWhere = {
                tenantId: mealMenuTemplate.tenantId,
                y_axis: {$in: yAxisRange},
                $or: xAxisRange
              };

              var toSaveRows = app._.map(templateItems, (o) => {
                var x_axis = xAxisDayDateMap[o.x_axis];
                return {
                  x_axis: x_axis,
                  y_axis: o.y_axis,
                  aggr_value: o.aggr_value,
                  tenantId: mealMenuTemplate.tenantId
                };
              });

              var ret = yield app.modelFactory().model_bulkInsert(app.models['psn_mealMenu'], {
                rows: toSaveRows,
                removeWhere: removeWhere
              });

              console.log('模版导入成功');

              var groupedSaveRows = app._.groupBy(toSaveRows, (o) => {
                "use strict";
                return o.x_axis + '$' + o.y_axis + '$' + o.tenantId;
              });

              this.body = app.wrapper.res.default();
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'mealMenuSaveAsTemplate',
        verb: 'post',
        url: this.service_url_prefix + "/mealMenuSaveAsTemplate",
        handler: function (app, options) {
          return function*(next) {
            var tenant;
            try {
              var tenantId = this.request.body.tenantId;
              tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var mealMenuTemplateName = this.request.body.mealMenuTemplateName;
              var toSaveRows = this.request.body.toSaveRows;
              app._.each(toSaveRows, (o) => {
                o.tenantId = tenantId
              });

              console.log('toSaveRows:', toSaveRows);

              var mealMenuTemplate = yield app.modelFactory().model_one(app.models['psn_mealMenuTemplate'], {
                where: {
                  status: 1,
                  name: mealMenuTemplateName,
                  tenantId: tenantId
                }
              });

              console.log('前置检查完成');
              var isCreate = !mealMenuTemplate;
              if (isCreate) {
                yield app.modelFactory().model_create(app.models['psn_mealMenuTemplate'], {
                  name: mealMenuTemplateName,
                  content: toSaveRows,
                  tenantId: tenantId
                });
              } else {
                mealMenuTemplate.content = toSaveRows;
                yield mealMenuTemplate.save();
              }

              this.body = app.wrapper.res.ret(isCreate);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'mealOrderRecord',
        verb: 'post',
        url: this.service_url_prefix + "/mealOrderRecord",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log('mealOrderRecord-detail body:',this.request.body);
              var tenantId = this.request.body.tenantId;
              var check_time = app.moment(this.request.body.order_date);
              var roomIds = this.request.body.roomIds;

              var where = {tenantId: app.ObjectId(tenantId), x_axis: {'$gte': check_time.toDate(), '$lt': check_time.add(1, 'days').toDate()}};
              if(roomIds){
                var elderlys = yield app.modelFactory().model_query(app.models['psn_elderly'],{
                  select: '_id',
                  where: {
                    tenantId: tenantId,
                    "room_value.roomId": {$in:roomIds}
                  }
                });
                console.log('elderlys:',elderlys);
                var elderlyIds=[];
                app._.each(elderlys,function (o) {
                  elderlyIds.push(o._id);
                });
                where.elderlyId = {'$in':elderlyIds};
              }

              var rows = yield app.modelFactory().model_aggregate(app.models['psn_mealOrderRecord'], [
                {
                  $match: where
                },
                {
                  $lookup: {
                    from: "psn_meal",
                    localField: "mealId",
                    foreignField: "_id",
                    as: "mealName"
                  }
                },
                {
                  $project: {
                    elderlyId: '$elderlyId',
                    elderly_name: '$elderly_name',
                    x_axis: '$x_axis',
                    meal: {y_axis: '$y_axis', mealId: '$mealId', quantity: '$quantity', mealName: '$mealName'}
                  }
                },
                {
                  $group: {
                    _id: '$elderlyId',
                    elderly_name: {$first: '$elderly_name'},
                    x_axis: {$first: '$x_axis'},
                    orderedMeals: {$push: '$meal'}
                  }
                },
                {
                  $lookup: {
                    from: "psn_elderly",
                    localField: "_id",
                    foreignField: "_id",
                    as: "elderly"
                  }
                }
              ]);
              console.log('mealOrderRecord rows:', rows);
              app._.each(rows, (o) => {
                var groupedRows = app._.groupBy(o.orderedMeals, (meal) => {
                  "use strict";
                  return meal.y_axis;
                });
                o.orderedMeals = groupedRows;
              });

              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'mealOrderRecordStat',
        verb: 'post',
        url: this.service_url_prefix + "/mealOrderRecordStat",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var order_date = app.moment(this.request.body.order_date);
              var tenant = yield app.modelFactory().model_read(app.models['pub_tenant'], tenantId);
              if (!tenant || tenant.status == 0) {
                this.body = app.wrapper.res.error({message: '无法找到养老机构!'});
                yield next;
                return;
              }

              var psn_meal_periods = tenant.other_config.psn_meal_periods.length > 0 ? tenant.other_config.psn_meal_periods : [DIC.D3040.BREAKFAST, DIC.D3040.LUNCH, DIC.D3040.DINNER, DIC.D3040.SUPPER];

              var where = {tenantId: app.ObjectId(tenantId), x_axis: {'$gte': order_date.toDate(), '$lt': order_date.add(1, 'days').toDate()}};

              var ag1 =  {
                $project: {
                  _id: 0,
                  districtId: '$_id.districtId',
                  floor: '$_id.floor',
                  date: '$_id.date',
                  // 'A0000': {$cond: {if: {$eq: ['$_id.period', 'A0000']}, then: '$$CURRENT.meals', else: []}},
                  // 'A0001': {$cond: {if: {$eq: ['$_id.period', 'A0001']}, then: '$$CURRENT.meals', else: []}},
                  // 'A0002': {$cond: {if: {$eq: ['$_id.period', 'A0002']}, then: '$$CURRENT.meals', else: []}},
                  // 'A0003': {$cond: {if: {$eq: ['$_id.period', 'A0003']}, then: '$$CURRENT.meals', else: []}}
                }
              }, ag2 = {
                $group: {
                  _id: {date: '$date', districtId: '$districtId', floor: '$floor'},
                  // 'A0000': {$push: '$A0000'},
                  // 'A0001': {$push: '$A0001'},
                  // 'A0002': {$push: '$A0002'},
                  // 'A0003': {$push: '$A0003'}
                }
              }, ag3 = {
                $project: {
                  _id: 0,
                  districtId: '$_id.districtId',
                  floor: '$_id.floor',
                  date: '$_id.date',
                  // 'A0000': {$concatArrays: [{$ifNull: [ {$arrayElemAt: ['$A0000', 0]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0000', 1]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0000', 2]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0000', 3]}, []]}]},
                  // 'A0001': {$concatArrays: [{$ifNull: [ {$arrayElemAt: ['$A0001', 0]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0001', 1]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0001', 2]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0001', 3]}, []]}]},
                  // 'A0002': {$concatArrays: [{$ifNull: [ {$arrayElemAt: ['$A0002', 0]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0002', 1]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0002', 2]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0002', 3]}, []]}]},
                  // 'A0003': {$concatArrays: [{$ifNull: [ {$arrayElemAt: ['$A0003', 0]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0003', 1]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0003', 2]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0003', 3]}, []]}]}
                }
              }, ag4 = {
                $group: {
                  _id: {date: '$date', districtId: '$districtId'},
                  floors: {
                    $push: {
                      floor: '$floor',
                      // A0000: '$A0000',
                      // A0001: '$A0001',
                      // A0002: '$A0002',
                      // A0003: '$A0003'
                    }
                  }
                }
              };

              app._.each(psn_meal_periods, (periodKey)=> {
                ag1.$project[periodKey] = {$cond: {if: {$eq: ['$_id.period', periodKey]}, then: '$$CURRENT.meals', else: []}};
                ag2.$group[periodKey] = {$push: '$' + periodKey};
                // var concatArrays = app._.map(psn_meal_periods, (k,i) => {
                //   return {$arrayElemAt: ['$' + periodKey, i]}
                // });
                //[{$arrayElemAt: [{$ifNull: [ {$arrayElemAt: ['$A0000', 0]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0000', 1]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0000', 2]}, []]}, {$ifNull: [ {$arrayElemAt: ['$A0000', 3]}, []]}]}]
                ag3.$project[periodKey] = {$concatArrays: app._.map(psn_meal_periods, (k,i) => ({$ifNull: [{$arrayElemAt: ['$' + periodKey, i]}, []]}))};
                console.log('===========', ag3.$project[periodKey].$concatArrays);
                ag4.$group.floors.$push[periodKey] = '$' + periodKey;
              });

              // console.log('ag1>>>',ag1);
              // console.log('ag2>>>',ag2);
              // console.log('ag3>>>',ag3);
              // console.log('ag4>>>',ag4);

              var rows = yield app.modelFactory().model_aggregate(app.models['psn_mealOrderRecord'], [
                {
                  $match: where
                },
                {
                  $lookup: {
                    from: "psn_elderly",
                    localField: "elderlyId",
                    foreignField: "_id",
                    as: "elderly"
                  }
                },
                {
                  $unwind: '$elderly'
                },
                {
                  $project: {
                    elderly_name: '$elderly.name',
                    roomId: '$elderly.room_value.roomId',
                    period: '$y_axis',
                    date: {$dateToString: {format: "%Y-%m-%d", date: "$x_axis"}},
                    mealId: 1,
                    quantity: 1
                  }
                },
                {
                  $lookup: {
                    from: "psn_room",
                    localField: "roomId",
                    foreignField: "_id",
                    as: "room"
                  }
                },
                {
                  $unwind: '$room'
                },
                {
                  $project: {
                    elderly_name: 1,
                    districtId: '$room.districtId',
                    floor: '$room.floor',
                    date: 1,
                    period: 1,
                    mealId: 1,
                    quantity: 1
                  }
                },
                {
                  $group: {
                    _id: {date: '$date', districtId: '$districtId', floor: '$floor', period: '$period', mealId: '$mealId'},
                    quantity: {$sum: '$quantity'}
                  }
                },
                {
                  $lookup: {
                    from: "psn_meal",
                    localField: "_id.mealId",
                    foreignField: "_id",
                    as: "meal"
                  }
                },
                {
                  $unwind: '$meal'
                },
                {
                  $project: {
                    _id: 0,
                    districtId: '$_id.districtId',
                    floor: '$_id.floor',
                    date: '$_id.date',
                    period: '$_id.period',
                    meal: {name: '$meal.name', quantity: '$quantity'}
                  }
                },
                {
                  $sort:{
                    floor: 1
                  }
                },
                {
                  $group: {
                    _id: {date: '$date', districtId: '$districtId', floor: '$floor', period: '$period'},
                    meals: {$push: '$meal'}
                  }
                },
                ag1,
                ag2,
                ag3,
                ag4,
                {
                  $lookup: {
                    from: "psn_district",
                    localField: "_id.districtId",
                    foreignField: "_id",
                    as: "district"
                  }
                },
                {
                  $unwind: '$district'
                },
                {
                  $project: {
                    _id: 0,
                    districtId: '$district._id',
                    district_name: '$district.name',
                    date: '$_id.date',
                    floors: '$floors'
                  }
                },
                {
                  $sort:{
                    district_name: 1
                  }
                }
              ]);
              console.log('mealOrderRecordstat rows:', rows);

              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'mealOrderRecordStat2',
        verb: 'post',
        url: this.service_url_prefix + "/mealOrderRecordStat2",
        handler: function (app, options) {
          return function*(next) {
            try {
              var tenantId = this.request.body.tenantId;
              var order_date = app.moment(this.request.body.order_date);

              var where = {tenantId: app.ObjectId(tenantId), x_axis: {'$gte': order_date.toDate(), '$lt': order_date.add(1, 'days').toDate()}};

              var rows = yield app.modelFactory().model_aggregate(app.models['psn_mealOrderRecord'], [{
                $match: where
              },
                {
                  $lookup: {
                    from: "psn_elderly",
                    localField: "elderlyId",
                    foreignField: "_id",
                    as: "elderly"
                  }
                },
                {
                  $unwind: '$elderly'
                },
                {
                  $project: {
                    elderly_name: '$elderly.name',
                    districtId: '$elderly.room_value.districtId',
                    roomId: '$elderly.room_value.roomId',
                    bed_no: '$elderly.room_value.bed_no',
                    period: '$y_axis',
                    date: {$dateToString: {format: "%Y-%m-%d", date: "$x_axis"}},
                    mealId: 1,
                    quantity: 1
                  }
                },
                {
                  $lookup: {
                    from: "psn_room",
                    localField: "roomId",
                    foreignField: "_id",
                    as: "room"
                  }
                },
                {
                  $unwind: '$room'
                },
                {
                  $project: {
                    elderly_name: 1,
                    districtId: '$room.districtId',
                    roomId: 1,
                    room_name: '$room.name',
                    bed_no: 1,
                    date: 1,
                    period: 1,
                    mealId: 1,
                    quantity: 1
                  }
                },
                {
                  $group: {
                    _id: {elderly_name:'$elderly_name', date: '$date', districtId: '$districtId', roomId: '$roomId', room_name:'$room_name', bed_no: '$bed_no', period: '$period', mealId: '$mealId'},
                    quantity: {$sum: '$quantity'}
                  }
                },
                {
                  $project: {
                    _id: 0,
                    districtId: '$_id.districtId',
                    date: '$_id.date',
                    period: '$_id.period',
                    mealId: '$_id.mealId',
                    elderly: {roomId: '$_id.roomId', room_name: '$_id.room_name', bed_no: '$_id.bed_no', name: '$_id.elderly_name', quantity: '$quantity'}
                  }
                },
                {
                  $sort: {'elderly.room_name': 1, 'elderly.bed_no':1}
                },
                {
                  $group: {
                    _id: {date: '$date', districtId: '$districtId', period: '$period', mealId: '$mealId'},
                    elderlys: {$push: '$elderly'}
                  }
                },
                {
                  $lookup: {
                    from: "psn_district",
                    localField: "_id.districtId",
                    foreignField: "_id",
                    as: "district"
                  }
                },
                {
                  $unwind: '$district'
                },
                {
                  $project: {
                    _id: 0,
                    districtId: '$district._id',
                    district_name: '$district.name',
                    period: '$_id.period',
                    date: '$_id.date',
                    mealId: '$_id.mealId',
                    elderlys: 1
                  }
                },
                {
                  $sort: {'district_name': 1}
                },
                {
                  $group: {
                    _id: {date: '$date', mealId: '$mealId', period: '$period'},
                    districts: {
                      $push: {
                        districtId: '$districtId',
                        district_name: '$district_name',
                        elderlys: '$elderlys'
                      }
                    }
                  }
                },
                {
                  $lookup: {
                    from: "psn_meal",
                    localField: "_id.mealId",
                    foreignField: "_id",
                    as: "meal"
                  }
                },
                {
                  $unwind: '$meal'
                },
                {
                  $project: {
                    _id: 0,
                    date: '$_id.date',
                    period: '$_id.period',
                    mealId: '$_id.mealId',
                    meal_name: '$meal.name',
                    districts: 1
                  }
                },
                {
                  $group: {
                    _id: {date: '$date', period: '$period'},
                    meals: {
                      $push: {
                        mealId: '$mealId',
                        meal_name: '$meal_name',
                        districts: '$districts'
                      }
                    }
                  }
                },
                {
                  $sort: {'_id.period': 1}
                },
                {
                  $project: {
                    _id: 0,
                    date: '$_id.date',
                    period: '$_id.period',
                    meals: 1
                  }
                }
              ]);
              console.log('mealOrderRecordStat2 rows:', rows);

              this.body = app.wrapper.res.rows(rows);
            } catch (e) {
              console.log(e);
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      {
        method: 'excel$dataByClient',
        verb: 'post',
        url: this.service_url_prefix + "/excel/dataByClient",
        handler: function (app, options) {
          return function*(next) {
            try {
              var file_name = this.request.body.file_name;
              var rows = this.request.body.rows;
              var title = this.request.body.title;
              console.log('body:',this.request.body);
              if(!rows){
                this.body = app.wrapper.res.error({message: '导出数据为空!'});
              }
              this.set('Parse', 'no-parse');
              this.body = yield app.excel_service.build(file_name, rows,title);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /************************评估管理***************************/
      {
        method:'copyRemoteTempTopics',
        verb:'post',
        url: this.service_url_prefix + "/copyRemoteTempTopics",
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log('body:',this.request.body);
              var tenantId = this.request.body.tenantId;
              var remoteData = this.request.body.remoteData;
              var modeSections = this.request.body.modeSections;
              var topics=[],topicsId;
              if(remoteData.section){
                app._.each(remoteData.section,function (o) {
                  topics = topics.concat(o.topics);
                });
              }
              if(remoteData.newSectionTopics){
                topics = topics.concat(remoteData.newSectionTopics);
              }
              console.log('topics:',topics);

              topicsId = app._.map(topics,function (o) {
                return o.topicId;
              });
              var remoteRows = yield app.modelFactory().model_query(app.models['pub_evaluationItem'],{
                where: {
                  status:1,
                  _id:{$in:topicsId},
                  tenantId:{$in: [null, undefined]}
                }
              });
              var toSaveRows=app._.map(remoteRows,function (o) {
                return {
                  name:o.name,
                  description:o.description,
                  type:o.type,
                  url:o.url,
                  mode:o.mode,
                  options:o.options,
                  sourceId:o._id,
                  tenantId:tenantId
                }
              });
              console.log('toSaveRows:',toSaveRows);
              var ret = yield app.modelFactory().model_bulkInsert(app.models['pub_evaluationItem'], {
                rows: toSaveRows
              });
              console.log('ret:',ret);

              //把拷贝到本地库的topic的_id复制到模板中的topicId
              app._.each(modeSections,function (o) {
                if(o.remote){
                  app._.each(o.topics,function (topic) {
                    var idx = app._.findIndex(ret,function (retItem) {
                      return retItem.sourceId == topic.topicId;
                    });
                    console.log('idx:',idx);
                    if(idx!=-1){
                      console.log('before:',topic.topicId);
                      topic.topicId = ret[idx]._id;
                      console.log('after:',topic.topicId);
                    }
                  });
                }
              });
              console.log('modeSections:',modeSections);
              this.body = app.wrapper.res.ret(modeSections);
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      },
      /**********************其他*****************************/
      {
        method: 'batchCreatePy',
        verb: 'post',
        url: this.service_url_prefix + "/batchCreatePy", //生成表单指定对象的首拼
        handler: function (app, options) {
          return function*(next) {
            try {
              console.log('body:',this.request.body);
              var tenantId = this.request.body.tenantId;
              var targetObj = this.request.body.targetObj;
              var dbTable = this.request.body.dbTable;
              var select = targetObj+' '+'py';
              console.log('select:',select);
              var targetBd = yield app.modelFactory().model_query(app.models[dbTable],{
                select:select,
                where: {
                  status:1,
                  py:{$in: [null, undefined]},
                  tenantId: tenantId
                }
              });
              console.log('targetBd:',targetBd);

              var dbItem,initialArr;
              for(var i=0,len=targetBd.length;i<len;i++){
                dbItem = targetBd[i];
                initialArr= transliteration.slugify(dbItem[targetObj]).split('-');
                dbItem.py = app._.map(initialArr,function (o) {
                  return o[0];
                }).join('');
                yield  dbItem.save();
              }
              console.log('targetBd after transliteration:',targetBd);

              this.body = app.wrapper.res.default();
            } catch (e) {
              self.logger.error(e.message);
              this.body = app.wrapper.res.error(e);
            }
            yield next;
          };
        }
      }
    ];

    return this;
  }
}.init();
//.init(option);
