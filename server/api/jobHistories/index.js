/**
 * User: ngnono
 * Date: 15-5-17
 * Time: 下午4:20
 * To change this template use File | Settings | File Templates.
 */

'use strict';


var debug = require('debug')('server:api:jobHistories:index');
var _ = require('lodash');

var filter = require('../../lib/middleware');
var constant = require('../../lib/constant');
var es = require('../../lib/elasticsearch');
var esClient = require('../../lib/resourceProxy')({client: es});

var _index = constant.index.name;
var _type = 'job_histories';


exports = module.exports = function (router) {
    /**
     * 截取id
     */
    router.param('id', function (req, res, next, id) {

        id = id || '';
        if (!id) {
            return next(new Error('failed to load job_histories(' + id + ').'));
        }

        esClient.get({
            id: id,
            index: _index,
            type: _type
        }, function (err, data) {
            if (err) {
                console.error(err);

                //return next(err);
                res.status(404);
                return res.json({status: false, statusCode: 404, message: err.message});
            }

            if (!data) {
                return next(new Error('failed to load job_histories(' + id + ').'));
            }

            /**
             * 业务对象
             */
            req.jobHistory = data._source;
            req.jobHistory._id = data._id;

            next();
        });

        debug('id:%s', id);
    });

    /**
     * 单条索引会检查
     */
    router.post('/', [filter.checkBodyIdFilter], function (req, res) {
        var body = req.body;
        var id = body.id;

        delete  body.id;
        esClient.save({
            body: body,
            index: _index,
            type: _type,
            id: id
        }, function (err, rst) {
            //_id,created=True
            if (err) {
                debug('post.err:%s', JSON.stringify(err));
                var code = err.code || 400;
                res.status(code);
                res.json({
                    status: false,
                    message: err.message || err,
                    code: code
                });

                return;
            }
            else {
                res.status(201);
                res.json({
                    status: true,
                    data: rst,
                    code: 201
                });
            }
        });
    });

    /**
     * 删除
     */
    router.delete('/:id', function (req, res) {

        var cb = function (error, result) {
            if (error) {
                var code = error.errorCode || 400;
                res.status(code);

                return res.json({
                    status: false,
                    message: error.message,
                    code: code
                });
            }
            res.status(204);

            res.json({
                status: true,
                data: result,
                code: 204

            })
        };

        esClient.del({
            index: _index,
            type: _type,
            id: req.jobHistory._id
        }, cb);
    });

    /**
     * get item by id
     */
    router.get('/:id', function (req, res) {

        res.status(200);
        res.json({
            status: true,
            data: req.jobHistory
        });

    });
};