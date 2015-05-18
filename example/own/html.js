/**
 * User: ngnono
 * Date: 15-5-11
 * Time: 下午9:22
 * To change this template use File | Settings | File Templates.
 */

'use strict';


var sanitizeHtml = require('sanitize-html');
var trimHtml = require('trim-html');
var S = require('string');

var dirty = '<em>aa</em> /> <lass="adfa">各位好,我们每天的三餐搭配都是涵盖了达人和宝宝的菜谱哦，其中<em class="hlt1">中餐</em>和晚<b style="adfadf">餐 </a>';
var clean = sanitizeHtml(dirty, {
    allowedTags: ['em' ]
});

console.info(clean);


console.info(trimHtml(dirty));

var d = S(dirty).trim();

var lt = d.indexOf('<');
var gt = d.indexOf('>');
var gt2 = d.indexOf('/>');

if(gt2 <lt){
    dirty = '<p' + dirty;
}
else if (gt < lt) {
    dirty = '<' + dirty;
}



var clean2 = sanitizeHtml(dirty, {
    allowedTags: ['em' ]
});

console.info(clean2);


