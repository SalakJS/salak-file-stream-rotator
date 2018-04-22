# salak-file-stream-rotater

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![David deps][david-image]][david-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/salak-file-stream-rotator.svg?style=flat-square
[npm-url]: https://npmjs.org/package/salak-file-stream-rotator
[travis-image]: https://img.shields.io/travis/SalakJS/salak-file-stream-rotator.svg?style=flat-square
[travis-url]: https://travis-ci.org/SalakJS/salak-file-stream-rotator
[david-image]: https://img.shields.io/david/SalakJS/salak-file-stream-rotator.svg?style=flat-square
[david-url]: https://david-dm.org/SalakJS/salak-file-stream-rotator
[download-image]: https://img.shields.io/npm/dm/salak-file-stream-rotator.svg?style=flat-square
[download-url]: https://npmjs.org/package/salak-file-stream-rotator

Stream file rotator for SalakJS logs.

## Install

```sh
$ npm install --save salak-file-stream-rotator
```

## Usage

```javascript
const streamRotator = require('salak-file-stream-rotator')

streamRotator.write('hi, salak!')
```

## Options

- filename: absolute path
- date_format: defaults: YYYY-MM-DD
- size: max bytes which the file can store
- max_logs: how many files which can be keeped
- audit_file: which stored the files info, defaults: dir(filename) + '/.audit.json'

## License

MIT
