/*
 * @Author: yrm 
 * @Date: 2017-05-08 14:58:54 
 * @Last Modified by: yrm
 * @Last Modified time: 2017-05-08 15:00:44
 */

var object_type = 'psn_assessment';
var object_key = 'code';
var prefix = undefined;//可能需要同步到数据库
var suffix = undefined;//可能需要同步到数据库
var date_period_format = 'YYMM';//可能需要同步到数据库
var min = 1; //可能需要同步到数据库
var max = 99;//可能需要同步到数据库
var step = 1;//可能需要同步到数据库

module.exports = {
    object_type: object_type,
    object_key: object_key,
    prefix: prefix,
    date_area_period_format: date_period_format,
    //date_period: ctx.moment().format(date_period_format),因为是动态的
    suffix: suffix,
    min: min,
    max: max,
    step: step,
    current: min
};
