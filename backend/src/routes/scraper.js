const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { scrapeAllResearch } = require('../scraper/researchScraper');
const { scrapeAllClubAnnouncements } = require('../scraper/clubScraper');

const router = express.Router();

// POST /api/scraper/run - Trigger manual scrape (admin/superadmin)
router.post('/run', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { type } = req.body; // 'research', 'clubs', or 'all'

    if (type === 'research') {
      await scrapeAllResearch();
      return res.json({ message: 'Research scraping completed.' });
    }
    if (type === 'clubs') {
      await scrapeAllClubAnnouncements();
      return res.json({ message: 'Club announcements scraping completed.' });
    }

    // Default: scrape all
    await scrapeAllResearch();
    await scrapeAllClubAnnouncements();
    res.json({ message: 'Full scraping completed.' });
  } catch (err) {
    console.error('Scraper error:', err);
    res.status(500).json({ error: 'Scraping failed: ' + err.message });
  }
});

module.exports = router;
