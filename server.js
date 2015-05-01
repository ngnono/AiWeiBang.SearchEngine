/**
 * User: ngnono
 * Date: 15-4-5
 * Time: 下午3:07
 * To change this template use File | Settings | File Templates.
 */

'use strict';


var config = require('config');
var favicon = require('serve-favicon');
var enrouten = require('express-enrouten');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var express = require('express');
var path = require('path');

var app = express();


/**
 * 注册中间件
 */
/**
 * development
 */
if (app.settings.env === 'development') {
    app.use('/searchengine', express.static(__dirname + './client'));
    app.use('/searchengine/bower_components', express.static(__dirname + './bower_components'));
}


/**
 * production
 */
if (app.settings.env === 'production') {
    app.use('/searchengine', express.static(path.normalize(__dirname + './dist')));
    app.enable('view cache');
}

app.use(favicon('./client/favicon.ico'));

app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());

app.disable('case sensitive routing');
app.disable('x-powered-by');

/**
 * routing
 */
app.use('/searchengine/api', enrouten({
    directory: './server/api'
}));

var port = process.env.PORT || 6110;

app.listen(port, '0.0.0.0', function () {
    console.log('NODE_CONFIG_DIR: [%s]', config.util.getEnv('NODE_CONFIG_DIR'));
    console.log('config: [%s]', config.get('config'));

    console.log('[%s] Listening on http://localhost:%d', app.settings.env, port);
    console.log('[%s] es server', config.get('elasticsearch').host);
//    console.log('[%s] wechat appid', config.get('wechat').appid);
//    console.log('[%s] domain', config.get('domain'));
    console.log('Application ready to serve requests.');
});