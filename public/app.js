// EmojiWorld Frontend Application

class EmojiWorldApp {
    constructor() {
        this.canvas = document.getElementById('world-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.sessionId = null;
        this.isRunning = false;
        this.tickInterval = null;
        this.speed = 5;
        
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.initializeControls();
        this.displayWelcome();
    }
    
    initializeControls() {
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('pause-btn').addEventListener('click', () => this.pause());
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        
        const speedControl = document.getElementById('speed');
        speedControl.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            document.getElementById('speed-value').textContent = `${this.speed}x`;
            if (this.isRunning) {
                this.pause();
                this.start();
            }
        });
    }
    
    displayWelcome() {
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#333';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🌍 Welcome to EmojiWorld!', this.canvas.width / 2, this.canvas.height / 2 - 20);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#666';
        this.ctx.fillText('Click "Start Simulation" to begin', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }
    
    async start() {
        try {
            if (!this.sessionId) {
                const response = await fetch('/api/world', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        width: 80,
                        height: 60,
                        citizenCount: 20
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || errorData.error || response.statusText;
                    throw new Error(`Failed to create world: ${errorMessage}`);
                }
                
                const data = await response.json();
                this.sessionId = data.sessionId;
                console.log('Session created:', this.sessionId);
            }
            
            this.isRunning = true;
            document.getElementById('start-btn').disabled = true;
            document.getElementById('pause-btn').disabled = false;
            
            this.tickInterval = setInterval(() => this.tick(), 1000 / this.speed);
        } catch (error) {
            console.error('Error starting simulation:', error);
            this.showError('Failed to start simulation', error.message);
        }
    }
    
    pause() {
        this.isRunning = false;
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }
    
    async reset() {
        this.pause();
        this.sessionId = null;
        this.displayWelcome();
        this.updateStats({ population: 0, resources: 0, landmarks: 0, ticks: 0, buildings: 0, births: 0, growthRate: 0 });
    }
    
    async tick() {
        try {
            const response = await fetch(`/api/world/${this.sessionId}/tick`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Tick error response:', errorData);
                
                // Handle session not found - attempt recovery
                if (response.status === 404 || errorData.errorCode === 'SESSION_NOT_FOUND') {
                    console.warn('Session lost, attempting recovery...');
                    this.sessionId = null;
                    this.pause();
                    
                    // Show error with recovery option
                    const shouldRecover = confirm(
                        'Session lost (server may have restarted).\n\n' + 
                        'This is common on serverless platforms like Vercel.\n\n' +
                        'Click OK to start a new simulation, or Cancel to stop.'
                    );
                    
                    if (shouldRecover) {
                        await this.start();
                    }
                    return;
                }
                
                // Handle other errors
                const errorMessage = errorData.message || errorData.error || response.statusText;
                throw new Error(`Tick failed: ${errorMessage}`);
            }
            
            const data = await response.json();
            
            // Log performance warnings
            if (data.executionTime && data.executionTime > 1000) {
                console.warn(`Slow tick: ${data.executionTime}ms`);
            }
            
            this.render(data);
            this.updateStats(data);
            this.updateActivityLog(data.events || []);
        } catch (error) {
            console.error('Error during tick:', error);
            this.pause();
            this.showError('Simulation Error', error.message + '\n\nPlease reset and try again.');
        }
    }
    
    render(worldData) {
        // Clear canvas
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!worldData || !worldData.grid) {
            return;
        }
        
        const cellWidth = this.canvas.width / worldData.width;
        const cellHeight = this.canvas.height / worldData.height;
        
        // Draw grid
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= worldData.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * cellWidth, 0);
            this.ctx.lineTo(x * cellWidth, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= worldData.height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * cellHeight);
            this.ctx.lineTo(this.canvas.width, y * cellHeight);
            this.ctx.stroke();
        }
        
        // Draw entities
        this.ctx.font = `${Math.min(cellWidth, cellHeight) * 0.8}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        worldData.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell && cell !== ' ') {
                    const centerX = x * cellWidth + cellWidth / 2;
                    const centerY = y * cellHeight + cellHeight / 2;
                    this.ctx.fillText(cell, centerX, centerY);
                }
            });
        });
        
        // Draw building indicators (if data available)
        if (worldData.buildingCitizens) {
            this.ctx.font = `${Math.min(cellWidth, cellHeight) * 0.5}px Arial`;
            worldData.buildingCitizens.forEach(pos => {
                const centerX = pos.x * cellWidth + cellWidth / 2;
                const centerY = pos.y * cellHeight + cellHeight / 2 - cellHeight * 0.3;
                this.ctx.fillText('🔨', centerX, centerY);
            });
        }
        
        // Draw breeding indicators (if data available)
        if (worldData.breedingCitizens) {
            this.ctx.font = `${Math.min(cellWidth, cellHeight) * 0.5}px Arial`;
            worldData.breedingCitizens.forEach(pos => {
                const centerX = pos.x * cellWidth + cellWidth / 2;
                const centerY = pos.y * cellHeight + cellHeight / 2 - cellHeight * 0.3;
                this.ctx.fillText('❤️', centerX, centerY);
            });
        }
    }
    
    updateStats(data) {
        document.getElementById('population').textContent = data.population || 0;
        document.getElementById('resources').textContent = data.resources || 0;
        document.getElementById('landmarks').textContent = data.landmarks || 0;
        document.getElementById('buildings').textContent = data.buildings || 0;
        document.getElementById('births').textContent = data.births || 0;
        document.getElementById('growth-rate').textContent = (data.growthRate || 0).toFixed(4);
        document.getElementById('ticks').textContent = data.ticks || 0;
    }
    
    showError(title, message) {
        // Use a more informative alert for now
        alert(`${title}\n\n${message}`);
    }
    
    updateActivityLog(events) {
        // Placeholder - will be implemented in Phase 2
        if (!events || events.length === 0) return;
        
        // Log events to console for now
        events.forEach(event => {
            console.log('Event:', event);
        });
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EmojiWorldApp();
});
