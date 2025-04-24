let mic, fft;
let baseHue = 0;
let prevVol = 0;
let transientFlash = 0; // Controls the brightness of the transient flash

// --- New Element Arrays ---
let bassRings = [];
let midSpirals = [];
let trebleSparks = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  mic = new p5.AudioIn();
  mic.start();
  fft = new p5.FFT(0.85, 256); // Slightly higher smoothing, larger FFT size for more detail
  fft.setInput(mic);
  noStroke(); // Default to no stroke, elements will add it if needed

  // Initialize some starting elements (optional)
  for (let i = 0; i < 3; i++) {
    bassRings.push(new BassRing());
  }
   for (let i = 0; i < 5; i++) {
    midSpirals.push(new MidSpiral());
  }
}

function draw() {
  // --- Audio Analysis ---
  let spectrum = fft.analyze();
  let vol = mic.getLevel();
  let bass = fft.getEnergy("bass"); // 20-250 Hz
  let lowMid = fft.getEnergy("lowMid"); // 250-500 Hz
  let mid = fft.getEnergy("mid"); // 500-2000 Hz
  let highMid = fft.getEnergy("highMid"); // 2000-4000 Hz
  let treble = fft.getEnergy("treble"); // 4000-6000 Hz

  // --- Transient Detection ---
  let deltaVol = abs(vol - prevVol);
  if (deltaVol > 0.05) { // Threshold for transient detection (adjust as needed)
    transientFlash = 100; // Trigger a bright flash
  }
  prevVol = vol;

  // --- Background ---
  baseHue = (baseHue + 0.1 + highMid / 500) % 360; // Hue shifts with high-mid
  let bgBrightness = map(bass, 0, 255, 2, 15); // Darker background, pulses slightly with bass
  let bgSaturation = map(lowMid, 0, 255, 40, 80); // Saturation reacts to low-mid
  // Apply transient flash
  let finalBgBrightness = max(bgBrightness, transientFlash * 0.3); // Flash makes bg brighter
  background(baseHue, bgSaturation, finalBgBrightness, 80); // Slightly more opaque background
  transientFlash *= 0.85; // Flash fades quickly


  // --- Update and Display Elements ---

  // Bass Rings
  if (bass > 150 && bassRings.length < 10 && frameCount % 5 === 0) { // Add rings on strong bass hits
      bassRings.push(new BassRing());
  }
  for (let i = bassRings.length - 1; i >= 0; i--) {
    bassRings[i].update(bass, vol);
    bassRings[i].display();
    if (bassRings[i].isDead()) {
      bassRings.splice(i, 1);
    }
  }

  // Mid Spirals
   if (mid > 100 && midSpirals.length < 15 && frameCount % 3 === 0) { // Add spirals on mid energy
      midSpirals.push(new MidSpiral());
  }
  for (let i = midSpirals.length - 1; i >= 0; i--) {
    midSpirals[i].update(mid, vol);
    midSpirals[i].display();
    if (midSpirals[i].isDead()) {
      midSpirals.splice(i, 1);
    }
  }

  // Treble Sparks
  if (treble > 80 && trebleSparks.length < 100) { // Add sparks frequently with treble
     trebleSparks.push(new TrebleSpark());
  }
   for (let i = trebleSparks.length - 1; i >= 0; i--) {
    trebleSparks[i].update(treble, vol);
    trebleSparks[i].display();
    if (trebleSparks[i].isDead()) {
      trebleSparks.splice(i, 1);
    }
  }


  // --- Center Element (Reacting Star) ---
  let centerBaseSize = 30;
  // Greatly increased size range, reacting strongly to bass
  let centerPulse = map(bass, 0, 255, 0, min(width, height) * 0.6); 
  let centerSize = centerBaseSize + centerPulse;
  let centerHue = (baseHue + 180) % 360; // Complementary color
  let centerSaturation = map(mid, 0, 255, 60, 100);
  let centerBrightness = map(treble, 0, 255, 70, 100);
  // Alpha reacts to overall volume and transient flash
  let centerAlpha = map(vol, 0, 0.5, 30, 90) + transientFlash * 0.5;

  push();
  translate(width / 2, height / 2);
  // Rotation speed increases with volume and high frequencies
  let angleOffset = map(vol, 0, 0.5, 0, PI / 4) + map(highMid, 0, 255, 0, PI/8);
  rotate(frameCount * 0.005 + angleOffset);

  fill(centerHue, centerSaturation, centerBrightness, constrain(centerAlpha, 0, 100));
  stroke(centerHue, centerSaturation, centerBrightness * 1.1, constrain(centerAlpha * 1.2, 0, 100));
  strokeWeight(2);

  // Star shape - number of points reacts to mid, pointiness reacts to treble
  let sides = 5 + floor(map(mid, 0, 255, 0, 7)); // 5 to 12 sides
  let pointiness = map(treble, 0, 255, 0.4, 0.8); // How sharp the points are
  beginShape();
  for (let i = 0; i < sides * 2; i++) {
    let angle = map(i, 0, sides * 2, 0, TWO_PI);
    let r = (i % 2 === 0) ? centerSize : centerSize * pointiness;
    let x = cos(angle) * r;
    let y = sin(angle) * r;
    vertex(x, y);
  }
  endShape(CLOSE);
  pop();
}

// ============================
// Element Classes
// ============================

// --- Bass Rings ---
class BassRing {
  constructor() {
    this.radius = 0;
    this.maxRadius = max(width, height) * 0.8;
    this.lifespan = 255;
    this.hue = (baseHue + random(-20, 20)) % 360;
    this.weight = random(5, 15);
  }

  update(bass, vol) {
    this.radius += map(bass, 0, 255, 1, 8) + vol * 10; // Expands faster with bass/vol
    this.lifespan -= 3;
    this.weight = map(bass, 0, 255, 2, 20); // Thickness pulses with bass
  }

  display() {
    push();
    translate(width / 2, height / 2);
    noFill();
    strokeWeight(this.weight);
    let alpha = map(this.lifespan, 0, 255, 0, 70);
    let brightness = map(this.radius, 0, this.maxRadius, 100, 50); // Fades brightness as it expands
    stroke(this.hue, 80, brightness, alpha);
    ellipse(0, 0, this.radius * 2, this.radius * 2);
    pop();
  }

  isDead() {
    return this.lifespan <= 0 || this.radius > this.maxRadius;
  }
}

// --- Mid Spirals ---
class MidSpiral {
    constructor() {
        this.center = createVector(width / 2, height / 2);
        this.angle = random(TWO_PI);
        this.radius = 0;
        this.maxRadius = max(width, height) * 0.6;
        this.angleVel = random(-0.05, 0.05);
        this.radiusVel = random(1, 3);
        this.lifespan = 180;
        this.hue = (baseHue + 90 + random(-30, 30)) % 360;
        this.history = [];
        this.maxLength = 30; // Max points in the trail
    }

    update(mid, vol) {
        this.angleVel = map(mid, 0, 255, -0.1, 0.1) * (random() > 0.5 ? 1 : -1); // Rotation speed/direction by mid
        this.radiusVel = map(vol, 0, 0.5, 1, 5);

        this.angle += this.angleVel;
        this.radius += this.radiusVel;
        this.lifespan -= 2;

        let x = this.center.x + cos(this.angle) * this.radius;
        let y = this.center.y + sin(this.angle) * this.radius;
        this.history.push(createVector(x, y));

        if (this.history.length > this.maxLength) {
            this.history.splice(0, 1);
        }
    }

    display() {
        push();
        noFill();
        let alpha = map(this.lifespan, 0, 180, 0, 80);
        strokeWeight(map(this.lifespan, 0, 180, 0.5, 3)); // Thinner as it fades
        stroke(this.hue, 70, 90, alpha);
        beginShape();
        for (let v of this.history) {
            vertex(v.x, v.y);
        }
        endShape();
        pop();
    }

    isDead() {
        return this.lifespan <= 0 || this.radius > this.maxRadius;
    }
}


// --- Treble Sparks ---
class TrebleSpark {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.lifespan = 60; // Short lifespan
    this.size = random(2, 5);
    this.hue = (baseHue + 60 + random(-40, 40)) % 360;
  }

  update(treble, vol) {
    this.lifespan -= 2;
    this.size = map(treble, 0, 255, 1, 10); // Size pulses with treble
    // Optional: Add slight movement based on volume or randomness
    this.pos.x += random(-1, 1) * vol * 5;
    this.pos.y += random(-1, 1) * vol * 5;
  }

  display() {
    push();
    noStroke();
    let alpha = map(this.lifespan, 0, 60, 0, 100);
    let brightness = map(this.lifespan, 0, 60, 50, 100); // Brighter when new
    fill(this.hue, 50, brightness, alpha);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
    pop();
  }

  isDead() {
    return this.lifespan <= 0;
  }
}

// ============================
// Utility Functions
// ============================

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Potentially reset or adjust elements based on new size
  bassRings = [];
  midSpirals = [];
  trebleSparks = [];
}

function touchStarted() {
  userStartAudio();
}

function mousePressed() {
  userStartAudio();
}

// Ensure audio context starts on user interaction
function userStartAudio() {
   if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      console.log('Audio Context resumed successfully');
    });
  }
}