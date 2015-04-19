/**
 * User: ngnono
 * Date: 15-4-5
 * Time: 下午2:46
 * To change this template use File | Settings | File Templates.
 */

'use strict';


var elasticsearch = require('elasticsearch'),
    config = require('config'),
    debug = require('debug')('lib:elasticsearch');


var cfgs = config.get('elasticsearch');
debug('cfgs:%s', JSON.stringify(cfgs));

var client = new elasticsearch.Client(cfgs);

//TODO: es client HA

module.exports = client;