'use strict';

var request = require('supertest')
    , express = require('express');
var assert = require('assert');
var config = require('config');


config.util.set('NODE_CONFIG_DIR','../../../../config/');
config.util.getEnv('NODE_CONFIG_DIR');

var app = express();
var articlesIndex = require('../../../../server/api/articles/index');

articlesIndex(app);

request(app)
    .get('/search')
    .expect('Content-Type', /json/)
    .expect(405)
    .end(function (err, res) {
        if (err) throw err;

        console.log(res);
    });