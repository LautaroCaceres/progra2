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

// Umbrales de sonido
const SILENCE_THRESHOLD = 0.05;
const SWAP_PEAK_THRESHOLD = 0.05;
const SWAP_COOLDOWN = 60;
const TREBLE_WAVE_THRESHOLD = 60;

let cellSize;
let densityMap = [];
let baseDensityMap = [];
let tremorActive = false;
let waveActive = false;
let waveHold = false;
let waveReleasing = false;
let waveProgress = 0;
let waveOverlayMap = [];
let addFigureCounter = 0;
let removeCounter = 0;
let removeMode = false;

// Variables de sonido
let mic;
let fft;
let amplitude;
let audioStarted = false;
let prevAmplitude = 0;
let swapCooldown = 0;

function setup() {
    const canvas = createCanvas(720, 720);
    canvas.elt.oncontextmenu = () => false;
    cellSize = width / GRID_SIZE;
    generateDensityMap();
    baseDensityMap = densityMap.slice();
    waveOverlayMap = Array(GRID_SIZE * GRID_SIZE).fill(0);
}

function startAudio() {
    if (audioStarted) return;
    userStartAudio();
    mic = new p5.AudioIn();
    mic.start();
    fft = new p5.FFT(0.8, 1024);
    fft.setInput(mic);
    amplitude = new p5.Amplitude();
    amplitude.setInput(mic);
    audioStarted = true;
}

function mousePressed() {
    startAudio();
}

function draw() {
    background(255);
    drawGridLines();

    if (audioStarted) {
        processSounds();
    }

    if (waveActive || waveReleasing) {
        applyWaveEffect();
    }

    drawCells();
    drawGrain();

    // DEBUG - borrar después
    if (audioStarted) {
        fft.analyze();
        const vol = fft.getEnergy(20, 20000) / 255;
        const bassEnergy = fft.getEnergy("bass");
        const trebleEnergy = fft.getEnergy("treble");

        fill(255, 0, 0);
        noStroke();
        textSize(12);
        text(`VOL: ${vol.toFixed(4)}`, 10, 20);
        text(`BASS: ${bassEnergy.toFixed(1)}`, 10, 40);
        text(`TREBLE: ${trebleEnergy.toFixed(1)}`, 10, 60);
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
    const bassEnergy = fft.getEnergy("bass");
    const trebleEnergy = fft.getEnergy("treble");

    // Temblor: silencio → tiembla, ruido → no tiembla
    tremorActive = vol < SILENCE_THRESHOLD;

    // Hablar normal o grave → agrega figuras
    if (vol > SILENCE_THRESHOLD && trebleEnergy < TREBLE_WAVE_THRESHOLD) {
        addFigureCounter++;
        if (addFigureCounter >= 6) {
            addRandomFigures();
            addFigureCounter = 0;
        }
    } else {
        addFigureCounter = 0;
    }

    // Silencio → quita figuras
    if (vol < SILENCE_THRESHOLD) {
        removeCounter++;
        if (removeCounter >= REMOVE_INTERVAL) {
            removeRandomFigures(true);
            removeCounter = 0;
        }
    } else {
        removeCounter = 0;
    }

    // Swap: pico repentino de volumen (aplauso)
    if (swapCooldown > 0) swapCooldown--;
    const peak = vol - prevAmplitude;
    if (peak > SWAP_PEAK_THRESHOLD && swapCooldown === 0) {
        swapRandomCells();
        swapCooldown = SWAP_COOLDOWN;
    }
    prevAmplitude = vol;

    // Ola: agudos (ssss, silbido)
    const isWave = trebleEnergy > TREBLE_WAVE_THRESHOLD && vol > SILENCE_THRESHOLD;
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
    const highCount = totalCells - lowCount - mediumCount;
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
    let removed = false;
    const candidates = [];
    for (let i = 0; i < densityMap.length; i++) {
        if (densityMap[i] > baseDensityMap[i]) candidates.push(i);
    }
    if (candidates.length === 0) {
        removeMode = false;
        return;
    }
    const removeCount = isFast ? min(floor(random(2, 5)) * 4, candidates.length) : min(3, candidates.length);
    for (let k = 0; k < removeCount; k++) {
        const idx = candidates[floor(random(candidates.length))];
        if (densityMap[idx] > baseDensityMap[idx]) {
            densityMap[idx]--;
            removed = true;
        }
    }
    if (!removed) removeMode = false;
}

function applyWaveEffect() {
    if (waveHold) {
        waveProgress += WAVE_SPEED;
        if (waveProgress > 1) waveProgress = 1;
    } else if (waveReleasing) {
        waveProgress -= WAVE_SPEED;
        if (waveProgress < 0) waveProgress = 0;
    }
    if (!waveHold && waveProgress === 0) {
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

function drawGridLines() {
    stroke(GRID_COLOR);
    strokeWeight(STROKE_WEIGHT_GRID);
    noFill();
    for (let i = 0; i <= GRID_SIZE; i++) {
        const position = i * cellSize;
        line(position, 0, position, height);
        line(0, position, width, position);
    }
}

function drawCells() {
    stroke(DRAW_COLOR);
    strokeWeight(STROKE_WEIGHT_SHAPE);
    noFill();
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const index = row * GRID_SIZE + col;
            const repeats = densityMap[index] + waveOverlayMap[index];
            const cellX = col * cellSize;
            const cellY = row * cellSize;
            drawCellFigures(cellX, cellY, repeats);
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

function drawCellFigures(cellX, cellY, repeats) {
    const centerX = cellX + cellSize / 2;
    const centerY = cellY + cellSize / 2;
    const cellIndex = floor(cellY / cellSize) * GRID_SIZE + floor(cellX / cellSize);

    for (let i = 0; i < repeats; i++) {
        const baseSize = stableRandomRange(cellIndex * 100 + i * 7 + 1, cellSize * 0.55, cellSize * 0.85);
        let jitterX = stableRandomRange(cellIndex * 100 + i * 7 + 2, -cellSize * CELL_CENTER_JITTER, cellSize * CELL_CENTER_JITTER);
        let jitterY = stableRandomRange(cellIndex * 100 + i * 7 + 3, -cellSize * CELL_CENTER_JITTER, cellSize * CELL_CENTER_JITTER);

        if (tremorActive) {
            jitterX += random(-TREMOR_INTENSITY * cellSize, TREMOR_INTENSITY * cellSize);
            jitterY += random(-TREMOR_INTENSITY * cellSize, TREMOR_INTENSITY * cellSize);
        }

        const squareCenterX = centerX + jitterX;
        const squareCenterY = centerY + jitterY;
        drawJitteredSquare(squareCenterX, squareCenterY, baseSize, cellX, cellY, cellSize, cellIndex, i);
    }
}

function drawJitteredSquare(cx, cy, size, cellX, cellY, cellWidth, cellIndex, shapeIndex) {
    const half = size / 2;
    const vertices = [
        { x: -half, y: -half },
        { x: half, y: -half },
        { x: half, y: half },
        { x: -half, y: half }
    ].map((vertex, vIndex) => {
        const jitterX = stableRandomRange(cellIndex * 100 + shapeIndex * 10 + vIndex * 3 + 4, -VERTEX_JITTER[1] * size, VERTEX_JITTER[1] * size);
        const jitterY = stableRandomRange(cellIndex * 100 + shapeIndex * 10 + vIndex * 3 + 5, -VERTEX_JITTER[1] * size, VERTEX_JITTER[1] * size);
        const finalX = cx + vertex.x + jitterX;
        const finalY = cy + vertex.y + jitterY;
        const constrainedX = constrain(finalX, cellX, cellX + cellWidth);
        const constrainedY = constrain(finalY, cellY, cellY + cellWidth);
        return { x: constrainedX, y: constrainedY };
    });

    const segments = 4;
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