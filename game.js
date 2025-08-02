class BombermanGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 40;
        this.rows = 15;
        this.cols = 20;
        
        // Game state
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameRunning = true;
        
        // Background colors array
        this.backgroundColors = [
            '#2a2a2a', '#1a1a3a', '#3a1a1a', '#1a3a1a', 
            '#3a3a1a', '#3a1a3a', '#1a3a3a', '#2a1a2a',
            '#1a2a3a', '#3a2a1a', '#2a3a1a', '#1a1a2a'
        ];
        this.currentBgIndex = 0;
        
        // Player
        this.player = {
            x: 1,
            y: 1,
            color: '#FFD700',
            bombCount: 1,
            bombRange: 2
        };
        
        // Game objects
        this.bombs = [];
        this.explosions = [];
        this.enemies = [];
        this.powerups = [];
        
        // Initialize game
        this.initializeLevel();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    initializeLevel() {
        // Create map (0 = empty, 1 = wall, 2 = breakable wall)
        this.map = [];
        for (let row = 0; row < this.rows; row++) {
            this.map[row] = [];
            for (let col = 0; col < this.cols; col++) {
                if (row === 0 || row === this.rows - 1 || col === 0 || col === this.cols - 1) {
                    this.map[row][col] = 1; // Border walls
                } else if (row % 2 === 0 && col % 2 === 0) {
                    this.map[row][col] = 1; // Fixed walls
                } else if (Math.random() < 0.3 && !(row <= 2 && col <= 2)) {
                    this.map[row][col] = 2; // Breakable walls
                } else {
                    this.map[row][col] = 0; // Empty space
                }
            }
        }
        
        // Clear starting area
        this.map[1][1] = 0;
        this.map[1][2] = 0;
        this.map[2][1] = 0;
        
        // Add enemies
        this.enemies = [];
        const enemyCount = 3 + this.level;
        for (let i = 0; i < enemyCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (this.cols - 2)) + 1;
                y = Math.floor(Math.random() * (this.rows - 2)) + 1;
            } while (this.map[y][x] !== 0 || (x <= 3 && y <= 3));
            
            this.enemies.push({
                x: x,
                y: y,
                direction: Math.floor(Math.random() * 4),
                moveTimer: 0,
                color: '#FF4444'
            });
        }
    }
    
    setupEventListeners() {
        this.keys = {};
        
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space') {
                e.preventDefault();
                this.dropBomb();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    update() {
        if (!this.gameRunning) return;
        
        this.handleInput();
        this.updateBombs();
        this.updateExplosions();
        this.updateEnemies();
        this.updatePowerups();
        this.checkCollisions();
        this.updateUI();
        
        // Check win condition
        if (this.enemies.length === 0) {
            this.nextLevel();
        }
    }
    
    handleInput() {
        const newPos = { x: this.player.x, y: this.player.y };
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            newPos.y--;
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            newPos.y++;
        }
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            newPos.x--;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            newPos.x++;
        }
        
        if (this.canMoveTo(newPos.x, newPos.y)) {
            this.player.x = newPos.x;
            this.player.y = newPos.y;
        }
    }
    
    canMoveTo(x, y) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
        if (this.map[y][x] === 1 || this.map[y][x] === 2) return false;
        
        // Check for bombs
        for (let bomb of this.bombs) {
            if (bomb.x === x && bomb.y === y) return false;
        }
        
        return true;
    }
    
    dropBomb() {
        if (this.bombs.length >= this.player.bombCount) return;
        
        // Check if there's already a bomb at player position
        for (let bomb of this.bombs) {
            if (bomb.x === this.player.x && bomb.y === this.player.y) return;
        }
        
        this.bombs.push({
            x: this.player.x,
            y: this.player.y,
            timer: 120, // 2 seconds at 60fps
            range: this.player.bombRange
        });
    }
    
    updateBombs() {
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            this.bombs[i].timer--;
            
            if (this.bombs[i].timer <= 0) {
                this.explodeBomb(this.bombs[i]);
                this.bombs.splice(i, 1);
            }
        }
    }
    
    explodeBomb(bomb) {
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }, // Left
            { x: 1, y: 0 }   // Right
        ];
        
        // Center explosion
        this.explosions.push({
            x: bomb.x,
            y: bomb.y,
            timer: 30
        });
        
        // Explosion in all directions
        for (let dir of directions) {
            for (let i = 1; i <= bomb.range; i++) {
                const x = bomb.x + dir.x * i;
                const y = bomb.y + dir.y * i;
                
                if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) break;
                if (this.map[y][x] === 1) break; // Hit solid wall
                
                this.explosions.push({
                    x: x,
                    y: y,
                    timer: 30
                });
                
                if (this.map[y][x] === 2) {
                    this.map[y][x] = 0; // Destroy breakable wall
                    this.score += 10;
                    
                    // Chance to spawn powerup
                    if (Math.random() < 0.3) {
                        this.powerups.push({
                            x: x,
                            y: y,
                            type: Math.random() < 0.5 ? 'bomb' : 'range',
                            color: Math.random() < 0.5 ? '#00FF00' : '#0080FF'
                        });
                    }
                    break;
                }
            }
        }
    }
    
    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].timer--;
            if (this.explosions[i].timer <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }
    
    updateEnemies() {
        for (let enemy of this.enemies) {
            enemy.moveTimer++;
            
            if (enemy.moveTimer >= 30) { // Move every 0.5 seconds
                enemy.moveTimer = 0;
                
                // Simple AI: try to move in current direction, otherwise pick random
                const directions = [
                    { x: 0, y: -1 }, // Up
                    { x: 0, y: 1 },  // Down
                    { x: -1, y: 0 }, // Left
                    { x: 1, y: 0 }   // Right
                ];
                
                let moved = false;
                const dir = directions[enemy.direction];
                const newX = enemy.x + dir.x;
                const newY = enemy.y + dir.y;
                
                if (this.canMoveTo(newX, newY)) {
                    enemy.x = newX;
                    enemy.y = newY;
                    moved = true;
                }
                
                if (!moved || Math.random() < 0.3) {
                    enemy.direction = Math.floor(Math.random() * 4);
                }
            }
        }
    }
    
    updatePowerups() {
        // Powerups don't need updating, just collision detection
    }
    
    checkCollisions() {
        // Check player-enemy collision
        for (let enemy of this.enemies) {
            if (enemy.x === this.player.x && enemy.y === this.player.y) {
                this.playerHit();
                return;
            }
        }
        
        // Check player-explosion collision
        for (let explosion of this.explosions) {
            if (explosion.x === this.player.x && explosion.y === this.player.y) {
                this.playerHit();
                return;
            }
        }
        
        // Check enemy-explosion collision
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            for (let explosion of this.explosions) {
                if (this.enemies[i].x === explosion.x && this.enemies[i].y === explosion.y) {
                    this.enemies.splice(i, 1);
                    this.score += 100;
                    this.changeBackgroundColor();
                    break;
                }
            }
        }
        
        // Check player-powerup collision
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            if (powerup.x === this.player.x && powerup.y === this.player.y) {
                if (powerup.type === 'bomb') {
                    this.player.bombCount++;
                } else if (powerup.type === 'range') {
                    this.player.bombRange++;
                }
                this.powerups.splice(i, 1);
                this.score += 50;
            }
        }
    }
    
    playerHit() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Reset player position
            this.player.x = 1;
            this.player.y = 1;
        }
    }
    
    nextLevel() {
        this.level++;
        this.score += 500;
        this.initializeLevel();
    }
    
    gameOver() {
        this.gameRunning = false;
        alert(`Game Over! Final Score: ${this.score}`);
    }
    
    restart() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameRunning = true;
        this.player.x = 1;
        this.player.y = 1;
        this.player.bombCount = 1;
        this.player.bombRange = 2;
        this.bombs = [];
        this.explosions = [];
        this.powerups = [];
        this.initializeLevel();
    }
    
    changeBackgroundColor() {
        this.currentBgIndex = (this.currentBgIndex + 1) % this.backgroundColors.length;
        document.body.style.background = `linear-gradient(135deg, ${this.backgroundColors[this.currentBgIndex]} 0%, ${this.backgroundColors[(this.currentBgIndex + 1) % this.backgroundColors.length]} 100%)`;
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
    }
    
    render() {
        // Clear canvas with current background color
        this.ctx.fillStyle = this.backgroundColors[this.currentBgIndex];
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw map
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = col * this.tileSize;
                const y = row * this.tileSize;
                
                if (this.map[row][col] === 1) {
                    // Solid wall
                    this.ctx.fillStyle = '#666';
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    this.ctx.fillStyle = '#888';
                    this.ctx.fillRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
                } else if (this.map[row][col] === 2) {
                    // Breakable wall
                    this.ctx.fillStyle = '#8B4513';
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                    this.ctx.fillStyle = '#A0522D';
                    this.ctx.fillRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
                }
            }
        }
        
        // Draw powerups
        for (let powerup of this.powerups) {
            const x = powerup.x * this.tileSize + this.tileSize / 4;
            const y = powerup.y * this.tileSize + this.tileSize / 4;
            
            this.ctx.fillStyle = powerup.color;
            this.ctx.fillRect(x, y, this.tileSize / 2, this.tileSize / 2);
        }
        
        // Draw bombs
        for (let bomb of this.bombs) {
            const x = bomb.x * this.tileSize + this.tileSize / 4;
            const y = bomb.y * this.tileSize + this.tileSize / 4;
            
            this.ctx.fillStyle = bomb.timer > 60 ? '#333' : '#666';
            this.ctx.beginPath();
            this.ctx.arc(x + this.tileSize / 4, y + this.tileSize / 4, this.tileSize / 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Fuse
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(x + this.tileSize / 4 - 2, y - 5, 4, 10);
        }
        
        // Draw explosions
        for (let explosion of this.explosions) {
            const x = explosion.x * this.tileSize;
            const y = explosion.y * this.tileSize;
            
            const alpha = explosion.timer / 30;
            this.ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`;
            this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
            
            this.ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            this.ctx.fillRect(x + 5, y + 5, this.tileSize - 10, this.tileSize - 10);
        }
        
        // Draw enemies
        for (let enemy of this.enemies) {
            const x = enemy.x * this.tileSize + 5;
            const y = enemy.y * this.tileSize + 5;
            
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(x, y, this.tileSize - 10, this.tileSize - 10);
            
            // Eyes
            this.ctx.fillStyle = '#FFF';
            this.ctx.fillRect(x + 5, y + 5, 6, 6);
            this.ctx.fillRect(x + 15, y + 5, 6, 6);
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(x + 7, y + 7, 2, 2);
            this.ctx.fillRect(x + 17, y + 7, 2, 2);
        }
        
        // Draw player
        const playerX = this.player.x * this.tileSize + 5;
        const playerY = this.player.y * this.tileSize + 5;
        
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(playerX, playerY, this.tileSize - 10, this.tileSize - 10);
        
        // Player face
        this.ctx.fillStyle = '#FFF';
        this.ctx.fillRect(playerX + 5, playerY + 5, 6, 6);
        this.ctx.fillRect(playerX + 15, playerY + 5, 6, 6);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(playerX + 7, playerY + 7, 2, 2);
        this.ctx.fillRect(playerX + 17, playerY + 7, 2, 2);
        
        // Smile
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(playerX + 15, playerY + 15, 8, 0, Math.PI);
        this.ctx.stroke();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game
const game = new BombermanGame();
