const { scrapeAllResearch } = require('./researchScraper');
const { scrapeAllClubAnnouncements } = require('./clubScraper');

// Run both scrapers standalone
async function runAll() {
  console.log('=== CERP Scraper ===');
  console.log('Starting full scrape...\n');

  try {
    const researchCount = await scrapeAllResearch();
    console.log(`Research: ${researchCount} new publications.\n`);
  } catch (err) {
    console.error('Research scraper failed:', err.message);
  }

  try {
    const clubCount = await scrapeAllClubAnnouncements();
    console.log(`Clubs: ${clubCount} new announcements.\n`);
  } catch (err) {
    console.error('Club scraper failed:', err.message);
  }

  console.log('=== Scrape Complete ===');
  process.exit(0);
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  runAll();
}

module.exports = { runAll };
