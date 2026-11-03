'use strict';
// 현재 엔진(engine_config.json)과 번호표 기준의 모델 입력 메타를 JSON 한 줄로 출력 (train\migrate.py 가 사용)
const E = require('../game/engine_current.js');
const { makeFeaturizer } = require('../game/features2.js');
process.stdout.write(JSON.stringify(makeFeaturizer(E).meta) + '\n');
