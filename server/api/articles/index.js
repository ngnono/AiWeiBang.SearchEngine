/**
 * User: ngnono
 * Date: 15-4-5
 * Time: 下午3:47
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var debug = require('debug')('server:api:articles:index');
var _ = require('lodash');
var config = require('config');

var filter = require('../../lib/middleware');
var es = require('../../lib/elasticsearch');
var esClient = require('../../lib/resourceProxy')({client: es});

var _index = config.get('indices_name');
var _type = 'articles';
var _type4ArticlesColoums = 'articles_columns';

/**
 * 处理分类聚合实体作为分割符号进行处理
 * @type {string}
 */
var SPLIT = '__split__%_';

function _save(body, callback) {
    if (!body) {
        return callback(new Error('body is required!'));
    }

    if (_.isArray(body)) {
        //批量
        var docs = {
            index: _index,
            type: _type,
            body: body
        };

        esClient.save(docs, callback);
    } else {
        var id = body.id || '';
        if (!id) {

            return callback(new Error('id is required!'));
        }

        var doc = {
            index: _index,
            type: _type,
            id: id,
            body: body
        };

        esClient.save(doc, callback);
    }
}

/**
 * 对查询字符串解析
 * @param query
 * @returns {{query: {bool: {must: Array}}, facets: {}, from: (*|number), size: (*|number), sort: (*|{})}}
 * @private
 */
var _qeruyParser = function (query) {


    var result = {
        query: {
            bool: {must: []}
        },
        facets: {},
        from: query.from || 0,
        size: query.size || 10,
        sort: []
    };

    var specialTermFields = {'column_id': null};
//    var specialRangeFields = {'column_ids': []};

    var termParser = function (query, field) {
        if (query[field]) {
            var queryItem = {"term": {}};
            queryItem.term[field] = query[field];

            return queryItem;
        }

        return null;
    };

    var rangeTypes = ['gte', 'gt', 'lte', 'lt'];
    var setVal = function (obj, k, v) {
        obj[k] = v;

        return obj
    };
    var rangeParser = function (query, field) {

        debug('rangeParser.rangeItem:%s', JSON.stringify(query));
        var val = query[field];
        if (val) {
            var rangeItem = {
                "range": {}
            };

            rangeTypes.forEach(function (t) {
                if (val[t]) {
                    rangeItem.range[field] = setVal({}, t, val[t]);
                }
            });

            return rangeItem;
        }

        return null;
    };

    var sortParser = function (query) {
        debug('sortParser.query:%s', JSON.stringify(query));
        var fieldName = query['field'];
        var fieldValue = query['params'];
        if (fieldName) {
            var item = {};
            if (!fieldValue || _.isString(fieldValue)) {
                item[fieldName] = fieldValue || 'asc';
            } else if (_.isArray(fieldValue)) {
                debug('sortParser.array:%s', JSON.stringify(fieldValue));
                var t = {};

                debug('length:%s', fieldValue.length);
                for (var i = 0; i < fieldValue.length; i += 2) {
                    debug('f:%s', fieldValue[i]);
                    debug('f:%s', fieldValue[i + 1]);

                    t[fieldValue[i]] = t[fieldValue[i + 1]];
                }
                debug('sortParser.array.t:%s', JSON.stringify(t));

                item[fieldName] = t;

            } else {
                item[fieldName] = fieldValue;
            }

            debug('sortParser.item:%s', JSON.stringify(item));
            return item;
        }

        return null;
    };

    if (query['must']) {

        var must = query['must'];
        /**
         * 范围
         */
        if (must['range']) {
            var ranges = must.range;

            if (_.isArray(ranges)) {
                ranges.forEach(function (r) {
                    var item = rangeParser(ranges, r);
                    if (item !== null) {
                        result.query.bool.must.push(item);
                    }
                });
            } else {
                var keys = _.keys(ranges);
                keys.forEach(function (r) {
                    var item = rangeParser(ranges, r);
                    if (item !== null) {
                        result.query.bool.must.push(item);
                    }
                });
            }
        }

        /**
         * terms
         */
        if (must['terms']) {
            var terms = must['terms'];
            if (terms['column_id']) {
                specialTermFields.column_id = terms.column_id;

                delete terms.column_id;
            }
            /**--------------------------------------------
             * 处理所有的Term查询提条件
             --------------------------------------------*/
            if (_.isArray(terms)) {
                terms.forEach(function (rule) {
                    var item = termParser(terms, rule);
                    if (item !== null) {
                        result.query.bool.must.push(item);
                    }
                });
            } else {
                var keys = _.keys(terms);
                keys.forEach(function (rule) {
                    var item = termParser(terms, rule);
                    if (item !== null) {
                        result.query.bool.must.push(item);
                    }
                });
            }

        }
    }

    if (query['should']) {
        //TODO: 没做处理
    }

    /**--------------------------------------------
     * 处理q , 不传参数获取所有数据
     --------------------------------------------*/
    if (query['q']) {
        result.query.bool.must.push({
            "match": {
                "q": {
                    "query": query.q,
                    "operator": "and"
                }
            }
        });
    } else {
        result.query.bool.must.push({
            "match_all": {}
        });
    }

    /**
     *  处理 SORT
     */
    if (query.sort) {
        var sorts = query.sort;

        sorts.forEach(function (s) {
            var item = sortParser(s);
            if (item !== null) {
                result.sort.push(item);
            }
        });
    }

    /**
     * 处理 columns
     */

    if (specialTermFields) {
        if (specialTermFields.column_id) {
            //
            var childQuery = {
                has_child: {
                    type: _type4ArticlesColoums,
                    query: { term: {
                        'column_id': specialTermFields.column_id
                    }}
                }
            };
            result.query.bool.must.push(childQuery);
        }
    }

    /**
     * 处理 fields
     */

    if (query['include_fields']) {
        result['partial_fields'] = {
            "_source": {
                "include": query.include_fields
            }
        };
    }

    if (query['exclude_fields']) {
        if (!result['partial_fields']) {

            result['partial_fields'] = {
                "_source": {}
            };

        }

        result.partial_fields._source['exclude'] = query.exclude_fields;
    }

    debug('queryParser OK');

    return result;
};


module.exports = function (router) {

    /**
     * 截取id
     */
    router.param('id', function (req, res, next, id) {

        debug('param:%s',id);
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

            //id _id 未处理


            /**
             * 业务对象
             */
            req.article = data._source;
            req.article._id = data._id;
            //debug('params.req.article:%s',JSON.stringify(req.article));

            next();
        });

    });


    router.get('/search/', function (req, res) {
        res.status('405');
        res.json({status: false, statusCode: 405, message: 'not support get,only support post.'});
    });

    router.post('/search/', function (req, res) {
        var query = _qeruyParser(req.body || req.query);
        debug('search.query:%s', JSON.stringify(query));

        esClient.search({
            index: _index,
            type: _type,
            body: query
        }, function (err, result) {

            if (err) {
                res.status(400);

                res.json({status: false, message: err.message, code: 400});
                return;
            }

            //{items,total}
            var items = esClient.resultResolve(result);

            var result = {status: true, code: 200, data: {total: items.total, data: items.items}};

            res.status(200);
            res.json(result);
        });
    });

    router.post('/bulk', [filter.checkBodyFilter], function (req, res) {
        var body = req.body;

        var docs = {
            body: body,
            index: _index,
            type: _type
        };

        debug('bulk');

        esClient.save(docs, function (err, rst) {
            if (err) {
                res.status(400);
                res.json(
                    {
                        status: false,
                        code: 400,
                        message: err.message
                    });

                debug('save.err:%s', JSON.stringify(err));

                return;
            }

            res.status(201);
            res.json({
                status: true,
                code: 201,
                data: rst
            });
        });
    });

    /**
     * 根据ID 获取文章
     */
    router.get('/:id', function (req, res) {
        debug('get');
        res.status(200);
        res.json({status: true, code: 200, data: req.article});
    });

    /**
     * 修改
     */
    router.put('/:id', function (req, res) {
        var body = req.body || {};

        //id
        if (!body.id) {
            body.id = req.article.article_id || '';
        }

        debug('put.body:%s', JSON.stringify(body));
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
            res.status(201);

            //{created:false}
            res.json({
                status: true,
                data: body,
                code: 201
            })
        };

        _save(body, cb);
    });

    /**
     * 增量更新 ID下的某字段
     */
    router.post('/:id/partial/', function (req, res) {
        var body = req.body;
        var model = req.article;

        /**
         *
         * params:
         * {
         *   field1 : val1,
         *   field2 : val2
         * }
         */

        var params = body.parts;

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
            res.status(201);

            res.json({
                status: true,
                data: result,
                code: 201

            })
        };

        debug('partial.id:%s', model.article_id);
        debug('partial.model:%s', JSON.stringify(model));

        var opts = {
            index: _index,
            type: _type,
            id: model.article_id,
            params: params
        };
        debug('part.opts:%s', JSON.stringify(opts));
        esClient.updateField(opts, cb);
    });

    /**
     * 创建
     */
    router.post('/', function (req, res) {
        var body = req.body || {};

        debug('post.body:%s', JSON.stringify(body));
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

            res.status(201);
            res.json({
                status: true,
                //message: "",
                data: result,
                code: 201
            })
        };

        _save(body, cb);
    });

    /**
     * 删除
     */
    router.delete('/:id', function (req, res) {

        debug('delete');
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
            id: req.article._id
        }, cb);
    });
};