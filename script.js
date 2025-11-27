// Tetris game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    'cyan',    // I
    'blue',    // J
    'orange',  // L
    'yellow',  // O
    'green',   // S
    'purple',  // T
    'red'      // Z
];

// Tetromino shapes
const SHAPES = [
    [],
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I
    [[2,0,0], [2,2,2], [0,0,0]],                   // J
    [[0,0,3], [3,3,3], [0,0,0]],                   // L
    [[4,4], [4,4]],                                // O
    [[0,5,5], [5,5,0], [0,0,0]],                   // S
    [[0,6,0], [6,6,6], [0,0,0]],                   // T
    [[7,7,0], [0,7,7], [0,0,0]]                    // Z
];

// Game variables
let canvas, ctx, nextCanvas, nextCtx;
let board = [];
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let paused = false;
let dropCounter = 0;
let dropInterval = 1000; // milliseconds
let lastTime = 0;
let currentPiece, nextPiece;

// DOM elements
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const startButton = document.getElementById('start-button');
const exitButton = document.getElementById('exit-button');

// Initialize the game
function init() {
    canvas = document.getElementById('board');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('next-piece');
    nextCtx = nextCanvas.getContext('2d');

    // Scale canvases based on block size
    ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
    nextCtx.scale(BLOCK_SIZE, BLOCK_SIZE);

    createBoard();
    resetGame();
    draw();

    // Event listeners
    document.addEventListener('keydown', handleKeyPress);
    startButton.addEventListener('click', togglePause);
    exitButton.addEventListener('click', exitGame);
}

// Exit the game (close the tab/window)
function exitGame() {
    if (confirm('Are you sure you want to exit the game? Note: To stop the server, you need to terminate the Python process from your terminal using "kill -9 <PID>".')) {
        // Close the current window/tab
        window.close();

        // If window.close() doesn't work (due to browser security),
        // redirect to a blank page to clear the game
        window.location.href = 'about:blank';
    }
}

// Create empty board
function createBoard() {
    board = Array.from(Array(ROWS), () => Array(COLS).fill(0));
}

// Reset game state
function resetGame() {
    createBoard();
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    paused = false;
    dropInterval = 1000;
    
    updateStats();
    
    // Create first pieces
    currentPiece = createPiece();
    nextPiece = createPiece();
}

// Create a random piece
function createPiece() {
    const rand = Math.floor(Math.random() * 7) + 1;
    return {
        pos: {x: Math.floor(COLS/2) - 1, y: 0},
        matrix: SHAPES[rand],
        type: rand
    };
}

// Draw the game board and current piece
function draw() {
    // Clear the main canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the board
    drawMatrix(board, {x: 0, y: 0});
    
    // Draw the current piece
    if (currentPiece) {
        drawMatrix(currentPiece.matrix, currentPiece.pos);
    }
    
    // Draw next piece preview
    nextCtx.fillStyle = '#111';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        // Center the next piece in the preview
        const offsetX = (4 - nextPiece.matrix[0].length) / 2;
        const offsetY = (4 - nextPiece.matrix.length) / 2;
        drawNextMatrix(nextPiece.matrix, {x: offsetX, y: offsetY});
    }
}

// Draw a matrix on the board
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                // Add 3D effect
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 0.1;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

// Draw next piece matrix
function drawNextMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                nextCtx.fillStyle = COLORS[value];
                nextCtx.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                // Add 3D effect
                nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                nextCtx.lineWidth = 0.1;
                nextCtx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

// Move the current piece
function movePiece(dir) {
    if (paused || gameOver) return;
    
    currentPiece.pos.x += dir;
    if (collide()) {
        currentPiece.pos.x -= dir;
    }
}

// Rotate the current piece
function rotatePiece() {
    if (paused || gameOver) return;
    
    const originalMatrix = currentPiece.matrix;
    
    // Transpose matrix
    const rows = originalMatrix.length;
    const cols = originalMatrix[0].length;
    const rotated = Array.from({length: cols}, () => Array(rows).fill(0));
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            rotated[x][y] = originalMatrix[rows - 1 - y][x];
        }
    }
    
    currentPiece.matrix = rotated;
    
    // If rotation causes collision, revert
    if (collide()) {
        currentPiece.matrix = originalMatrix;
    }
}

// Drop the current piece
function dropPiece() {
    if (paused || gameOver) return;
    
    currentPiece.pos.y++;
    if (collide()) {
        currentPiece.pos.y--;
        merge();
        clearLines();
        resetPiece();
        
        // Check for game over
        if (collide()) {
            gameOver = true;
            alert('Game Over! Your score: ' + score);
        }
    }
    dropCounter = 0;
}

// Hard drop - drop piece to the bottom
function hardDrop() {
    if (paused || gameOver) return;
    
    while (!collide()) {
        currentPiece.pos.y++;
    }
    currentPiece.pos.y--;
    merge();
    clearLines();
    resetPiece();
    
    // Check for game over
    if (collide()) {
        gameOver = true;
        alert('Game Over! Your score: ' + score);
    }
}

// Check for collision
function collide() {
    const [m, o] = [currentPiece.matrix, currentPiece.pos];
    
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0 &&
                (board[y + o.y] &&
                board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// Merge the current piece with the board
function merge() {
    currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + currentPiece.pos.y][x + currentPiece.pos.x] = value;
            }
        });
    });
}

// Clear completed lines and update score
function clearLines() {
    let linesCleared = 0;
    
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        
        // Remove the line
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        linesCleared++;
        y++; // Recheck the same row index since we shifted rows down
    }
    
    if (linesCleared > 0) {
        // Update score based on lines cleared
        const points = [0, 40, 100, 300, 1200]; // Points for 0, 1, 2, 3, 4 lines
        score += points[linesCleared] * level;
        lines += linesCleared;
        
        // Level up every 10 lines
        level = Math.floor(lines / 10) + 1;
        
        // Increase speed with level
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateStats();
    }
}

// Reset the current piece
function resetPiece() {
    currentPiece = nextPiece;
    nextPiece = createPiece();
}

// Update score, level, and lines display
function updateStats() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
}

// Handle keyboard input
function handleKeyPress(event) {
    if (gameOver) return;
    
    switch(event.keyCode) {
        case 37: // Left arrow
            movePiece(-1);
            break;
        case 39: // Right arrow
            movePiece(1);
            break;
        case 40: // Down arrow
            dropPiece();
            break;
        case 38: // Up arrow
            rotatePiece();
            break;
        case 32: // Space
            hardDrop();
            break;
        case 80: // P key
            togglePause();
            break;
    }
}

// Toggle pause state
function togglePause() {
    if (gameOver) {
        resetGame();
        paused = false;
    } else {
        paused = !paused;
    }
}

// Main game loop
function gameLoop(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    
    if (!paused && !gameOver) {
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            dropPiece();
        }
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game when the page loads
window.addEventListener('load', () => {
    init();
    gameLoop();
});