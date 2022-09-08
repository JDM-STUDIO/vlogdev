/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import { BostonHousingDataset, featureDescriptions } from './data.js';
import * as normalization from './normalization.js';

// 모델 훈련을 위한 하이퍼파라미터
const NUM_EPOCHS = 200;
const BATCH_SIZE = 40;
const LEARNING_RATE = 0.01;

const tensors = {};

// 로딩된 데이터를 텐서로 변환하고 특성을 정규화합니다.
export function arraysToTensors(bostonData) {
  tensors.rawTrainFeatures = window.tf.tensor2d(bostonData.trainFeatures);
  tensors.trainTarget = window.tf.tensor2d(bostonData.trainTarget);
  tensors.rawTestFeatures = window.tf.tensor2d(bostonData.testFeatures);
  tensors.testTarget = window.tf.tensor2d(bostonData.testTarget);
  // 평균과 표준 편차로 정규화합니다.
  let { dataMean, dataStd } = normalization.determineMeanAndStddev(tensors.rawTrainFeatures);

  tensors.trainFeatures = normalization.normalizeTensor(
    tensors.rawTrainFeatures,
    dataMean,
    dataStd,
  );
  tensors.testFeatures = normalization.normalizeTensor(tensors.rawTestFeatures, dataMean, dataStd);
}

/**
 * 선형 회귀 모델을 만들어 반환합니다.
 *
 * @returns {tf.Sequential} 선형 회귀 모델
 */
export function linearRegressionModel(bostonData) {
  const model = window.tf.sequential();
  model.add(window.tf.layers.dense({ inputShape: [bostonData.numFeatures], units: 1 }));

  model.summary();
  return model;
}

/**
 * 50개의 유닛과 시그모이드 함수를 가진 1개의 은닉층이 있는 다층 퍼셉트론 회귀 모델을 만들어 반환합니다.
 *
 * @returns {tf.Sequential} 다층 퍼셉트론 회귀 모델
 */
export function multiLayerPerceptronRegressionModel1Hidden(bostonData) {
  const model = window.tf.sequential();
  model.add(
    window.tf.layers.dense({
      inputShape: [bostonData.numFeatures],
      units: 50,
      activation: 'sigmoid',
      kernelInitializer: 'leCunNormal',
    }),
  );
  model.add(window.tf.layers.dense({ units: 1 }));

  model.summary();
  return model;
}

/**
 * 50개의 유닛과 시그모이드 함수를 가진 2개의 은닉층이 있는 다층 퍼셉트론 회귀 모델을 만들어 반환합니다.
 *
 * @returns {tf.Sequential} 다층 퍼셉트론 회귀 모델
 */
export function multiLayerPerceptronRegressionModel2Hidden(bostonData) {
  const model = window.tf.sequential();
  model.add(
    window.tf.layers.dense({
      inputShape: [bostonData.numFeatures],
      units: 50,
      activation: 'sigmoid',
      kernelInitializer: 'leCunNormal',
    }),
  );
  model.add(
    window.tf.layers.dense({ units: 50, activation: 'sigmoid', kernelInitializer: 'leCunNormal' }),
  );
  model.add(window.tf.layers.dense({ units: 1 }));

  model.summary();
  return model;
}

/**
 * 50개의 유닛을 가진 2개의 은닉층이 있는 다층 퍼셉트론 회귀 모델을 만들어 반환합니다.
 * (시그모이드 활성화 함수 사용하지 않음)
 *
 * @returns {tf.Sequential} 다층 퍼셉트론 회귀 모델
 */
export function multiLayerPerceptronRegressionModel1HiddenNoSigmoid(bostonData) {
  const model = window.tf.sequential();
  model.add(
    window.tf.layers.dense({
      inputShape: [bostonData.numFeatures],
      units: 50,
      // activation: 'sigmoid',
      kernelInitializer: 'leCunNormal',
    }),
  );
  model.add(window.tf.layers.dense({ units: 1 }));

  model.summary();
  return model;
}

/**
 * 현재 가중치를 읽기 쉬운 형태로 출력합니다.
 *
 * @param {Array} kernel 길이가 13인 실수 배열. 원소 하나가 한 개의 특성에 해당합니다.
 * @returns {List} 특성 이름과 특성의 가중치로 이루어진 객체의 리스트
 */
export function describeKernelElements(kernel) {
  window.tf.util.assert(
    kernel.length == 12,
    `커널 배열의 길이는 12여야 하는데 ${kernel.length}입니다`,
  );
  const outList = [];
  for (let idx = 0; idx < kernel.length; idx++) {
    outList.push({ description: featureDescriptions[idx], value: kernel[idx] });
  }
  return outList;
}

/**
 * `model`을 컴파일한 후 훈련 데이터에서 훈련하고 테스트 데이터에서 모델을 실행합니다.
 * 에포크마다 UI를 업데이트하기 위해 콜백을 지정합니다.
 *
 * @param {tf.Sequential} model 훈련할 모델
 * @param {boolean} weightsIllustration 훈련된 가중치에 대한 정보를 출력할지 여부
 */
export async function run(model, modelName, weightsIllustration) {
  model.compile({ optimizer: window.tf.train.sgd(LEARNING_RATE), loss: 'meanSquaredError' });

  let trainLogs = [];
  const container = document.querySelector(`#${modelName} .chart`);

  updateStatus('훈련 과정을 시작합니다...');
  await model.fit(tensors.trainFeatures, tensors.trainTarget, {
    batchSize: BATCH_SIZE,
    epochs: NUM_EPOCHS,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        await updateModelStatus(`에포크 ${NUM_EPOCHS}번 중 ${epoch + 1}번째 완료.`, modelName);
        trainLogs.push(logs);
        tfvis.show.history(container, trainLogs, ['loss', 'val_loss'], {
          xLabel: '반복(에포크)',
          yLabel: '손실',
        });

        if (weightsIllustration) {
          model.layers[0]
            .getWeights()[0]
            .data()
            .then((kernelAsArr) => {
              const weightsList = describeKernelElements(kernelAsArr);
              updateWeightDescription(weightsList);
            });
        }
      },
    },
  });

  updateStatus('테스트 데이터에서 평가합니다...');
  const result = model.evaluate(tensors.testFeatures, tensors.testTarget, {
    batchSize: BATCH_SIZE,
  });
  const testLoss = result.dataSync()[0];

  const trainLoss = trainLogs[trainLogs.length - 1].loss;
  const valLoss = trainLogs[trainLogs.length - 1].val_loss;
  await updateModelStatus(
    `훈련 세트 최종 손실: ${trainLoss.toFixed(4)}\n` +
      `검증 세트 최종 손실: ${valLoss.toFixed(4)}\n` +
      `테스트 세트 손실: ${testLoss.toFixed(4)}`,
    modelName,
  );
}

export function computeBaseline() {
  const avgPrice = tensors.trainTarget.mean();
  console.log(`평균 가격: ${avgPrice.dataSync()}`);
  const baseline = tensors.testTarget.sub(avgPrice).square().mean();
  console.log(`기준 손실: ${baseline.dataSync()}`);
  const baselineMsg = `기준 손실(meanSquaredError): ${baseline.dataSync()[0].toFixed(2)}`;
  updateBaselineStatus(baselineMsg);
}

export function updateStatus(message) {
  const statusElement = document.getElementById('status');
  statusElement.innerText = message;
}

export function updateBaselineStatus(message) {
  const baselineStatusElement = document.getElementById('baselineStatus');
  baselineStatusElement.innerText = message;
}

export function updateModelStatus(message, modelName) {
  const statElement = document.querySelector(`#${modelName} .status`);
  statElement.innerText = message;
}

/**
 * 간단한 선형 모델에서 학습된 가중치에 관한 정보를 업데이트합니다.
 *
 * @param {List} weightsList 'value':number 와 'description':string 의 객체 리스트
 */
export function updateWeightDescription(weightsList) {
  const NUM_TOP_WEIGHTS_TO_DISPLAY = 5;

  const inspectionHeadlineElement = document.getElementById('inspectionHeadline');
  inspectionHeadlineElement.innerText = `가장 큰 가중치 상위 ${NUM_TOP_WEIGHTS_TO_DISPLAY}개`;
  // 절댓값 크기로 가중치를 정렬합니다.
  weightsList.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  var table = document.getElementById('myTable');
  // 테이블을 초기화합니다.
  table.innerHTML = '';
  // 테이블에 행을 추가합니다.
  weightsList.forEach((weight, i) => {
    if (i < NUM_TOP_WEIGHTS_TO_DISPLAY) {
      let row = table.insertRow(-1);
      let cell1 = row.insertCell(0);
      let cell2 = row.insertCell(1);
      if (weight.value < 0) {
        cell2.setAttribute('class', 'negativeWeight');
      } else {
        cell2.setAttribute('class', 'positiveWeight');
      }
      cell1.innerHTML = weight.description;
      cell2.innerHTML = weight.value.toFixed(4);
    }
  });
}
