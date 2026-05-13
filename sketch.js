const GRID_SIZE = 6;
const LOW_DENSITY_REPEATS = [2, 5];
const MEDIUM_DENSITY_REPEATS = [8, 12];
const HIGH_DENSITY_REPEATS = [15, 30];
const VERTEX_JITTER = [0.10, 0.35];
const CELL_CENTER_JITTER = 0.12;
const GRID_COLOR = 220;
const DRAW_COLOR = 15;
const STROKE_WEIGHT_SHAPE = 1.8;
const STROKE_WEIGHT_GRID = 1;
let cellSize;
let densityMap = [];

function setup() {
    createCanvas(720, 720);
    noLoop();
    background(255);
    cellSize = width / GRID_SIZE;
    generateDensityMap();
    drawGridLines();
    drawCells();
}

function generateDensityMap() {
    const totalCells = GRID_SIZE * GRID_SIZE;
    const lowCount = floor(totalCells * 0.20);   // 20% baja densidad
    const mediumCount = floor(totalCells * 0.45); // 45% media densidad
    const highCount = totalCells - lowCount - mediumCount; // 35% alta densidad

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
            const repeats = densityMap[index];
            const cellX = col * cellSize;
            const cellY = row * cellSize;
            drawCellFigures(cellX, cellY, repeats);
        }
    }
}

function drawCellFigures(cellX, cellY, repeats) {
    const centerX = cellX + cellSize / 2;
    const centerY = cellY + cellSize / 2;

    for (let i = 0; i < repeats; i++) {
        const baseSize = random(cellSize * 0.55, cellSize * 0.85);
        const jitterX = random(-cellSize * CELL_CENTER_JITTER, cellSize * CELL_CENTER_JITTER);
        const jitterY = random(-cellSize * CELL_CENTER_JITTER, cellSize * CELL_CENTER_JITTER);
        const squareCenterX = centerX + jitterX;
        const squareCenterY = centerY + jitterY;
        drawJitteredSquare(squareCenterX, squareCenterY, baseSize, cellX, cellY, cellSize);
    }
}

function drawJitteredSquare(cx, cy, size, cellX, cellY, cellWidth) {
    const half = size / 2;
    const vertices = [
        { x: -half, y: -half },
        { x: half, y: -half },
        { x: half, y: half },
        { x: -half, y: half }
    ].map(vertex => {
        let jitterX = random(VERTEX_JITTER[0], VERTEX_JITTER[1]) * size * (random() < 0.5 ? -1 : 1);
        let jitterY = random(VERTEX_JITTER[0], VERTEX_JITTER[1]) * size * (random() < 0.5 ? -1 : 1);
        
        const finalX = cx + vertex.x + jitterX;
        const finalY = cy + vertex.y + jitterY;
        
        // Restringir vértices dentro de los límites de la celda
        const constrainedX = constrain(finalX, cellX, cellX + cellWidth);
        const constrainedY = constrain(finalY, cellY, cellY + cellWidth);
        
        return {
            x: constrainedX,
            y: constrainedY
        };
    });

    beginShape();
    vertices.forEach(v => vertex(v.x, v.y));
    endShape(CLOSE);
}
 