/**
 * User: ngnono
 * Date: 15-4-19
 * Time: 下午12:26
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var async = require('async');
var config = require('config');

var indexName = config.get('indices_name');

var esClient = require('../../lib/resourceProxy')();

var mappings = require('./mapping')();


exports = module.exports = esIndex;


var index = indexName + '_v1';
var alias = indexName;

function esIndex(options) {
    return {
        articles: new Article(options)
    };

}

function Article(options) {

    /**
     * 一。从零开始
     *  1.检查索引 是否存在，存在则删除
     *  2.建立索引
     *  3.创建MAPPING
     *
     * 二。
     */


    return {
        /**
         * 别名
         */
        alias: {
            get: function (callback) {

                var q = {
                    method: 'existsAlias'
                };

                esClient.indices();

            },
            set: function (opts, callback) {
                var q = {
                    method: 'putAlias',
                    index: opts.index,
                    name: opts.name
                };

                esClient.indices(q, callback);
            }
        },

        /**
         * 索引
         */
        index: {
            create: function (opts, callback) {
                var p = {
                    method: 'create',
                    index: opts.index
                };
                esClient.indices(p, callback);
            },
            del: function (opts, callback) {
                var p = {
                    method: 'delete',
                    index: opts.index
                };
                esClient.indices(p, callback);
            }
        },

        mapping: {
            set: function (opts, callback) {

                var q = mappings[opts.name];
                q['method'] = 'putMapping';

                console.log(JSON.stringify(q));
                esClient.indices(q, callback);

            }
        },

        init: function (callback) {
            /**
             * 1. index created
             * 2. alias created
             * 3. mapping created
             */

            console.log('init.run');


            console.log('index:%s,alias:%s', index, alias);
            var self = this;
            //1
            var createIndex = function (cb) {
                console.log('cratedIndex');
                self.index.create({index: index}, function (err, rst) {
                    if (err) {
                        return cb(err);
                    }
                    console.log(rst);
                    cb(null, rst);
                });
            };

            //2
            var createAlias = function (arg, cb) {
                console.log('cratedAlias');
                self.alias.set({index: index, name: alias}, function (err, rst) {
                    if (err) {
                        return cb(err);
                    }
                    console.log(rst);
                    cb(null, rst);
                });
            };

            //3
            var createMapping4Articles = function (arg, cb) {
                console.log('cratedMapping');
                self.mapping.set({
                    name: 'articles'
                }, function (err, rst) {
                    if (err) {
                        return cb(err);
                    }
                    console.log(rst);
                    cb(null, rst);
                });
            };
            //4
            var createMapping4ArticlesColumns = function (arg, cb) {
                console.log('cratedMapping4ArticlesColumns');
                self.mapping.set({
                    name: 'articles_columns'
                }, function (err, rst) {
                    if (err) {
                        return cb(err);
                    }
                    console.log(rst);
                    cb(null, rst);
                });
            };

            var tasks = [
                createIndex,
                createAlias,
                createMapping4Articles,
                createMapping4ArticlesColumns
            ];

            async.waterfall(tasks, function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, result);
                }
            });
        },

        initNew: function (callback) {
            /**
             *   1. index created
             *   2. mapping
             */

                //1
            this.index.create({name: 'articles_v2'}, function (err, rst) {

            });

            //2
            this.mapping.set({mapping: {
                name: 'articles'
            }}, function (err, rst) {

            });

            callback();
        },

        /**
         * 索引切换 基于 alias
         * @param callback
         */
        indexSwitch: function (callback) {
            throw  new Error('还没做')
        },
        del: function (callback) {
            this.index.del({
                index: index
            }, callback);
        }
    };


}