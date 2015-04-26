#  [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-url]][daviddm-image]

> The best module ever.


## Install

```sh
$ npm install --save -g serarchEngine
```

oh~ my Allah.

this project isn't publish.....


## Usage


### app.js

#### delete this config index


```sh
$ NODE_ENV=development node app.js -d
```

#### create and mapping this config index 
and you know config this index name

##### create index_v1 and aliases index   


```sh
$ NODE_ENV=development node app.js -a 
```

### server.js

#### start server listen to localhost:6110 or PORT=8080 and you know


```sh
$ NODE_ENV=development DEBUG=server:* PORT=8080 node server.js
```

## Production

#### use [pm2](https://github.com/Unitech/pm2) and you know

```sh
$ NODE_ENV=production PORT=8080 pm2 start server.js --name searchEngine
```
## Preparation

```sh
$ npm install
```

## Features

and you know 4 serach

### search

post http://127.0.0.1:6110/searchEngine/api/articles/search

{

  //搜索关键字
  q:'关键字搜索',
  
  //排序
  sort: { fieldName: 'asc', fieldName2:[order:'desc']}

}




## License

MIT © [lianghongpeng](github.com/ngnono)


[npm-url]: https://npmjs.org/package/AiWeiBang.SearchEngine
[npm-image]: https://badge.fury.io/js/AiWeiBang.SearchEngine.svg
[travis-url]: https://travis-ci.org/ngnono/AiWeiBang.SearchEngine
[travis-image]: https://travis-ci.org/ngnono/AiWeiBang.SearchEngine.svg?branch=master
[daviddm-url]: https://david-dm.org/ngnono/AiWeiBang.SearchEngine.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/ngnono/AiWeiBang.SearchEngine
