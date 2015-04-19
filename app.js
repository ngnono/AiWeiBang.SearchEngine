#!/usr/bin/env node

/**
 * User: ngnono
 * Date: 15-4-5
 * Time: 下午3:08
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var config = require('config');
var program = require('commander');
var packages = require('./package.json');

console.log('NODE_CONFIG_DIR: ' + config.util.getEnv('NODE_CONFIG_DIR'));
console.log('config.type:%s', config.get('config'));

var index = require('./server/app/init/index')();

var version = packages.version;

/**
 *  标准的 CB func
 * @param err
 * @param rst
 */
var std_cb = function (err, rst) {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(rst));
    }

};


program.version(version)
    .option('-a,--index-articles', 'init articles and articles_columns')
    .option('-d,--deleteIndexArticles', 'del index')
    .parse(process.argv);


if (program.indexArticles) {
    index.articles.init(std_cb);
}

if (program.deleteIndexArticles) {
    index.articles.del(std_cb);
}


