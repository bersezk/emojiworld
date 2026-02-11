# Changelog

## [1.1.0] - 2024-02-11

### Added - Employment and Detention Statistics
- **Employment Tracking**: Display employed vs unemployed citizens in real-time
- **Police Force Statistics**: Track number of active police officers
- **Detention System**: Monitor number of detained/imprisoned citizens
- **Enhanced Stats Panel**: Added four new statistics to the web interface:
  - 👔 **Employed**: Number of citizens with active jobs
  - 🚫 **Unemployed**: Number of citizens without jobs
  - 👮 **Police Officers**: Number of active law enforcement officers
  - ⛓️ **Prisoners**: Number of detained citizens
- **Backend Integration**: Statistics computed from citizen employment status and crime system
- **Real-time Updates**: Employment and detention stats update every simulation tick
- **Job System Integration**: Employment stats reflect the job assignment system
- **Crime System Integration**: Detention stats reflect police arrests and imprisonment

### Added - Error Handling Improvements
- **Vercel Configuration**: Added function timeout (60s) and memory (1024MB) limits in `vercel.json`
- **Diagnostic Endpoint**: New `/api/world/:sessionId/status` endpoint to check session health and stats
- **Session Management**: Enhanced session tracking with `createdAt` and `lastAccessedAt` timestamps
- **Structured Error Responses**: All API errors now return consistent JSON with `errorCode`, `message`, and `hint` fields
- **Performance Monitoring**: Execution time tracking for tick operations with slow query warnings
- **Frontend Error Recovery**: Automatic session recovery on 404 errors with user confirmation dialog
- **Better Error Messages**: Users now see specific, actionable error messages instead of generic failures

### Added - Activity Log Feature
- **Real-time Event Tracking**: New sidebar showing simulation events as they happen
- **Event Types Tracked**:
  - 🏗️ **Building Completion**: When citizens finish constructing buildings
  - 👶 **Births**: When citizens reproduce with parent and offspring details
  - 🏛️ **Government Formation**: When new governments are established
  - 💰 **Tax Collection**: When governments collect taxes from citizens
  - ⚔️ **Rebellions**: When citizens rebel against their government
- **Event Details**: Each event shows relevant data (location, emojis, counts, tick number)
- **Auto-scrolling**: Log automatically scrolls to show latest events
- **Performance Optimized**: Limited to 100 most recent events
- **Responsive Design**: Sidebar adapts to mobile screens (stacks vertically)
- **Beautiful Styling**: Color-coded events with smooth animations

### Changed
- Session cleanup now uses LRU (Least Recently Used) strategy instead of FIFO
- Frontend now parses and displays detailed error information from backend
- Canvas and controls wrapped in `#main-content` container for better layout
- Statistics panel updated to work with new flexbox layout

### Technical Details
- **Backend**: Added `WorldEvent` interface and event tracking to `World.ts`
- **Frontend**: New `updateActivityLog()` and `createEventElement()` methods in `app.js`
- **Styling**: Added responsive flexbox layout for main content and sidebar
- **Build**: All TypeScript changes compile successfully
- **Security**: CodeQL scan passed with 0 vulnerabilities

### Error Codes Reference
- `MISSING_SESSION`: Session ID was not provided
- `SESSION_NOT_FOUND`: Session expired or doesn't exist (common on serverless platforms)
- `CREATE_FAILED`: World creation failed
- `TICK_FAILED`: World tick operation failed
- `METHOD_NOT_ALLOWED`: Invalid HTTP method used

### Migration Notes
No breaking changes. All existing functionality preserved. New features are additive.

### Known Issues
- Sessions stored in memory will be lost on server restarts (expected behavior on Vercel)
- Frontend will prompt for session recovery when this occurs
