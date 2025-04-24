let mic, fft;
let baseHue = 0;
let prevVol = 0;
let transientFlash = 0; // Контроль яркости вспышки при транзиентах

// --- Буферы для постобработки ---
let mainGraphics, blurPass1, blurPass2;

// --- Массивы элементов ---
let fractalTunnels = [];
let energyWaves = [];
let particleFields = [];
let glowPoints = [];

// --- Параметры эффектов ---
let noiseScale = 0.01;
let noiseTime = 0;
let tunnelDepth = 0;
let warpStrength = 0;
let feedbackIntensity = 0;

// --- Настройки постобработки ---
let blurAmount = 0;
let glowIntensity = 0;
let vignetteSize = 0.8;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  
  // Создаем буферы для постобработки
  mainGraphics = createGraphics(width, height);
  mainGraphics.colorMode(HSB, 360, 100, 100, 100);
  
  blurPass1 = createGraphics(width, height);
  blurPass1.colorMode(HSB, 360, 100, 100, 100);
  
  blurPass2 = createGraphics(width, height);
  blurPass2.colorMode(HSB, 360, 100, 100, 100);
  
  // Настройка аудио
  mic = new p5.AudioIn();
  mic.start();
  fft = new p5.FFT(0.8, 512); // Больше точек FFT для лучшего анализа
  fft.setInput(mic);
  
  // Инициализация начальных элементов
  for (let i = 0; i < 3; i++) {
    fractalTunnels.push(new FractalTunnel());
  }
  
  for (let i = 0; i < 5; i++) {
    energyWaves.push(new EnergyWave());
  }
  
  // Создаем поле частиц
  particleFields.push(new ParticleField(300)); // 300 частиц
}

function draw() {
  // --- Анализ аудио ---
  let spectrum = fft.analyze();
  let vol = mic.getLevel();
  let bass = fft.getEnergy("bass"); // 20-250 Hz
  let lowMid = fft.getEnergy("lowMid"); // 250-500 Hz
  let mid = fft.getEnergy("mid"); // 500-2000 Hz
  let highMid = fft.getEnergy("highMid"); // 2000-4000 Hz
  let treble = fft.getEnergy("treble"); // 4000-6000 Hz
  
  // --- Детектирование транзиентов ---
  let deltaVol = abs(vol - prevVol);
  if (deltaVol > 0.05) {
    transientFlash = 100;
    // Создаем вспышки при транзиентах
    for (let i = 0; i < 10; i++) {
      glowPoints.push(new GlowPoint());
    }
  }
  prevVol = vol;
  
  // --- Обновление параметров эффектов на основе звука ---
  baseHue = (baseHue + 0.2 + highMid / 400) % 360; // Смещение цвета от высоких частот
  noiseTime += 0.01 + vol * 0.1; // Скорость шума зависит от громкости
  tunnelDepth += 0.5 + bass / 100; // Глубина туннеля пульсирует от баса
  warpStrength = map(mid, 0, 255, 0.5, 3); // Искажение от средних частот
  feedbackIntensity = map(lowMid, 0, 255, 0.1, 0.4); // Интенсивность обратной связи
  
  // --- Настройки постобработки ---
  blurAmount = map(vol, 0, 0.5, 1, 5) + transientFlash * 0.05;
  glowIntensity = map(bass, 0, 255, 0.2, 0.6) + transientFlash * 0.01;
  vignetteSize = map(lowMid, 0, 255, 0.7, 0.9);
  
  // Затухание вспышки
  transientFlash *= 0.9;
  
  // --- Рисуем в основной буфер ---
  mainGraphics.clear();
  
  // Фон с шумом Перлина
  drawNoiseBackground(mainGraphics, bass, lowMid);
  
  // --- Обновление и отображение элементов ---
  
  // Фрактальные туннели
  if (bass > 180 && fractalTunnels.length < 5 && frameCount % 10 === 0) {
    fractalTunnels.push(new FractalTunnel());
  }
  
  for (let i = fractalTunnels.length - 1; i >= 0; i--) {
    fractalTunnels[i].update(bass, vol, spectrum);
    fractalTunnels[i].display(mainGraphics);
    if (fractalTunnels[i].isDead()) {
      fractalTunnels.splice(i, 1);
    }
  }
  
  // Энергетические волны
  if (mid > 120 && energyWaves.length < 8 && frameCount % 5 === 0) {
    energyWaves.push(new EnergyWave());
  }
  
  for (let i = energyWaves.length - 1; i >= 0; i--) {
    energyWaves[i].update(mid, highMid, vol);
    energyWaves[i].display(mainGraphics);
    if (energyWaves[i].isDead()) {
      energyWaves.splice(i, 1);
    }
  }
  
  // Поля частиц
  for (let field of particleFields) {
    field.update(treble, highMid, vol, spectrum);
    field.display(mainGraphics);
  }
  
  // Точки свечения
  for (let i = glowPoints.length - 1; i >= 0; i--) {
    glowPoints[i].update();
    glowPoints[i].display(mainGraphics);
    if (glowPoints[i].isDead()) {
      glowPoints.splice(i, 1);
    }
  }
  
  // Центральный фрактальный элемент
  drawCentralFractal(mainGraphics, bass, mid, treble, vol, highMid);
  
  // --- Постобработка ---
  applyPostProcessing();
  
  // Отображаем финальный результат
  image(blurPass2, 0, 0);
  
  // Добавляем виньетку
  drawVignette();
}

// ============================
// Функции рисования
// ============================

function drawNoiseBackground(buffer, bass, lowMid) {
  let bgBrightness = map(bass, 0, 255, 2, 10);
  let bgSaturation = map(lowMid, 0, 255, 30, 70);
  
  buffer.loadPixels();
  for (let x = 0; x < width; x += 4) {
    for (let y = 0; y < height; y += 4) {
      // Создаем шум Перлина для фона
      let noiseVal = noise(x * noiseScale, y * noiseScale, noiseTime);
      let hue = (baseHue + noiseVal * 60) % 360;
      let bright = bgBrightness + noiseVal * 15;
      
      buffer.fill(hue, bgSaturation, bright, 90);
      buffer.noStroke();
      buffer.rect(x, y, 4, 4);
    }
  }
  buffer.updatePixels();
}

function drawCentralFractal(buffer, bass, mid, treble, vol, highMid) {
  let centerSize = map(bass, 0, 255, 50, min(width, height) * 0.7);
  let iterations = floor(map(mid, 0, 255, 3, 8));
  let complexity = map(treble, 0, 255, 0.3, 0.8);
  
  buffer.push();
  buffer.translate(width / 2, height / 2);
  
  // Вращение зависит от громкости и высоких частот
  let rotation = frameCount * 0.01 + vol * PI;
  buffer.rotate(rotation);
  
  // Рисуем фрактальную звезду
  drawFractalStar(buffer, 0, 0, centerSize, iterations, complexity, bass, mid, treble);
  
  buffer.pop();
}

function drawFractalStar(buffer, x, y, size, iterations, complexity, bass, mid, treble) {
  if (iterations <= 0 || size < 5) return;
  
  let hue = (baseHue + 180) % 360; // Комплементарный цвет
  let sat = map(mid, 0, 255, 70, 100);
  let bright = map(treble, 0, 255, 60, 100);
  let alpha = map(size, 5, min(width, height) * 0.7, 30, 90);
  
  // Рисуем основную форму
  buffer.push();
  buffer.translate(x, y);
  
  // Количество сторон зависит от средних частот
  let sides = 5 + floor(map(mid, 0, 255, 0, 7));
  let pointiness = map(treble, 0, 255, 0.3, 0.7);
  
  buffer.stroke(hue, sat, bright, alpha + 20);
  buffer.strokeWeight(map(bass, 0, 255, 1, 4));
  buffer.fill(hue, sat, bright, alpha);
  
  buffer.beginShape();
  for (let i = 0; i < sides * 2; i++) {
    let angle = map(i, 0, sides * 2, 0, TWO_PI);
    let r = (i % 2 === 0) ? size : size * pointiness;
    let px = cos(angle) * r;
    let py = sin(angle) * r;
    buffer.vertex(px, py);
  }
  buffer.endShape(CLOSE);
  
  // Рекурсивно рисуем меньшие звезды
  for (let i = 0; i < sides; i++) {
    let angle = map(i, 0, sides, 0, TWO_PI);
    let newX = cos(angle) * size * 0.6;
    let newY = sin(angle) * size * 0.6;
    let newSize = size * complexity;
    
    drawFractalStar(buffer, newX, newY, newSize, iterations - 1, complexity, bass, mid, treble);
  }
  
  buffer.pop();
}

function applyPostProcessing() {
  // Первый проход размытия (горизонтальный)
  blurPass1.clear();
  blurPass1.image(mainGraphics, 0, 0);
  horizontalBlur(blurPass1, blurPass2, blurAmount);
  
  // Второй проход размытия (вертикальный)
  blurPass2.clear();
  verticalBlur(blurPass1, blurPass2, blurAmount);
  
  // Добавляем свечение, смешивая оригинал с размытым
  blurPass2.clear();
  blurPass2.image(mainGraphics, 0, 0);
  blurPass2.blend(blurPass1, 0, 0, width, height, 0, 0, width, height, ADD);
}

function horizontalBlur(source, target, amount) {
  target.clear();
  target.image(source, 0, 0);
  target.filter(BLUR, amount);
}

function verticalBlur(source, target, amount) {
  target.clear();
  target.image(source, 0, 0);
  target.filter(BLUR, amount);
}

function drawVignette() {
  let outerRadius = max(width, height) * 1.5;
  let innerRadius = max(width, height) * vignetteSize;
  
  push();
  translate(width / 2, height / 2);
  
  for (let r = innerRadius; r < outerRadius; r += 5) {
    let inter = map(r, innerRadius, outerRadius, 0, 1);
    let alpha = inter * 100;
    noFill();
    stroke(0, 0, 0, alpha);
    strokeWeight(5);
    ellipse(0, 0, r * 2, r * 2);
  }
  pop();
}

// ============================
// Классы элементов
// ============================

class FractalTunnel {
  constructor() {
    this.depth = 0;
    this.maxDepth = 1000;
    this.lifespan = 255;
    this.hue = (baseHue + random(-30, 30)) % 360;
    this.segments = floor(random(5, 12));
    this.rotationSpeed = random(-0.02, 0.02);
    this.rotation = 0;
    this.scale = random(0.8, 1.2);
  }
  
  update(bass, vol, spectrum) {
    this.depth += 2 + bass / 30;
    this.lifespan -= 1;
    this.rotation += this.rotationSpeed + vol * 0.1;
    
    // Анализируем спектр для изменения формы
    let spectrumSum = 0;
    for (let i = 0; i < 20; i++) { // Используем только низкие частоты
      spectrumSum += spectrum[i];
    }
    this.scale = map(spectrumSum / 20, 0, 255, 0.7, 1.5);
  }
  
  display(buffer) {
    buffer.push();
    buffer.translate(width / 2, height / 2);
    buffer.rotate(this.rotation);
    
    let maxLayers = 10;
    for (let layer = 0; layer < maxLayers; layer++) {
      let layerDepth = this.depth - layer * 50;
      if (layerDepth < 0) continue;
      
      let size = map(layerDepth, 0, this.maxDepth, min(width, height) * 0.8, 0);
      if (size <= 0) continue;
      
      let alpha = map(layerDepth, 0, this.maxDepth, 0, 80) * (this.lifespan / 255);
      let layerHue = (this.hue + layer * 10) % 360;
      
      buffer.noFill();
      buffer.stroke(layerHue, 80, 100, alpha);
      buffer.strokeWeight(map(layerDepth, 0, this.maxDepth, 5, 1));
      
      buffer.beginShape();
      for (let i = 0; i <= this.segments; i++) {
        let angle = map(i, 0, this.segments, 0, TWO_PI);
        let r = size * this.scale;
        // Добавляем искажение формы
        r += sin(angle * 3 + frameCount * 0.05) * size * 0.2;
        let x = cos(angle) * r;
        let y = sin(angle) * r;
        buffer.vertex(x, y);
      }
      buffer.endShape(CLOSE);
    }
    
    buffer.pop();
  }
  
  isDead() {
    return this.lifespan <= 0 || this.depth > this.maxDepth;
  }
}

class EnergyWave {
  constructor() {
    this.center = createVector(width / 2, height / 2);
    this.radius = random(50, 150);
    this.targetRadius = random(width * 0.3, width * 0.8);
    this.lifespan = 255;
    this.hue = (baseHue + 120 + random(-40, 40)) % 360;
    this.amplitude = random(20, 50);
    this.frequency = random(3, 8);
    this.phase = random(TWO_PI);
    this.thickness = random(2, 8);
  }
  
  update(mid, highMid, vol) {
    // Радиус расширяется быстрее при высоких средних частотах
    this.radius += map(highMid, 0, 255, 1, 8) + vol * 5;
    this.lifespan -= 2;
    
    // Амплитуда волны зависит от средних частот
    this.amplitude = map(mid, 0, 255, 10, 80);
    // Фаза смещается с течением времени
    this.phase += 0.1;
  }
  
  display(buffer) {
    buffer.push();
    buffer.translate(this.center.x, this.center.y);
    buffer.noFill();
    
    let alpha = map(this.lifespan, 0, 255, 0, 80);
    buffer.stroke(this.hue, 90, 100, alpha);
    buffer.strokeWeight(this.thickness);
    
    buffer.beginShape();
    for (let i = 0; i < TWO_PI; i += 0.05) {
      // Создаем волнистую форму
      let r = this.radius + sin(i * this.frequency + this.phase) * this.amplitude;
      let x = cos(i) * r;
      let y = sin(i) * r;
      buffer.vertex(x, y);
    }
    buffer.endShape(CLOSE);
    buffer.pop();
  }
  
  isDead() {
    return this.lifespan <= 0 || this.radius > this.targetRadius;
  }
}

class ParticleField {
  constructor(numParticles) {
    this.particles = [];
    for (let i = 0; i < numParticles; i++) {
      this.particles.push({
        pos: createVector(random(width), random(height)),
        vel: createVector(random(-1, 1), random(-1, 1)),
        size: random(1, 4),
        hue: random(360),
        lifespan: random(100, 255)
      });
    }
  }
  
  update(treble, highMid, vol, spectrum) {
    // Создаем векторное поле на основе шума Перлина
    for (let p of this.particles) {
      // Обновляем позицию на основе скорости
      p.pos.add(p.vel);
      
      // Создаем векторное поле с шумом
      let angle = noise(p.pos.x * 0.01, p.pos.y * 0.01, noiseTime) * TWO_PI * 4;
      let force = p5.Vector.fromAngle(angle);
      force.mult(map(highMid, 0, 255, 0.1, 0.5)); // Сила зависит от высоких средних частот
      p.vel.add(force);
      p.vel.limit(map(treble, 0, 255, 1, 5)); // Ограничиваем скорость
      
      // Добавляем случайное движение при громких звуках
      if (vol > 0.1) {
        p.vel.add(createVector(random(-vol, vol), random(-vol, vol)));
      }
      
      // Обновляем размер и цвет
      p.size = random(1, 4) + map(treble, 0, 255, 0, 3);
      p.hue = (baseHue + random(-30, 30)) % 360;
      
      // Уменьшаем время жизни
      p.lifespan -= 1;
      
      // Возрождаем частицы
      if (p.lifespan <= 0 || p.pos.x < 0 || p.pos.x > width || p.pos.y < 0 || p.pos.y > height) {
        p.pos = createVector(random(width), random(height));
        p.vel = createVector(random(-1, 1), random(-1, 1));
        p.lifespan = random(100, 255);
      }
    }
  }
  
  display(buffer) {
    buffer.noStroke();
    
    for (let p of this.particles) {
      let alpha = map(p.lifespan, 0, 255, 0, 100);
      buffer.fill(p.hue, 80, 100, alpha);
      buffer.ellipse(p.pos.x, p.pos.y, p.size, p.size);
    }
  }
}

class GlowPoint {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.size = random(50, 200);
    this.lifespan = 100;
    this.hue = (baseHue + random(-20, 20)) % 360;
  }
  
  update() {
    this.lifespan -= 5;
    this.size *= 0.95;
  }
  
  display(buffer) {
    let alpha = map(this.lifespan, 0, 100, 0, 70);
    
    buffer.push();
    buffer.translate(this.pos.x, this.pos.y);
    
    // Создаем градиентное свечение
    for (let i = this.size; i > 0; i -= this.size / 10) {
      let gradientAlpha = map(i, 0, this.size, 0, alpha);
      buffer.noStroke();
      buffer.fill(this.hue, 70, 100, gradientAlpha);
      buffer.ellipse(0, 0, i, i);
    }
    
    buffer.pop();
  }
  
  isDead() {
    return this.lifespan <= 0;
  }
}

// ============================
// Служебные функции
// ============================

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Пересоздаем графические буферы
  mainGraphics = createGraphics(width, height);
  mainGraphics.colorMode(HSB, 360, 100, 100, 100);
  
  blurPass1 = createGraphics(width, height);
  blurPass1.colorMode(HSB, 360, 100, 100, 100);
  
  blurPass2 = createGraphics(width, height);
  blurPass2.colorMode(HSB, 360, 100, 100, 100);
  
  // Сбрасываем элементы
  fractalTunnels = [];
  energyWaves = [];
  particleFields = [new ParticleField(300)];
  glowPoints = [];
}

function touchStarted() {
  userStartAudio();
}

function mousePressed() {
  userStartAudio();
}

// Запуск аудио контекста при взаимодействии пользователя
function userStartAudio() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      console.log('Audio Context resumed successfully');
    });
  }
}