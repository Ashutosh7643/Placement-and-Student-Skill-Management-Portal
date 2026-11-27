const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root if present
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { connectDatabase } = require('./config/database');
const createApp = require('./app');

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await connectDatabase();
    const app = createApp();

    const server = app.listen(PORT, () => {
      console.log('==========================================================');
      console.log('DBUU Placement and Student Skill Management Portal');
      console.log(`Frontend & Server URL : http://localhost:${PORT}`);
      console.log(`API Base URL          : http://localhost:${PORT}/api`);
      console.log('==========================================================');
    });

    server.on('error', (err) => {
      console.error('Failed to start HTTP server:', err.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('Server startup aborted because MongoDB is unavailable.');
    console.error('Details:', error.message);
    process.exit(1);
  }
}

startServer();
