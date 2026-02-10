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
    
    showErrorNotification(message) {
        // Create a temporary overlay notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 5000);
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
                
                // Try to get response body for detailed error info
                const contentType = response.headers.get('content-type');
                let data;
                
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    data = { message: text };
                }
                
                if (!response.ok) {
                    const errorMsg = data.message || `Failed to create world: ${response.statusText}`;
                    const errorDetail = data.detail || '';
                    const errorAction = data.action || 'Please check if the API is running and try again.';
                    
                    throw new Error(`${errorMsg}\n${errorDetail}\n${errorAction}`);
                }
                
                this.sessionId = data.sessionId;
                console.log('Session created:', this.sessionId);
            }
            
            this.isRunning = true;
            document.getElementById('start-btn').disabled = true;
            document.getElementById('pause-btn').disabled = false;
            
            this.tickInterval = setInterval(() => this.tick(), 1000 / this.speed);
        } catch (error) {
            console.error('Error starting simulation:', error);
            alert(error.message || 'Failed to start simulation. Please check if the API is running.');
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
            
            // Try to get response body for detailed error info
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // Fallback for non-JSON responses
                const text = await response.text();
                data = { message: text };
            }
            
            if (!response.ok) {
                // Handle different error scenarios
                if (response.status === 404) {
                    // Session not found - attempt recovery
                    console.warn('Session not found, attempting recovery...', data);
                    this.pause();
                    
                    const errorMsg = data.message || 'Session not found';
                    const errorDetail = data.detail || 'The session may have expired due to serverless cold start.';
                    const shouldRecover = confirm(`${errorMsg}\n\n${errorDetail}\n\nWould you like to start a new simulation?`);
                    
                    if (shouldRecover) {
                        await this.reset();
                        await this.start();
                    }
                    return;
                } else if (response.status >= 500 && response.status < 600) {
                    // Server error - could be transient, try to continue but warn user
                    console.error('Server error during tick:', data);
                    
                    const errorMsg = data.message || 'Server error occurred';
                    const errorDetail = data.detail || 'This may be a temporary issue.';
                    
                    // Don't stop simulation for transient errors, just log
                    console.warn(`Continuing simulation despite error: ${errorMsg} - ${errorDetail}`);
                    
                    // Show a less intrusive notification
                    this.showErrorNotification(`${errorMsg}. Attempting to continue...`);
                    return;
                }
                
                // Other errors - show detailed message and stop
                const errorMsg = data.message || `Tick failed: ${response.statusText}`;
                const errorDetail = data.detail || '';
                const errorAction = data.action || 'Please reset and try again.';
                
                throw new Error(`${errorMsg}\n${errorDetail}\n${errorAction}`);
            }
            
            this.render(data);
            this.updateStats(data);
        } catch (error) {
            console.error('Error during tick:', error);
            this.pause();
            
            // Show detailed error message
            alert(error.message || 'Simulation error occurred. Please reset and try again.');
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
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EmojiWorldApp();
});
