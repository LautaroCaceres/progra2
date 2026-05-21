const GRID_SIZE = 6;
const LOW_DENSITY_REPEATS = [2, 5];
const MEDIUM_DENSITY_REPEATS = [8, 12];
const HIGH_DENSITY_REPEATS = [15, 30];
const VERTEX_JITTER = [0.10, 0.35];
const CELL_CENTER_JITTER = 0.08;
const GRID_COLOR = 220;
const DRAW_COLOR = 15;
const STROKE_WEIGHT_SHAPE = 1.8;
const STROKE_WEIGHT_GRID = 1;
const MAX_FIGURES_PER_CELL = 40;
const TREMOR_INTENSITY = 0.02;
const MOVE_IMPULSE = 0.1;
const WAVE_SPEED = 0.04;
const REMOVE_INTERVAL = 6;

let cellSize;
let densityMap = [];
let baseDensityMap = [];
let tremorActive = true;
let moveImpulse = 0;
let waveActive = false;
let waveHold = false;
let waveReleasing = false;
let waveProgress = 0;
let waveOverlayMap = [];
let leftHold = false;
let addFigureCounter = 0;
let removeMode = false;
let removeCounter = 0;

function setup() {
    const canvas = createCanvas(720, 720);
    canvas.elt.oncontextmenu = () => false;
    canvas.elt.onmousedown = e => {
        if (e.button === 1 || e.button === 2) {
            e.preventDefault();
        }
    };
    cellSize = width / GRID_SIZE;
    generateDensityMap();
    baseDensityMap = densityMap.slice();
    waveOverlayMap = Array(GRID_SIZE * GRID_SIZE).fill(0);
}

function draw() {
    background(255);
    drawGridLines();

    if (leftHold) {
        removeMode = false;
        addFigureCounter++;
        if (addFigureCounter >= 6) {
            addRandomFigures();
            addFigureCounter = 0;
        }
    } else if (removeMode) {
        removeCounter++;
        if (removeCounter >= REMOVE_INTERVAL) {
            removeRandomFigures(true);
            removeCounter = 0;
        }
    }

    tremorActive = mouseX >= width / 2;

    if (waveActive || waveReleasing) {
        applyWaveEffect();
    }

    drawCells();
}

function mousePressed(event) {
    if (event.button === 0 && !keyIsPressed) {
        leftHold = true;
    }

    if (event.button === 1) {
        waveHold = true;
        waveReleasing = false;
        waveActive = true;
        waveProgress = 0;
        waveOverlayMap.fill(0);
    }
}

function mouseReleased(event) {
    if (event.button === 0) {
        leftHold = false;
        addFigureCounter = 0;
        removeMode = true;
    }

    if (event.button === 1) {
        waveHold = false;
        waveReleasing = true;
        waveActive = true;
    }
}

function mouseClicked() {
    // Nada por ahora
}

function keyPressed() {
    if (key === ' ') {
        swapRandomCells();
        return false;
    }
}

function swapRandomCells() {
    const cellCount = floor(random(10, 21));
    const selectedCells = [];
    
    while (selectedCells.length < cellCount) {
        const cell = floor(random(GRID_SIZE * GRID_SIZE));
        if (!selectedCells.includes(cell)) {
            selectedCells.push(cell);
        }
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
        if (densityMap[i] > baseDensityMap[i]) {
            candidates.push(i);
        }
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

    if (!removed) {
        removeMode = false;
    }
}

function applyTremor() {
    // El temblor se aplica en drawCells
}

function applyMoveImpulse() {
    // El impulso se aplica en drawCells
}

function applyWaveEffect() {
    if (waveHold) {
        waveProgress += WAVE_SPEED;
        if (waveProgress > 1) {
            waveProgress = 1;
        }
    } else if (waveReleasing) {
        waveProgress -= WAVE_SPEED;
        if (waveProgress < 0) {
            waveProgress = 0;
        }
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

        // Solo aplicar efectos dinámicos si se activan
        if (tremorActive) {
            jitterX += random(-TREMOR_INTENSITY * cellSize, TREMOR_INTENSITY * cellSize);
            jitterY += random(-TREMOR_INTENSITY * cellSize, TREMOR_INTENSITY * cellSize);
        }
        if (moveImpulse > 0) {
            jitterX += random(-moveImpulse * cellSize, moveImpulse * cellSize);
            jitterY += random(-moveImpulse * cellSize, moveImpulse * cellSize);
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

    beginShape();
    vertices.forEach(v => vertex(v.x, v.y));
    endShape(CLOSE);
    //preubaaa
}
 