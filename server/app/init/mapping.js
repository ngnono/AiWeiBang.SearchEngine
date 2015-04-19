/**
 * User: ngnono
 * Date: 15-4-19
 * Time: 上午11:43
 * To change this template use File | Settings | File Templates.
 */

'use strict';
var config = require('config');


var indexMaping = config.get('indices_mapping');
var indexName = config.get('indices_name');
var types = config.get('indices_types');


exports = module.exports = function () {

    return {
        "articles": {
            index: indexName,
            type: types['articles'],
            allowNoIndices: true,
            body: indexMaping['articles'].body
        },
        "articles_columns": {
            index: indexName,
            type: types['articles_columns'],
            allowNoIndices: true,
            body: indexMaping['articles_columns'].body
        }
    };
};