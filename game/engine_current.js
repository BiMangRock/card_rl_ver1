'use strict';
// 학습·평가·분석이 공통으로 쓰는 엔진 선택기.
// 기본: game\engine_config.json 의 "engine" 값 (예: "v112" → game\engine_v112.js)
// 임시 변경: 환경변수 CARD_ENGINE  (Windows: set CARD_ENGINE=v89)
const path = require('node:path');
const cfg = require('./engine_config.json');
const v = process.env.CARD_ENGINE || cfg.engine;
module.exports = require(path.join(__dirname, 'engine_' + v + '.js'));
module.exports.ENGINE_FILE_VERSION = v;
