/**
 * User: ngnono
 * Date: 15-4-19
 * Time: 下午10:10
 * To change this template use File | Settings | File Templates.
 */

'use strict';
var debug = require('debug')('server:api:middleware');


exports.checkBodyFilter = checkBodyFilter;
exports.checkBodyIdFilter = checkBodyIdFilter;

/**
 * 检查BODY
 * @param req
 * @param res
 * @param next
 */
function checkBodyFilter(req, res, next) {
    debug('checkBody:%s', JSON.stringify(req.body));

    if (!req.body) {
        res.status(400);

        res.json({
            status: false,
            code: 400,
            message: 'body 不能为空'
        });
    } else {
        next();
    }
}

/**
 * 检查 body中是否存在ID
 * @param req
 * @param res
 * @param next
 */
function checkBodyIdFilter(req, res, next) {
    debug('checkBody:%s', JSON.stringify(req.body));
    if (!req.body) {
        res.status(400);

        res.json({
            status: false,
            code: 400,
            message: 'body 不能为空'
        });
    } else if (!req.body.id) {
        res.status(400);

        res.json({
            status: false,
            code: 400,
            message: 'body.id 不能为空'
        });
    } else {
        next();
    }
}