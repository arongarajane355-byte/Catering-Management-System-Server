const app = require('./src/app');
const { initDb } = require('./src/config/db');
const { initWorkflowDb } = require('./src/config/workflowDb');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Initialize Database & Start Server
initDb()
  .then(() => initWorkflowDb())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
