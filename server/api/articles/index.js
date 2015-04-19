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
        sort: query.sort || {}
    };

    var termFields = ['category_id'];

    var termParser = function (query, field) {
        if (query[field]) {
            var queryItem = {"term": {}};
            queryItem.term[field] = query[field];

            return queryItem;
        }

        return null;
    };

    /**--------------------------------------------
     * 处理所有的Term查询提条件
     --------------------------------------------*/
    termFields.forEach(function (rule) {
        var item = termParser(query, rule);
        if (item !== null) {
            result.query.bool.must.push(item);
        }
    });

    /**
     * 范围
     */


    /**--------------------------------------------
     * 处理价格区间
     --------------------------------------------*/
    if (query['price_range']) {

        var priceRange = {
            range: {
                'sale_price': {}
            }
        };
        if (query['price_range'].from) {
            priceRange.range.price.from = query['price_range'].from;
        }

        if (query['price_range'].to) {
            priceRange.range.price.to = query['price_range'].to;
        }
        result.query.bool.must.push(priceRange);
    }

    /**--------------------------------------------
     * 处理Levels，
     * 需求：小于等于等级的商品
     --------------------------------------------*/
    if (query['level']) {
        result.query.bool.must.push({
            "range": {
                "level": {
                    "lte": query.level
                }
            }
        });
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

    /**--------------------------------------------
     * 处理价格区间Facets
     * 说明：
     * 参入参数
     * {
     *      facet_price_ranges:[{
     *          to:50
     *      },{
     *          from:51 , to:200
     *      }]
     * }
     --------------------------------------------*/

    if (query['facet_price_ranges'] && query['facet_price_ranges'] !== null) {
        result.facets['price_ranges'] = {
            range: {
                field: 'sale_price',
                ranges: query['facet_price_ranges']
            }
        };
    }

    /**--------------------------------------------
     * 分类facet
     --------------------------------------------*/

    if (query['enable_facet_category_id'] && query['enable_facet_category_id'] === 'true') {
        result.facets['categories'] = {
            'terms': {
                //field: 'category_id',
                "script_field": "_source.category_id+'" + SPLIT + "'+_source.category_name",
                size: 5000
            }
        }
    }

    /**--------------------------------------------
     * 品牌facet
     --------------------------------------------*/
    if (query['enable_facet_brand_id'] && query['enable_facet_brand_id'] === 'true') {
        result.facets['brands'] = {
            'terms': {
                "script_field": "_source.brand_id+'" + SPLIT + "'+_source.brand_name",
                size: 5000
            }
        }
    }

    return result;
};


module.exports = function (router) {

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

            //id _id 未处理

            /**
             * 业务对象
             */
            req.article = data;

            next();
        });

        debug('id:%s', id);
    });


    router.post('/:id/:field/:val', function (req, res, id, field, val) {
        //update
        var body = req.body;
        //增量 OR update
        //TODO:增量修改


    });

    router.get('/search/', function (req, res) {
        res.status('405');
        res.json({status: false, statusCode: 405, message: 'not support get,only support post.'});
    });

    router.post('/search/', function (req, res) {
        var query = _qeruyParser(req.body || req.query);
        debug('post.search.query:%s', JSON.stringify(query));

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
            var products = esClient.resultResolve(result);

            /**--------------------------------------------
             * 处理facet
             * {
             --------------------------------------------*/
            var facetTermProcess = function (facetKey, terms) {
                var filterItems = _.map(terms, function (term) {
                    var parts = term.term.split(SPLIT);

                    return {
                        id: parts[0],
                        name: parts[1],
                        count: term.count
                    };
                });

                return {
                    _type: facetKey,
                    items: filterItems
                }
            };

            var facetRangeProcess = function (facetKey, ranges) {
                var rangeItems = _.map(ranges, function (range) {
                    return {
                        from: range.from,
                        to: range.to,
                        min: range.min,
                        max: range.max,
                        count: range.count
                    };
                });

                return {_type: facetKey, items: rangeItems};
            };

            var facetKeys = _.keys(result.facets);
            var filters = _.map(facetKeys, function (facetKey) {

                var facetItem = result.facets[facetKey] || {};

                // process terms type
                if (facetItem._type === 'terms') {
                    var terms = result.facets[facetKey].terms;
                    return facetTermProcess(facetKey, terms);
                }

                //process range type for price range
                if (facetItem._type === 'range') {
                    var terms = result.facets[facetKey].ranges;
                    return facetRangeProcess(facetKey, terms);
                }

                return undefined;
            }) || [];

            var result = {status: true, code: 200, data: {total: total, data: products}};

            /**
             * 对返回结果进行赋值
             *
             * fields:categories,brands,price_ranges
             */
            _.forEach(filters, function (filter) {
                result.data[filter._type] = filter.items;
            });

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

        esClient.save(docs, function (err, rst) {
            if (err) {
                res.status(400);
                res.json(
                    {
                        status: false,
                        code: 400,
                        message: err.message
                    });

                console.error(err);

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
    router.get('/:id', function (req, res, id) {
        res.status(200);
        res.json({status: true, code: 200, version: pkg.version, data: req.article});
    });

    /**
     * 修改
     */
    router.put('/:id', function (req, res, id) {
        var body = req.body || {};

        //id
        if (!body.id) {
            body.id = id;
        }

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
                data: result,
                code: 201
            })
        };

        _save(body, cb);
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

};