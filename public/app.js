// EmojiWorld Frontend Application

class EmojiWorldApp {
    constructor() {
        this.canvas = document.getElementById('world-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.sessionId = null;
        this.isRunning = false;
        this.tickInterval = null;
        this.speed = 5;
        this.activityLog = [];
        this.maxLogEntries = 100;
        
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.initializeControls();
        this.displayWelcome();
        this.showEmptyActivityLog();
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
        this.activityLog = [];
        this.clearActivityLog();
        this.displayWelcome();
        this.updateStats({ population: 0, resources: 0, landmarks: 0, ticks: 0, buildings: 0, births: 0, growthRate: 0, employed: 0, unemployed: 0, police: 0, prisoners: 0 });
    }
    
    async tick() {
        try {
            const response = await fetch(`/api/world/${this.sessionId}/tick`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Tick error response:', errorData);
                
                // Handle session not found or expired - attempt recovery
                if (response.status === 404 || 
                    errorData.errorCode === 'SESSION_NOT_FOUND' || 
                    errorData.errorCode === 'SESSION_EXPIRED' ||
                    errorData.errorCode === 'SESSION_CORRUPTED') {
                    
                    console.warn(`Session issue: ${errorData.errorCode}, attempting recovery...`);
                    this.sessionId = null;
                    this.pause();
                    
                    let message = 'Session lost (server may have restarted).\n\n';
                    
                    if (errorData.errorCode === 'SESSION_EXPIRED') {
                        message = 'Session expired due to inactivity.\n\n';
                    } else if (errorData.errorCode === 'SESSION_CORRUPTED') {
                        message = 'Session data was corrupted.\n\n';
                    }
                    
                    message += 'This is common on serverless platforms like Vercel.\n\n' +
                               'Click OK to start a new simulation, or Cancel to stop.';
                    
                    // Show error with recovery option
                    const shouldRecover = confirm(message);
                    
                    if (shouldRecover) {
                        await this.start();
                    }
                    return;
                }
                
                // Handle other errors with retry logic for transient errors
                if (response.status >= 500 && response.status < 600) {
                    // Server error - might be transient
                    console.warn('Server error detected, will retry on next tick');
                    // Don't stop simulation, just skip this tick
                    return;
                }
                
                // Handle other errors
                const errorMessage = errorData.message || errorData.error || response.statusText;
                const errorDetails = errorData.details || '';
                const errorHint = errorData.hint || '';
                
                throw new Error(`Tick failed: ${errorMessage}\n${errorDetails}\n${errorHint}`);
            }
            
            const data = await response.json();
            
            // Check for warning about recovered state
            if (data.warning === 'RECOVERED_FROM_ERROR') {
                console.warn('Simulation recovered from error using cached state:', data.warningMessage);
                // Show a brief notification but continue running
                if (data.errorDetails) {
                    console.error('Original error:', data.errorDetails);
                }
            }
            
            // Log performance warnings
            if (data.executionTime && data.executionTime > 1000) {
                console.warn(`Slow tick: ${data.executionTime}ms at tick ${data.ticks || data.tick || '?'}`);
            }
            
            this.render(data);
            this.updateStats(data);
            this.updateActivityLog(data.events || []);
        } catch (error) {
            console.error('Error during tick:', error);
            this.pause();
            
            // Parse error message for better display
            let errorTitle = 'Simulation Error';
            let errorMessage = error.message;
            
            if (error.message.includes('Failed to fetch')) {
                errorTitle = 'Network Error';
                errorMessage = 'Unable to connect to the server.\n\nPlease check your internet connection and try again.';
            } else if (error.message.includes('TICK_FAILED')) {
                errorTitle = 'Simulation Error';
                errorMessage += '\n\nThe simulation encountered an internal error.\nPlease reset and try again.';
            }
            
            this.showError(errorTitle, errorMessage);
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
        document.getElementById('employed').textContent = data.employed || 0;
        document.getElementById('unemployed').textContent = data.unemployed || 0;
        document.getElementById('police').textContent = data.police || 0;
        document.getElementById('prisoners').textContent = data.prisoners || 0;
        document.getElementById('ticks').textContent = data.ticks || 0;
    }
    
    showError(title, message) {
        // Use a more informative alert for now
        alert(`${title}\n\n${message}`);
    }
    
    updateActivityLog(events) {
        if (!events || events.length === 0) return;
        
        const logContainer = document.getElementById('activity-log');
        
        // Remove empty state if it exists
        const emptyState = logContainer.querySelector('.activity-log-empty');
        if (emptyState) {
            emptyState.remove();
        }
        
        events.forEach(event => {
            // Add to log array
            this.activityLog.push(event);
            
            // Keep only last maxLogEntries
            if (this.activityLog.length > this.maxLogEntries) {
                this.activityLog.shift();
            }
            
            // Create event element
            const eventElement = this.createEventElement(event);
            
            // Add to top of log
            logContainer.insertBefore(eventElement, logContainer.firstChild);
            
            // Remove old entries from DOM
            while (logContainer.children.length > this.maxLogEntries) {
                logContainer.removeChild(logContainer.lastChild);
            }
        });
        
        // Auto-scroll to top to show latest events
        logContainer.scrollTop = 0;
    }
    
    createEventElement(event) {
        const eventDiv = document.createElement('div');
        eventDiv.className = `activity-event ${event.type}`;
        
        let icon = '';
        let title = '';
        let details = '';
        
        switch(event.type) {
            case 'building':
                icon = '🏗️';
                title = `New ${event.data.building}`;
                details = `${event.data.citizen} built a ${event.data.building} ${event.data.symbol} at (${event.data.position.x}, ${event.data.position.y})`;
                break;
                
            case 'birth':
                icon = '👶';
                title = 'New Birth';
                details = `${event.data.parents[0]} + ${event.data.parents[1]} → ${event.data.offspring} at (${event.data.position.x}, ${event.data.position.y})`;
                break;
                
            case 'government':
                icon = '🏛️';
                title = 'Government Formed';
                details = `${event.data.governmentName} (${event.data.governmentType}) with ${event.data.citizens} citizens at (${event.data.location.x}, ${event.data.location.y})`;
                break;
                
            case 'tax':
                icon = '💰';
                title = 'Tax Collection';
                details = `${event.data.governmentName} collected ${event.data.totalCollected} resources from ${event.data.citizenCount} citizens`;
                break;
                
            case 'rebellion':
                icon = '⚔️';
                title = 'Rebellion!';
                details = `${event.data.citizen} rebelled against ${event.data.governmentName}`;
                break;
                
            default:
                icon = '📌';
                title = 'Event';
                details = JSON.stringify(event.data);
        }
        
        eventDiv.innerHTML = `
            <div class="activity-event-header">
                <span class="activity-event-icon">${icon}</span>
                <span>${title}</span>
            </div>
            <div class="activity-event-details">${details}</div>
            <div class="activity-event-time">Tick ${event.tick}</div>
        `;
        
        return eventDiv;
    }
    
    clearActivityLog() {
        const logContainer = document.getElementById('activity-log');
        logContainer.innerHTML = '';
        this.showEmptyActivityLog();
    }
    
    showEmptyActivityLog() {
        const logContainer = document.getElementById('activity-log');
        logContainer.innerHTML = `
            <div class="activity-log-empty">
                <div class="activity-log-empty-icon">📋</div>
                <div class="activity-log-empty-title">No Activity Yet</div>
                <div class="activity-log-empty-subtitle">Start the simulation to see events like building construction, births, government formation, and more!</div>
            </div>
        `;
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EmojiWorldApp();
});
