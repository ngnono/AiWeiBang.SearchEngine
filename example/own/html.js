/**
 * User: ngnono
 * Date: 15-5-11
 * Time: 下午9:22
 * To change this template use File | Settings | File Templates.
 */

'use strict';


var sanitizeHtml = require('sanitize-html');

var dirty = '<p>各位好,我们每天的三餐搭配都是涵盖了达人和宝宝的菜谱哦，其中<em class="hlt1">中餐</em>和晚餐';
var clean = sanitizeHtml(dirty, {
    allowedTags: ['em' ]
});

console.info(clean);