/**
 * User: ngnono
 * Date: 15-2-27
 * Time: 下午9:56
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var _ = require('lodash');
var S = require('string');
var debug = require('debug')('server:lib:resource_proxy');
var async = require('async');

function noop() {
}


module.exports = resource;

function _stdCallback(callback) {

    callback = callback || noop;

    return function (err, rst) {
        if (err) {
            return callback(err);
        } else {
            callback(null, rst);
        }
    }
};

/**
 * 资源操作
 * @param options
 * @returns {{save: save, del: del, get: get, indices: indices, close: close}}
 */
function resource(options) {
    options = options || {};
    var client = options.client || require('./elasticsearch');

    var _search = function (opts, callback) {
        opts = opts || {};

        debug('_search,opts:%s', JSON.stringify(opts));
        client.search(opts, function (err, res) {
            if (err) {
                return callback(err);
            } else {
                callback(null, res);
            }
        });
    };

    var _del = function (opts, callback) {
        opts = opts || {};

        client.delete(opts, function (err, res) {
            if (err) {
                return callback(err);
            } else {
                callback(null, res);
            }
        });
    };

    var _warp2BulkDocs = function (opts, datas) {
        if (!datas) {
            throw new Error('datas is must');
        }

        var docs = [];
        _.forEach(datas, function (d) {
            var indexDocHead = {index: {_index: opts.index, _type: opts.type, _id: d.id}};
            delete d.id;
            if (d.parent) {
                indexDocHead.index['parent'] = d.parent;
                delete d.parent;
            }

            docs.push(indexDocHead);
            docs.push(d);
        });

        debug('warp2bulkdocs.docs:%s', JSON.stringify(docs));

        return {body: docs};
    };

    var _warp2Doc = function (opts, data) {
        if (!data) {
            throw new Error('data is must');
        }

        opts = opts || {};

        var params = {};

        _.merge(params, opts);
        if (!params.id) {
            params.id = data.id;
            delete data.id;
        }
        if (!params.body) {
            params.body = data
        }

        if (params.body.id) {
            delete params.body.id;
        }

        return params;
//    return {
//        index: opts.index,
//        type: opts.type,
//        id: data.id,
//        body: data
//    };
    };

    var _index = function (doc, callback) {

        debug('_index(doc=%s)', JSON.stringify(doc));

        client.index(doc, function (err, res) {
            if (err) {
                return callback(err);
            }
            else {
                //debug('_index.res:(%s)', JSON.stringify(res));
                callback(null, res);
            }
        });
    };

    var _bulk4index = function (docs, callback) {

        client.bulk(docs, function (err, res) {
            if (err) {
                return callback(err);
            } else {
                callback(null, res);
            }
        });
    };

    var _update = function (opts, callback) {
        debug('_update(opts=%s)', JSON.stringify(opts));

        client.update(opts, _stdCallback(callback));

    };

    return {
        updateField: function (opts, callback) {
            opts = opts || {};
            callback = callback || noop;
            //{field:value}
            var values = opts.params;
            var keys = _.keys(values);

            var buildUpdateBody = function (index) {
                var scriptTemplate = 'ctx._source.{{field}} = {{field}}';

                var key = keys[index];
                var params = values;
                var upsert = params;

                var s = S(scriptTemplate).template({field: key}).s;

                var q = {
                    index: opts.index,
                    type: opts.type,
                    id: opts.id,
                    body: {
                        script: s,//'update_partial_read_num_script',
                        params: params,
                        upsert: upsert,
                        lang: 'groovy'
                    }
                };

                return q;
            };

            var tasks = [];
            for (var i = 0; i < keys.length; i++) {
                var q = buildUpdateBody(i);
                debug('_updatePart.q:%s,i:%s', JSON.stringify(q),i);
                tasks.push(function (cb) {
                    _update(q, cb);
                });
            }

            debug('tasks.lenght:%s',tasks.length);
            async.series(tasks, callback);

            //_update(q, callback);

        },

        save: function (opts, callback) {
            opts = opts || {};
            callback = callback || opts.callback || noop;

            var data = opts.data || opts.body;
            var op = opts;

            if (opts.data)
                delete op.data;
            if (opts.body)
                delete op.body;

            debug('resource(options=%s)', JSON.stringify(opts));

            if (_.isArray(data)) {
                _bulk4index(_warp2BulkDocs(op, data), callback);

            } else {
                var d = _warp2Doc(op, data);
                _index(d, callback);
            }

        },

        del: function (opts, callback) {
            opts = opts || {};
            callback = callback || opts.callback || noop;

            _del({
                index: opts.index,
                type: opts.type,
                id: opts.id
            }, function (err, res) {
                if (err) {
                    return callback(err);
                } else {
                    callback(null, res);
                }
            });
        },

        get: function (opts, callback) {
            opts = opts || {};
            callback = callback || opts.callback || noop;

            if (!opts.id) {
                throw new Error('opts.id is must.');
            }

            client.get(opts, function (err, res) {
                if (err) {
                    return callback(err);
                } else {
                    callback(null, res);
                }
            })
        },

        /**
         * getList
         * @param opts
         * @param callback
         */
        getList: function (opts, callback) {
            this.search(opts, callback);
        },

        search: function (opts, callback) {
            opts = opts || {};
            callback = callback || opts.callback || noop;

            var q = {
                index: opts.index,
                type: opts.type,
                body: opts.body || opts.query || opts.data};

            _search(q, callback);
        },

        indices: function (opts, callback) {

            opts = opts || opts;
            callback = callback || noop;
            var method = opts.method;
            delete opts.method;

            debug('indices.%s:%s', method, JSON.stringify(opts));

            client.indices[method](opts.params || opts, callback);
        },

        close: function () {
            client.close();
            client = null;
        },

        /**
         * 查询对象 转换
         * @param query
         * @returns {{query: {bool: {must: Array}}, from: (*|number), size: (*|number), sort: (*|{})}}
         */
        queryParser: function (query) {
            query = query || {};

            var q = {
                query: {
                    bool: {must: []}
                },
                from: query.from || 0,
                size: query.size || 10,
                sort: query.sort || {}
            };

            return q;
        },

        /**
         * 标准结果 解析
         * @param rst
         * @returns {*}
         */
        resultResolve: function (rst) {
            if (!rst) {
                return null;
            }

            //数量
            var total = rst.hits.total;

            //items
            var items = _.map(rst.hits.hits, function (item) {

                var data;
                if (item.fields) {
                    if (_.isArray(item.fields._source)) {
                        //TODO: fields query 返回的是 []
                        data = item.fields._source[0];
                    } else {
                        data = item.fields._source;
                    }

                } else if (item._source) {
                    data = item._source;
                }

                if (item._id) {
                    if (!data) {
                        data = {};
                    }

                    data._id = item._id;
                }

                return  data;
            });

            var result = {
                total: total,
                items: items
            };

            return result;
        }
    }
}