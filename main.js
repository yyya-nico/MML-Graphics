import './style.scss'

import { htmlspecialchars } from './utils';

const app = document.body;

const appendNew = (tagName, attrs = {}, appendTarget = app) => {
  const elem = document.createElement(tagName);
  Object.entries(attrs).forEach(([name, value]) => elem[name] = value);
  return appendTarget.appendChild(elem);
};

const appendOptions = (def = {}, appendTarget = app) => {
  Object.entries(def).forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      appendTarget.appendChild(option);
  });
}

const canvas = appendNew('canvas', {
  width: 400,
  height: 200
});

const toneColor = (t => {
  t.fieldset = appendNew('fieldset');
  t.legend = appendNew('legend', {
    textContent: '音色のMML'
  }, t.fieldset);
  t.div = appendNew('div', {}, t.fieldset);
  t.output = appendNew('output', {}, t.div);
  t.print = str =>
    t.output.innerHTML = str ?
        `<pre><code>${htmlspecialchars(str).replaceAll('\n','<br>')}</code></pre>`
      :
        '(なし)';
  return t;
})({});

toneColor.print('@V100 @3@W50 @E1,0,60,30,1 @E2,0,30,0,127');

const waveSelect = (w => {
  w.div = appendNew('div');
  w.select = appendNew('select', {}, w.div);
  appendOptions({
    '@0': '@0 正弦波',
    '@0-1': '@0-1 半波整流正弦波',
    '@0-2': '@0-2 全波整流正弦波',
    '@1': '@1 ノコギリ波',
    '@1-1': '@1-1 ノコギリ波(変位0から)',
    '@2': '@2 三角波',
    '@2-1': '@2-1 三角波(変位0から)',
    '@3': '@3 パルス波',
    '@4': '@4 ホワイトノイズ',
    '@5': '@5 FCパルス波',
    '@6': '@6 FC三角波',
    '@7': '@7 FCノイズ',
    '@8': '@8 FCショートノイズ',
    '@9': '@9 FC DPCM',
    '@10': '@10 GB波形メモリ音源',
    '@11': '@11 GBノイズ',
    '@12': '@12 GBショートノイズ',
    '@13': '@13 波形メモリ音源',
    '@14': '@14 FM音源'
  }, w.select);
  return w;
})({});

const inputRange = (i => {
  i.div = appendNew('div');
  i.input = appendNew('input', {
    type: 'range',
    value: 1,
  }, i.div);
  i.label = appendNew('label', {
    textContent: i.input.value,
  }, i.div)
  return i;
})({});


const ctx = canvas.getContext('2d', {
  willReadFrequently: true,
});
let currentColor = getComputedStyle(canvas).color;
ctx.fillStyle = currentColor
ctx.strokeStyle = currentColor

const gridSize = canvas.height / 2 * 50 / 127;
const genGrid = ref => {
  switch (ref) {
    case 'center':
      ref = 0.5;
      break;
    case 'bottom':
      ref = 1;
      break;
  }

  // 縦線を描画
  for (let x = gridSize + 0.5; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
  }
  ctx.lineWidth = 2;
  for (let n = 4, x = gridSize * n; x <= canvas.width; x += gridSize * n) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.lineWidth = 1;

  // 横線を描画
  for (let y = canvas.height / 2 % gridSize + 0.5; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0           , canvas.height * ref);
  ctx.lineTo(canvas.width, canvas.height * ref);
  ctx.stroke();

  ctx.lineWidth = 1;
};
genGrid('center');

const drawSineWave = (period = 1) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  genGrid('center');
  //正弦波の各点を求める
  const sineWave = (x) =>{
    const { PI, sin } = Math;
    const A = gridSize * 2;                        //振幅
    const w = PI / 79 * period;                    //周期
    const y = -A * sin(w * x) + canvas.height / 2; //y座標 符号を反転する。
    return y;
  }

  //グラフ描画
  ctx.strokeStyle = '#00ff00';
  ctx.beginPath();
  for(let x = 0, y = sineWave(x); x < canvas.width; x++, y = sineWave(x)){
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = currentColor;
};
drawSineWave();

class CanvasImageBackupper {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.backup();
  }

  backup() {
    this.imageBackup = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  restore() {
    this.ctx.putImageData(this.imageBackup, 0, 0);
  }
}

const imageBackup = new CanvasImageBackupper(canvas, ctx);

inputRange.input.addEventListener('input', e => {
  drawSineWave(e.target.valueAsNumber);
  inputRange.label.textContent = e.target.value;
  imageBackup.backup();
  drawPointsLine();
  points.forEach(point => {
    point.write();
  });
});

class Point {
  #diff = 4;

  constructor(ctx, x, y, options = {}) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.options = options;
    if (options.draggable === false) {
      return;
    }
    this.write();
  }

  write() {
    if (this.options.draggable === false) {
      return;
    }
    this.ctx.beginPath();
    this.ctx.moveTo(this.x, this.y - this.#diff);
    this.ctx.lineTo(this.x + this.#diff, this.y);
    this.ctx.lineTo(this.x, this.y + this.#diff);
    this.ctx.lineTo(this.x - this.#diff, this.y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  get pos() {
    return {x: this.x, y: this.y};
  }

  set pos({x, y}) {
    if (x) this.x = Math.min(Math.max(x, 0), canvas.width);
    if (y) this.y = Math.min(Math.max(y, 0), canvas.height);
  }

  hoverJudge(x, y) {
    if (this.options.draggable === false) {
      return false;
    }
    return Math.abs(x - this.x) + Math.abs(y - this.y) <= this.#diff;
  }
}

const hundredY = canvas.height / 2 % gridSize;
const halfY = canvas.height / 2;

const points = [
  new Point(ctx, 0, halfY, { draggable: false }),
  new Point(ctx, gridSize, hundredY),
  new Point(ctx, gridSize * 2, hundredY + gridSize),
  new Point(ctx, gridSize * 8, hundredY),
  new Point(ctx, canvas.width, halfY, { draggable: false }),
];

const drawPointsLine = () => {
  ctx.strokeStyle = '#ffff00';
  points.reduce((prev, point) => {
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    return point;
  });
  ctx.strokeStyle = currentColor;
  points.forEach(point => point.write());
};
drawPointsLine();

let pointerPressed = false;
let dragging = false;
let working = null;
const pointerHandler = e => {
  if (!e.isPrimary) {
    return;
  }
  console.log(e.type);

  switch (e.type) {
    case 'pointerenter':
      break;

    case 'pointermove':
      break;

    case 'pointerdown':
      e.target.setPointerCapture(e.pointerId);
      pointerPressed = true;
      break;

    case 'pointerup':
      pointerPressed = false;
    case 'pointerleave':
      break;
  }
  const {offsetX: x, offsetY: y} = e;
  const hovered = points.find(point => point.hoverJudge(x, y));
  if (dragging || working || hovered) {
    if (pointerPressed) {
      dragging = true;
      working ??= hovered;
      canvas.style.cursor = 'move';
      imageBackup.restore();
      working.pos = {x, y};
      drawPointsLine();
      working.write();
      return;
    }
    dragging = false;
    working = null;
    canvas.style.cursor = 'pointer';
    return;
  }
  canvas.style.cursor = '';
};

[
  'pointerenter',
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointerleave'
].forEach(type =>
  canvas.addEventListener(type, pointerHandler)
);

const media = window.matchMedia('(prefers-color-scheme: dark)')
media.addEventListener('change', e => {
  currentColor = getComputedStyle(canvas).color;
  ctx.fillStyle = currentColor
  ctx.strokeStyle = currentColor
  genGrid('center');
  drawSineWave(inputRange.input.valueAsNumber);
  imageBackup.backup();
  drawPointsLine();
  points.forEach(point => {
    point.write();
  });
});