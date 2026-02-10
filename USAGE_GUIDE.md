# Error Handling & Activity Log - Usage Guide

## Error Handling

### User Experience

#### Before
```
❌ Alert: "Simulation error occurred. Please reset and try again."
```

#### After
```
✅ Detailed error with recovery option:
"Session lost (server may have restarted).

This is common on serverless platforms like Vercel.

Click OK to start a new simulation, or Cancel to stop."
```

### Error Codes

All API errors now return structured JSON:

```json
{
  "error": "SESSION_NOT_FOUND",
  "message": "Session 'world-123-abc' not found. It may have expired or been cleared. Please create a new world.",
  "hint": "Sessions are stored in memory and cleared on server restarts or after cleanup.",
  "sessionId": "world-123-abc"
}
```

### Available Error Codes

| Code | Status | Description | User Action |
|------|--------|-------------|-------------|
| `SESSION_NOT_FOUND` | 404 | Session expired or doesn't exist | Automatic recovery prompt |
| `MISSING_SESSION` | 400 | No session ID provided | Check API call |
| `CREATE_FAILED` | 500 | World creation failed | Retry or check logs |
| `TICK_FAILED` | 500 | World tick operation failed | Reset simulation |
| `METHOD_NOT_ALLOWED` | 405 | Invalid HTTP method | Use correct method |

### Diagnostic Endpoint

Check session health:

```bash
GET /api/world/{sessionId}/status
```

Response:
```json
{
  "sessionId": "world-123-abc",
  "status": "active",
  "uptime": 45000,
  "lastAccessed": 1000,
  "stats": {
    "tick": 150,
    "citizens": 25,
    "resources": 12,
    "buildings": 8,
    "births": 5
  },
  "totalSessions": 3
}
```

---

## Activity Log

### Event Types

#### 1. Building Completion 🏗️

**Triggered when**: A citizen finishes building a structure

**Event data**:
```json
{
  "type": "building",
  "tick": 42,
  "data": {
    "building": "HOME",
    "symbol": "⌂",
    "position": { "x": 15, "y": 20 },
    "citizen": "🧑"
  }
}
```

**Displayed as**:
```
🏗️ New HOME
🧑 built a HOME ⌂ at (15, 20)
Tick 42
```

#### 2. Birth 👶

**Triggered when**: Two citizens reproduce

**Event data**:
```json
{
  "type": "birth",
  "tick": 67,
  "data": {
    "parents": ["👨", "👩"],
    "offspring": "🧒",
    "position": { "x": 25, "y": 18 }
  }
}
```

**Displayed as**:
```
👶 New Birth
👨 + 👩 → 🧒 at (25, 18)
Tick 67
```

#### 3. Government Formation 🏛️

**Triggered when**: 5+ citizens form a government around a town hall

**Event data**:
```json
{
  "type": "government",
  "tick": 120,
  "data": {
    "governmentId": "gov_1",
    "governmentName": "Government 1",
    "governmentType": "democracy",
    "citizens": 5,
    "location": { "x": 40, "y": 30 }
  }
}
```

**Displayed as**:
```
🏛️ Government Formed
Government 1 (democracy) with 5 citizens at (40, 30)
Tick 120
```

#### 4. Tax Collection 💰

**Triggered when**: Government collects taxes (every 100 ticks)

**Event data**:
```json
{
  "type": "tax",
  "tick": 200,
  "data": {
    "governmentId": "gov_1",
    "governmentName": "Government 1",
    "totalCollected": 15,
    "citizenCount": 8
  }
}
```

**Displayed as**:
```
💰 Tax Collection
Government 1 collected 15 resources from 8 citizens
Tick 200
```

#### 5. Rebellion ⚔️

**Triggered when**: A citizen rebels against their government

**Event data**:
```json
{
  "type": "rebellion",
  "tick": 250,
  "data": {
    "citizen": "🧑",
    "governmentId": "gov_1",
    "governmentName": "Government 1",
    "position": { "x": 45, "y": 35 }
  }
}
```

**Displayed as**:
```
⚔️ Rebellion!
🧑 rebelled against Government 1
Tick 250
```

---

## Performance

### Optimizations

1. **Event Limit**: Only last 100 events stored in memory
2. **DOM Limit**: Only last 100 events rendered to DOM
3. **Auto-scroll**: Scrolls to top to show latest events
4. **Efficient Updates**: Only new events are added to DOM

### Performance Monitoring

Backend tracks execution time:
```json
{
  "executionTime": 45,
  "ticks": 150
}
```

Warnings logged if execution time > 5000ms:
```
[Tick] Slow execution: 5234ms for session world-123-abc
```

---

## Responsive Design

### Desktop (> 768px)
- Sidebar: Fixed 300px width on the right
- Main content: Flexible width on the left
- Side-by-side layout

### Mobile (< 768px)
- Sidebar: Full width, stacked below main content
- Max height: 300px with scrolling
- Vertical layout

---

## Configuration

### Vercel Settings (vercel.json)

```json
{
  "functions": {
    "api/world.js": {
      "maxDuration": 60,    // 60 seconds
      "memory": 1024        // 1024 MB
    }
  }
}
```

### Activity Log Settings (app.js)

```javascript
this.maxLogEntries = 100;  // Max events to keep
```

To increase event history, modify:
```javascript
this.maxLogEntries = 200;  // Keep 200 events
```

---

## Browser Console

### Debug Information

Events are also logged to console:
```javascript
console.log('Event:', {
  type: 'building',
  tick: 42,
  data: {...}
});
```

### Error Details

Full error responses logged:
```javascript
console.error('Tick error response:', {
  error: 'SESSION_NOT_FOUND',
  message: '...',
  hint: '...'
});
```

### Performance Warnings

Slow ticks logged:
```javascript
console.warn('Slow tick: 1234ms');
```
