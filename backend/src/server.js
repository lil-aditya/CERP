const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const pool = require('./db/pool');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const clubRoutes = require('./routes/clubs');
const eventRoutes = require('./routes/events');
const researchRoutes = require('./routes/research');
const announcementRoutes = require('./routes/announcements');
const adminRoutes = require('./routes/admin');
const scraperRoutes = require('./routes/scraper');
const gmailRoutes = require('./routes/gmail');
const { scrapeAllResearch } = require('./scraper/researchScraper');
const { scrapeAllClubAnnouncements } = require('./scraper/clubScraper');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/gmail', gmailRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Scheduled scraping - every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('[CRON] Running scheduled scrape...');
  try {
    await scrapeAllResearch();
    await scrapeAllClubAnnouncements();
    console.log('[CRON] Scrape completed.');
  } catch (err) {
    console.error('[CRON] Scrape failed:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`CERP Backend running on http://localhost:${PORT}`);
});
