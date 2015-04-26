/**
 * User: ngnono
 * Date: 15-4-19
 * Time: 下午9:59
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var debug = require('debug')('server:api:articlesColumns:index');
var _ = require('lodash');

var filter = require('../../lib/middleware');
var constant = require('../../lib/constant');
var es = require('../../lib/elasticsearch');
var esClient = require('../../lib/resourceProxy')({client: es});

var _index = constant.index.name;
var _type = 'articles_columns';


exports = module.exports = function (router) {
    /**
     * 截取id
     */
    router.param('id', function (req, res, next, id) {

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
                return next(new Error('failed to load articles(' + id.toString() + ').'));
            }

            /**
             * 业务对象
             */
            req.articleColumn = data;

            next();
        });

        debug('id:%s', id);
    });

    /**
     * 批量索引
     */
    router.post('/bulk', function (req, res) {
        var body = [];
        _.forEach(req.body, function (d) {
            if(d){
                d['parent'] = d['article_id'];
                body.push(d);
            }
        });

        var docs = {
            index: _index,
            type: _type,
            body: body
        };

        esClient.save(docs, function (err, rst) {
            if (err) {
                debug('bulk.err:%s', JSON.stringify(err));
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

    router.post('/', [filter.checkBodyIdFilter], function (req, res) {
        var body = req.body;
        var id = body.id;

        delete  body.id;
        esClient.save({
            body: body,
            index: _index,
            type: _type,
            id: id,
            parent: body['article_id']
        }, function (err, rst) {
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

        //var id = body['article_id'] + '_' + body['column_id'];

    });

    /**
     * 删除
     */
    router.delete('/:id', function (req, res, id) {

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
            id: id
        }, cb);
    });

    /**
     * get item by id
     */
    router.get('/:id', function (req, res, id) {

        res.status(200);
        res.json({
            status: true,
            data: req.articleColumn
        });

    });
};