/**
 * User: ngnono
 * Date: 15-4-5
 * Time: 下午3:47
 * To change this template use File | Settings | File Templates.
 */

'use strict';
var pkg = require('../../package.json');

module.exports = function (router) {

    router.get('/', function (req, res) {
        res.json({status: true, version: pkg.version});
    });
};