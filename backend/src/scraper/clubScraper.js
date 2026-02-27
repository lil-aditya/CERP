const axios = require('axios');
const cheerio = require('cheerio');
const pool = require('../db/pool');

/**
 * Scrape club announcements from club websites.
 * This scraper fetches pages from each club's website and extracts 
 * announcements, news, and updates.
 */

async function scrapeClubPage(club) {
  const announcements = [];

  if (!club.website_url) return announcements;

  try {
    console.log(`[Club Scraper] Fetching: ${club.name} - ${club.website_url}`);
    const response = await axios.get(club.website_url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CERP Club Bot/1.0)' },
    });

    const $ = cheerio.load(response.data);

    // Look for announcement/news/event sections
    const selectors = [
      'article', '.announcement', '.news-item', '.event-item',
      '.post', '.update', '.card', '.blog-post', '.entry',
    ];

    for (const selector of selectors) {
      $(selector).each((i, el) => {
        const title = $(el).find('h1, h2, h3, h4, .title, .heading').first().text().trim();
        const content = $(el).find('p, .content, .description, .excerpt').first().text().trim();
        const link = $(el).find('a').first().attr('href');

        if (title && title.length > 5 && title.length < 500) {
          announcements.push({
            title,
            content: content.substring(0, 2000) || null,
            source_url: link ? new URL(link, club.website_url).href : club.website_url,
            club_id: club.id,
            published_at: new Date().toISOString(),
          });
        }
      });
    }

    // Fallback: look for any headings with adjacent content
    if (announcements.length === 0) {
      $('h2, h3').each((i, el) => {
        const title = $(el).text().trim();
        const content = $(el).next('p').text().trim();
        if (title && title.length > 5 && title.length < 300) {
          announcements.push({
            title,
            content: content || null,
            source_url: club.website_url,
            club_id: club.id,
            published_at: new Date().toISOString(),
          });
        }
      });
    }
  } catch (err) {
    console.log(`[Club Scraper] Failed for ${club.name}: ${err.message}`);
  }

  return announcements;
}

async function scrapeAllClubAnnouncements() {
  console.log('[Club Scraper] Starting...');

  try {
    const result = await pool.query('SELECT * FROM clubs WHERE website_url IS NOT NULL');
    const clubs = result.rows;

    let totalNew = 0;

    for (const club of clubs) {
      const announcements = await scrapeClubPage(club);

      for (const ann of announcements) {
        try {
          // Avoid duplicates
          const existing = await pool.query(
            'SELECT id FROM announcements WHERE title = $1 AND club_id = $2',
            [ann.title, ann.club_id]
          );

          if (existing.rows.length === 0) {
            await pool.query(
              `INSERT INTO announcements (title, content, source_url, club_id, published_at, scraped_at) 
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
              [ann.title, ann.content, ann.source_url, ann.club_id, ann.published_at]
            );
            totalNew++;
          }
        } catch (insertErr) {
          console.log(`[Club Scraper] Insert error: ${insertErr.message}`);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`[Club Scraper] Complete. ${totalNew} new announcements added.`);
    return totalNew;
  } catch (err) {
    console.error('[Club Scraper] Error:', err.message);
    throw err;
  }
}

module.exports = { scrapeAllClubAnnouncements, scrapeClubPage };
