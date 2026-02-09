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
        this.showWelcomeAnimation();
    }

    showWelcomeAnimation() {
        // Draw welcome screen on canvas
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = 'bold 48px sans-serif';
        this.ctx.fillStyle = '#667eea';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🌍 EmojiWorld', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        this.ctx.font = '24px sans-serif';
        this.ctx.fillStyle = '#a78bfa';
        this.ctx.fillText('Click "Start Simulation" to begin', this.canvas.width / 2, this.canvas.height / 2 + 20);
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
        const maxWidth = container.clientWidth - 60;
        if (this.canvas.width > maxWidth) {
            this.canvas.style.width = maxWidth + 'px';
            this.canvas.style.height = 'auto';
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    async start() {
        if (this.running) return;
        
        this.showLoading(true);
        
        try {
            if (!this.sessionId) {
                // Initialize new world
                const response = await fetch('/api/world', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                
                if (!response.ok) {
                    throw new Error('Failed to create world');
                }
                
                const data = await response.json();
                this.sessionId = data.sessionId;
            }

            this.running = true;
            document.getElementById('start-btn').disabled = true;
            document.getElementById('pause-btn').disabled = false;

            this.intervalId = setInterval(() => this.tick(), this.tickRate);
            
            // Hide loading after first tick
            setTimeout(() => this.showLoading(false), 500);
        } catch (error) {
            console.error('Error starting simulation:', error);
            this.showLoading(false);
            this.showError('Failed to start simulation. Please try again.');
        }
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
        
        // Show loading
        this.showLoading(true);
        
        // Clear canvas with animation
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Reset stats with animation
        this.animateStatReset('tick-count', 0);
        this.animateStatReset('citizen-count', 0);
        this.animateStatReset('resource-count', 0);
        this.animateStatReset('collected-count', 0);
        
        setTimeout(() => {
            this.showWelcomeAnimation();
            this.showLoading(false);
        }, 300);
    }

    animateStatReset(elementId, targetValue) {
        const element = document.getElementById(elementId);
        const currentValue = parseInt(element.textContent) || 0;
        const duration = 300;
        const steps = 10;
        const stepValue = (currentValue - targetValue) / steps;
        let step = 0;
        
        const animate = () => {
            step++;
            const newValue = Math.round(currentValue - (stepValue * step));
            element.textContent = Math.max(targetValue, newValue);
            
            if (step < steps) {
                setTimeout(animate, duration / steps);
            }
        };
        
        animate();
    }

    async tick() {
        if (!this.sessionId || !this.running) return;

        try {
            const response = await fetch(`/api/world/${this.sessionId}/tick`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Tick failed: ' + response.statusText);
            }

            const worldState = await response.json();
            this.render(worldState);
            this.updateStats(worldState.stats);
        } catch (error) {
            console.error('Error during tick:', error);
            this.pause();
            this.showError('Simulation error. Please reset and try again.');
        }
    }

    render(worldState) {
        const { grid, citizens, resources, landmarks } = worldState;
        
        // Clear canvas
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid lines (subtle)
        this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < grid.width; x += 5) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, grid.height * this.cellSize);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < grid.height; y += 5) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(grid.width * this.cellSize, y * this.cellSize);
            this.ctx.stroke();
        }

        // Set font for rendering
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Render landmarks with glow
        landmarks.forEach(landmark => {
            this.renderEntityWithGlow(landmark.position, landmark.character, '#888888', 3);
        });

        // Render resources with glow
        resources.forEach(resource => {
            if (!resource.collected) {
                this.renderEntityWithGlow(resource.position, resource.character, '#4CAF50', 5);
            }
        });

        // Render citizens with stronger glow
        citizens.forEach(citizen => {
            this.renderEntityWithGlow(citizen.position, citizen.emoji, '#FFFFFF', 8);
        });
    }

    renderEntityWithGlow(position, character, color, glowSize) {
        const x = position.x * this.cellSize + this.cellSize / 2;
        const y = position.y * this.cellSize + this.cellSize / 2;
        
        // Add glow effect
        if (glowSize > 0) {
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = glowSize;
        }
        
        this.ctx.fillStyle = color;
        this.ctx.fillText(character, x, y);
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
    }

    updateStats(stats) {
        this.animateStatUpdate('tick-count', stats.tick);
        this.animateStatUpdate('citizen-count', stats.citizens);
        this.animateStatUpdate('resource-count', stats.resources);
        this.animateStatUpdate('collected-count', stats.resourcesCollected);
    }

    animateStatUpdate(elementId, newValue) {
        const element = document.getElementById(elementId);
        const oldValue = parseInt(element.textContent) || 0;
        
        if (oldValue !== newValue) {
            element.style.transform = 'scale(1.2)';
            element.textContent = newValue;
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
        }
    }

    showError(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 2000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        notification.innerHTML = `
            <strong>⚠️ Error</strong><br>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    .stat-value {
        transition: transform 0.2s ease;
    }
`;
document.head.appendChild(style);

// Initialize client when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EmojiWorldClient();
});
