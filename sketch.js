const GRID_SIZE = 6;
const LOW_DENSITY_REPEATS = [1, 3];
const MEDIUM_DENSITY_REPEATS = [10, 15];
const HIGH_DENSITY_REPEATS = [30, 40];
const VERTEX_JITTER = [0.10, 0.35];
const CELL_CENTER_JITTER = 0.08;
const GRID_COLOR = 220;
const DRAW_COLOR = 15;
const STROKE_WEIGHT_SHAPE = 1.8;
const STROKE_WEIGHT_GRID = 1;
const MAX_FIGURES_PER_CELL = 40;
const TREMOR_INTENSITY = 0.02;
const WAVE_SPEED = 0.04;
const REMOVE_INTERVAL = 6;
const OVERFLOW_CHANCE = 0.18;

const SILENCE_THRESHOLD = 0.02;
const SWAP_PEAK_THRESHOLD = 0.05;
const SWAP_COOLDOWN = 60;
const TREBLE_WAVE_THRESHOLD = 60;

let cellSize;
let densityMap = [];
let baseDensityMap = [];
let currentVol = 0;
let currentTreble = 0;
let currentPeak = 0;
let waveActive = false;
let waveHold = false;
let waveReleasing = false;
let waveProgress = 0;
let waveOverlayMap = [];
let addFigureCounter = 0;
let removeCounter = 0;

let mic;
let fft;
let audioStarted = false;
let prevAmplitude = 0;
let swapCooldown = 0;

let sliderSilence, sliderTreble, sliderSwapPeak;
let menuVisible = false;
let labelSilence, labelTreble, labelSwapPeak;
let resetButton;

// barras de nivel
let meterVolContainer, meterVolBar;
let meterTrebleContainer, meterTrebleBar;
let meterPeakContainer, meterPeakBar;

function setup() {
    const canvas = createCanvas(720, 720);
    canvas.elt.oncontextmenu = () => false;
    cellSize = width / GRID_SIZE;
    generateDensityMap();
    baseDensityMap = densityMap.slice();
    waveOverlayMap = Array(GRID_SIZE * GRID_SIZE).fill(0);

    // --- SILENCIO ---
    labelSilence = createDiv("Umbral de silencio (densidad) — min: 0.01 / max: 0.30");
    labelSilence.position(10, 730);
    labelSilence.style("font-size", "12px");
    labelSilence.hide();

    sliderSilence = createSlider(0.01, 0.3, SILENCE_THRESHOLD, 0.01);
    sliderSilence.position(10, 748);
    sliderSilence.style("width", "200px");
    sliderSilence.hide();

    meterVolContainer = createDiv("");
    meterVolContainer.position(220, 748);
    meterVolContainer.style("width", "200px");
    meterVolContainer.style("height", "14px");
    meterVolContainer.style("background", "#ccc");
    meterVolContainer.style("border-radius", "3px");
    meterVolContainer.style("overflow", "hidden");
    meterVolContainer.hide();

    meterVolBar = createDiv("");
    meterVolBar.parent(meterVolContainer);
    meterVolBar.style("height", "100%");
    meterVolBar.style("width", "0%");
    meterVolBar.style("background", "#4CAF50");
    meterVolBar.style("transition", "width 0.05s");

    // --- AGUDOS ---
    labelTreble = createDiv("Umbral de agudos (ola) — min: 10 / max: 150");
    labelTreble.position(10, 778);
    labelTreble.style("font-size", "12px");
    labelTreble.hide();

    sliderTreble = createSlider(10, 150, TREBLE_WAVE_THRESHOLD, 1);
    sliderTreble.position(10, 796);
    sliderTreble.style("width", "200px");
    sliderTreble.hide();

    meterTrebleContainer = createDiv("");
    meterTrebleContainer.position(220, 796);
    meterTrebleContainer.style("width", "200px");
    meterTrebleContainer.style("height", "14px");
    meterTrebleContainer.style("background", "#ccc");
    meterTrebleContainer.style("border-radius", "3px");
    meterTrebleContainer.style("overflow", "hidden");
    meterTrebleContainer.hide();

    meterTrebleBar = createDiv("");
    meterTrebleBar.parent(meterTrebleContainer);
    meterTrebleBar.style("height", "100%");
    meterTrebleBar.style("width", "0%");
    meterTrebleBar.style("background", "#5080DC");
    meterTrebleBar.style("transition", "width 0.05s");

    // --- PICO ---
    labelSwapPeak = createDiv("Sensibilidad de pico (swap) — min: 0.01 / max: 0.30");
    labelSwapPeak.position(10, 826);
    labelSwapPeak.style("font-size", "12px");
    labelSwapPeak.hide();

    sliderSwapPeak = createSlider(0.01, 0.3, SWAP_PEAK_THRESHOLD, 0.01);
    sliderSwapPeak.position(10, 844);
    sliderSwapPeak.style("width", "200px");
    sliderSwapPeak.hide();

    meterPeakContainer = createDiv("");
    meterPeakContainer.position(220, 844);
    meterPeakContainer.style("width", "200px");
    meterPeakContainer.style("height", "14px");
    meterPeakContainer.style("background", "#ccc");
    meterPeakContainer.style("border-radius", "3px");
    meterPeakContainer.style("overflow", "hidden");
    meterPeakContainer.hide();

    meterPeakBar = createDiv("");
    meterPeakBar.parent(meterPeakContainer);
    meterPeakBar.style("height", "100%");
    meterPeakBar.style("width", "0%");
    meterPeakBar.style("background", "#DC5050");
    meterPeakBar.style("transition", "width 0.05s");

    resetButton = createButton("Restablecer valores");
    resetButton.position(10, 876);
    resetButton.mousePressed(resetSliders);
    resetButton.hide();
}

function startAudio() {
    if (audioStarted) return;
    userStartAudio();
    mic = new p5.AudioIn();
    mic.start();
    fft = new p5.FFT(0.8, 1024);
    fft.setInput(mic);
    audioStarted = true;
}

function mousePressed() {
    startAudio();
}

function keyPressed() {
    if (key === ' ') {
        menuVisible = !menuVisible;
        if (menuVisible) {
            sliderSilence.show();
            sliderTreble.show();
            sliderSwapPeak.show();
            labelSilence.show();
            labelTreble.show();
            labelSwapPeak.show();
            meterVolContainer.show();
            meterTrebleContainer.show();
            meterPeakContainer.show();
            resetButton.show();
        } else {
            sliderSilence.hide();
            sliderTreble.hide();
            sliderSwapPeak.hide();
            labelSilence.hide();
            labelTreble.hide();
            labelSwapPeak.hide();
            meterVolContainer.hide();
            meterTrebleContainer.hide();
            meterPeakContainer.hide();
            resetButton.hide();
        }
        return false;
    }
}

function draw() {
    background(255);

    if (audioStarted) {
        processSounds();
    }

    if (waveActive || waveReleasing) {
        applyWaveEffect();
    }

    drawCells();
    drawGrain();

    if (menuVisible && audioStarted) {
        const volPct = constrain(currentVol / 0.3, 0, 1) * 100;
        const treblePct = constrain(currentTreble / 150, 0, 1) * 100;
        const peakPct = constrain(currentPeak / 0.3, 0, 1) * 100;
        meterVolBar.style("width", volPct + "%");
        meterTrebleBar.style("width", treblePct + "%");
        meterPeakBar.style("width", peakPct + "%");
    }
}

function drawGrain() {
    stroke(0, 25);
    strokeWeight(0.5);
    for (let i = 0; i < 800; i++) {
        const x = random(width);
        const y = random(height);
        point(x, y);
    }
}

function processSounds() {
    fft.analyze();
    const vol = fft.getEnergy(20, 20000) / 255;
    const trebleEnergy = fft.getEnergy("treble");

    currentVol = vol;
    currentTreble = trebleEnergy;
    currentPeak = max(0, vol - prevAmplitude);

    const silenceVal = sliderSilence.value();
    const trebleVal = sliderTreble.value();
    const swapPeakVal = sliderSwapPeak.value();

    if (vol > silenceVal && trebleEnergy < trebleVal) {
        addFigureCounter++;
        if (addFigureCounter >= 6) {
            addRandomFigures();
            addFigureCounter = 0;
        }
    } else {
        addFigureCounter = 0;
    }

    if (vol < silenceVal) {
        removeCounter++;
        if (removeCounter >= REMOVE_INTERVAL) {
            removeRandomFigures(true);
            removeCounter = 0;
        }
    } else {
        removeCounter = 0;
    }

    if (swapCooldown > 0) swapCooldown--;
    const peak = vol - prevAmplitude;
    if (peak > swapPeakVal && swapCooldown === 0) {
        swapRandomCells();
        swapCooldown = SWAP_COOLDOWN;
    }
    prevAmplitude = vol;

    const isWave = trebleEnergy > trebleVal && vol > silenceVal;
    if (isWave && !waveHold) {
        waveHold = true;
        waveReleasing = false;
        waveActive = true;
        waveProgress = 0;
        waveOverlayMap.fill(0);
    } else if (!isWave && waveHold) {
        waveHold = false;
        waveReleasing = true;
        waveActive = true;
    }
}

function resetSliders() {
    sliderSilence.value(SILENCE_THRESHOLD);
    sliderTreble.value(TREBLE_WAVE_THRESHOLD);
    sliderSwapPeak.value(SWAP_PEAK_THRESHOLD);
}

function swapRandomCells() {
    const cellCount = floor(random(10, 21));
    const selectedCells = [];
    while (selectedCells.length < cellCount) {
        const cell = floor(random(GRID_SIZE * GRID_SIZE));
        if (!selectedCells.includes(cell)) selectedCells.push(cell);
    }
    const values = selectedCells.map(i => densityMap[i]);
    const shuffledValues = shuffle(values);
    for (let i = 0; i < selectedCells.length; i++) {
        densityMap[selectedCells[i]] = shuffledValues[i];
    }
}

function generateDensityMap() {
    const totalCells = GRID_SIZE * GRID_SIZE;
    const lowCount = floor(totalCells * 0.20);
    const mediumCount = floor(totalCells * 0.45);
    const allIndexes = Array.from({ length: totalCells }, (_, i) => i);
    const shuffled = shuffle(allIndexes);
    const lowIndexes = new Set(shuffled.slice(0, lowCount));
    const mediumIndexes = new Set(shuffled.slice(lowCount, lowCount + mediumCount));
    for (let index = 0; index < totalCells; index++) {
        let repeats;
        if (lowIndexes.has(index)) {
            repeats = floor(random(LOW_DENSITY_REPEATS[0], LOW_DENSITY_REPEATS[1] + 1));
        } else if (mediumIndexes.has(index)) {
            repeats = floor(random(MEDIUM_DENSITY_REPEATS[0], MEDIUM_DENSITY_REPEATS[1] + 1));
        } else {
            repeats = floor(random(HIGH_DENSITY_REPEATS[0], HIGH_DENSITY_REPEATS[1] + 1));
        }
        densityMap[index] = max(1, repeats);
    }
}

function addRandomFigures() {
    for (let i = 0; i < 4; i++) {
        const randomCell = floor(random(GRID_SIZE * GRID_SIZE));
        const addCount = floor(random(2, 5));
        for (let j = 0; j < addCount; j++) {
            if (densityMap[randomCell] < MAX_FIGURES_PER_CELL) {
                densityMap[randomCell]++;
            }
        }
    }
}

function removeRandomFigures(isFast = false) {
    const candidates = [];
    for (let i = 0; i < densityMap.length; i++) {
        if (densityMap[i] > baseDensityMap[i]) candidates.push(i);
    }
    if (candidates.length === 0) return;
    const removeCount = isFast ? min(floor(random(2, 5)) * 4, candidates.length) : min(3, candidates.length);
    for (let k = 0; k < removeCount; k++) {
        const idx = candidates[floor(random(candidates.length))];
        if (densityMap[idx] > baseDensityMap[idx]) {
            densityMap[idx]--;
        }
    }
}

function applyWaveEffect() {
    if (waveHold) {
        waveProgress += WAVE_SPEED;
        if (waveProgress > 1) waveProgress = 1;
    } else if (waveReleasing) {
        waveProgress -= WAVE_SPEED;
        if (waveProgress < 0) waveProgress = 0;
    }
    if (!waveHold && waveProgress <= 0) {
        waveActive = false;
        waveReleasing = false;
        waveOverlayMap.fill(0);
        return;
    }
    for (let row = 0; row < GRID_SIZE; row++) {
        const rowFactor = constrain((waveProgress * GRID_SIZE - (GRID_SIZE - 1 - row)) / 1, 0, 1);
        const extraCount = floor(15 * rowFactor);
        for (let col = 0; col < GRID_SIZE; col++) {
            const index = row * GRID_SIZE + col;
            waveOverlayMap[index] = max(0, extraCount);
        }
    }
}

function drawCells() {
    noFill();
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const index = row * GRID_SIZE + col;
            const repeats = densityMap[index] + waveOverlayMap[index];
            const cellX = col * cellSize;
            const cellY = row * cellSize;
            drawCellFigures(cellX, cellY, repeats, index);
        }
    }
}

function fract(value) {
    return value - floor(value);
}

function stableRandom(seed) {
    return fract(sin(seed) * 43758.5453123);
}

function stableRandomRange(seed, min, max) {
    return min + stableRandom(seed) * (max - min);
}

function drawCellFigures(cellX, cellY, repeats, cellIndex) {
    const centerX = cellX + cellSize / 2;
    const centerY = cellY + cellSize / 2;

    for (let i = 0; i < repeats; i++) {
        const baseSize = stableRandomRange(cellIndex * 100 + i * 7 + 1, cellSize * 0.55, cellSize * 0.85);
        const jitterX = stableRandomRange(cellIndex * 100 + i * 7 + 2, -cellSize * CELL_CENTER_JITTER, cellSize * CELL_CENTER_JITTER);
        const jitterY = stableRandomRange(cellIndex * 100 + i * 7 + 3, -cellSize * CELL_CENTER_JITTER, cellSize * CELL_CENTER_JITTER);

        const squareCenterX = centerX + jitterX;
        const squareCenterY = centerY + jitterY;

        const canOverflow = stableRandom(cellIndex * 100 + i * 7 + 50) < OVERFLOW_CHANCE;

        drawJitteredSquare(squareCenterX, squareCenterY, baseSize, cellX, cellY, cellSize, cellIndex, i, canOverflow);
    }
}

function drawJitteredSquare(cx, cy, size, cellX, cellY, cellWidth, cellIndex, shapeIndex, canOverflow) {
    const half = size / 2;
    const tremorAmount = TREMOR_INTENSITY * (1 + currentVol * 3);

    const vertices = [
        { x: -half, y: -half },
        { x: half, y: -half },
        { x: half, y: half },
        { x: -half, y: half }
    ].map((vertex, vIndex) => {
        const jitterX = stableRandomRange(cellIndex * 100 + shapeIndex * 10 + vIndex * 3 + 4, -VERTEX_JITTER[1] * size, VERTEX_JITTER[1] * size);
        const jitterY = stableRandomRange(cellIndex * 100 + shapeIndex * 10 + vIndex * 3 + 5, -VERTEX_JITTER[1] * size, VERTEX_JITTER[1] * size);

        const tX = random(-tremorAmount * size, tremorAmount * size);
        const tY = random(-tremorAmount * size, tremorAmount * size);

        const finalX = cx + vertex.x + jitterX + tX;
        const finalY = cy + vertex.y + jitterY + tY;

        if (canOverflow) {
            const margin = cellWidth * 0.5;
            return {
                x: constrain(finalX, cellX - margin, cellX + cellWidth + margin),
                y: constrain(finalY, cellY - margin, cellY + cellWidth + margin)
            };
        } else {
            return {
                x: constrain(finalX, cellX, cellX + cellWidth),
                y: constrain(finalY, cellY, cellY + cellWidth)
            };
        }
    });

    const segments = 2;
    for (let v = 0; v < vertices.length; v++) {
        const a = vertices[v];
        const b = vertices[(v + 1) % vertices.length];
        for (let s = 0; s < segments; s++) {
            const t1 = s / segments;
            const t2 = (s + 1) / segments;
            const x1 = lerp(a.x, b.x, t1);
            const y1 = lerp(a.y, b.y, t1);
            const x2 = lerp(a.x, b.x, t2);
            const y2 = lerp(a.y, b.y, t2);
            const sw = stableRandomRange(cellIndex * 100 + shapeIndex * 10 + v * segments + s + 99, 0.5, 2.5);
            const op = stableRandomRange(cellIndex * 100 + shapeIndex * 10 + v * segments + s + 77, 120, 220);
            stroke(DRAW_COLOR, op);
            strokeWeight(sw);
            line(x1, y1, x2, y2);
        }
    }
}