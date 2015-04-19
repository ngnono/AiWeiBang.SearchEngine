/**
 * User: ngnono
 * Date: 15-4-5
 * Time: 下午4:02
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var config = require('config');

var indexName = config.get('indices_name');
var types = config.get('indices_types');

exports = module.exports = {
    "index": {
        "name": indexName,
        "types": {
            "articles": types['articles'],
            "articles_columns": types['articles_columns']
        }

    }
};