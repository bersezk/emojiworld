// Client-side simulation manager
class EmojiWorldClient {
    constructor() {
        this.canvas = document.getElementById('world-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.running = false;
        this.intervalId = null;
        this.sessionId = null;
        this.tickRate = 200;
        this.cellSize = 16;
        
        this.setupEventListeners();
        this.resizeCanvas();
    }

    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('pause-btn').addEventListener('click', () => this.pause());
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        
        const speedSlider = document.getElementById('speed-slider');
        speedSlider.addEventListener('input', (e) => {
            this.tickRate = parseInt(e.target.value);
            document.getElementById('speed-value').textContent = `${this.tickRate}ms`;
            if (this.running) {
                this.pause();
                this.start();
            }
        });

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const maxWidth = container.clientWidth - 40;
        if (this.canvas.width > maxWidth) {
            this.canvas.style.width = maxWidth + 'px';
            this.canvas.style.height = 'auto';
        }
    }

    async start() {
        if (this.running) return;
        
        if (!this.sessionId) {
            // Initialize new world
            const response = await fetch('/api/world', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await response.json();
            this.sessionId = data.sessionId;
        }

        this.running = true;
        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;

        this.intervalId = setInterval(() => this.tick(), this.tickRate);
    }

    pause() {
        this.running = false;
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    async reset() {
        this.pause();
        this.sessionId = null;
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Reset stats
        document.getElementById('tick-count').textContent = '0';
        document.getElementById('citizen-count').textContent = '0';
        document.getElementById('resource-count').textContent = '0';
        document.getElementById('collected-count').textContent = '0';
    }

    async tick() {
        if (!this.sessionId || !this.running) return;

        try {
            const response = await fetch(`/api/world/${this.sessionId}/tick`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                console.error('Tick failed:', response.statusText);
                this.pause();
                return;
            }

            const worldState = await response.json();
            this.render(worldState);
            this.updateStats(worldState.stats);
        } catch (error) {
            console.error('Error during tick:', error);
            this.pause();
        }
    }

    render(worldState) {
        const { grid, citizens, resources, landmarks } = worldState;
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Set font for rendering
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Render landmarks
        landmarks.forEach(landmark => {
            this.renderEntity(landmark.position, landmark.character, '#888');
        });

        // Render resources
        resources.forEach(resource => {
            if (!resource.collected) {
                this.renderEntity(resource.position, resource.character, '#4CAF50');
            }
        });

        // Render citizens
        citizens.forEach(citizen => {
            this.renderEntity(citizen.position, citizen.emoji, '#FFF');
        });
    }

    renderEntity(position, character, color) {
        const x = position.x * this.cellSize + this.cellSize / 2;
        const y = position.y * this.cellSize + this.cellSize / 2;
        
        this.ctx.fillStyle = color;
        this.ctx.fillText(character, x, y);
    }

    updateStats(stats) {
        document.getElementById('tick-count').textContent = stats.tick;
        document.getElementById('citizen-count').textContent = stats.citizens;
        document.getElementById('resource-count').textContent = stats.resources;
        document.getElementById('collected-count').textContent = stats.resourcesCollected;
    }
}

// Initialize client when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EmojiWorldClient();
});
