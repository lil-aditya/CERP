const axios = require('axios');
const cheerio = require('cheerio');
const pool = require('../db/pool');

/**
 * Scrape IIT Jodhpur faculty research publications.
 * This scraper targets the IIT Jodhpur people directory and Google Scholar profiles.
 * In production, you'd add more sophisticated parsing. This is a structured template
 * that demonstrates the scraping pipeline.
 */

// Scrape a professor's publications from their profile page or Google Scholar
async function scrapeProfessorPublications(professor) {
  const publications = [];

  try {
    // Attempt to scrape from the professor's profile page
    if (professor.profile_url) {
      console.log(`[Scraper] Fetching profile: ${professor.name} - ${professor.profile_url}`);
      const response = await axios.get(professor.profile_url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CERP Research Bot/1.0)' },
      });

      const $ = cheerio.load(response.data);

      // Try to find publication lists on the profile page
      // IIT Jodhpur faculty pages often have publication sections
      $('li, .publication, .pub-item, tr').each((i, el) => {
        const text = $(el).text().trim();
        // Heuristic: if a list item contains a year pattern and is long enough, it's likely a publication
        const yearMatch = text.match(/\b(20\d{2})\b/);
        if (yearMatch && text.length > 50 && text.length < 2000) {
          publications.push({
            title: text.substring(0, Math.min(text.length, 500)).replace(/\s+/g, ' '),
            authors: professor.name,
            publication_year: parseInt(yearMatch[1]),
            professor_id: professor.id,
          });
        }
      });
    }

    // If scholar_id is available, try Google Scholar (rate-limited)
    if (professor.scholar_id) {
      console.log(`[Scraper] Fetching Scholar: ${professor.name}`);
      const scholarUrl = `https://scholar.google.com/citations?user=${professor.scholar_id}&hl=en&sortby=pubdate`;
      try {
        const response = await axios.get(scholarUrl, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });

        const $ = cheerio.load(response.data);
        $('#gsc_a_b .gsc_a_tr').each((i, el) => {
          const title = $(el).find('.gsc_a_at').text().trim();
          const year = $(el).find('.gsc_a_y span').text().trim();
          const citations = $(el).find('.gsc_a_c a').text().trim();

          if (title) {
            publications.push({
              title,
              authors: professor.name,
              publication_year: parseInt(year) || null,
              citation_count: parseInt(citations) || 0,
              professor_id: professor.id,
            });
          }
        });
      } catch (scholarErr) {
        console.log(`[Scraper] Scholar fetch failed for ${professor.name}: ${scholarErr.message}`);
      }
    }
  } catch (err) {
    console.log(`[Scraper] Profile fetch failed for ${professor.name}: ${err.message}`);
  }

  return publications;
}

// Main function to scrape all professors' research
async function scrapeAllResearch() {
  console.log('[Research Scraper] Starting...');

  try {
    const result = await pool.query('SELECT * FROM professors');
    const professors = result.rows;

    let totalNew = 0;

    for (const professor of professors) {
      const publications = await scrapeProfessorPublications(professor);

      for (const pub of publications) {
        try {
          // Avoid duplicates by checking title similarity
          const existing = await pool.query(
            'SELECT id FROM publications WHERE title = $1 AND professor_id = $2',
            [pub.title, pub.professor_id]
          );

          if (existing.rows.length === 0) {
            await pool.query(
              `INSERT INTO publications (title, authors, publication_year, citation_count, professor_id, scraped_at) 
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
              [pub.title, pub.authors, pub.publication_year, pub.citation_count || 0, pub.professor_id]
            );
            totalNew++;
          }
        } catch (insertErr) {
          console.log(`[Scraper] Insert error: ${insertErr.message}`);
        }
      }

      // Rate limiting: wait between professors
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`[Research Scraper] Complete. ${totalNew} new publications added.`);
    return totalNew;
  } catch (err) {
    console.error('[Research Scraper] Error:', err.message);
    throw err;
  }
}

module.exports = { scrapeAllResearch, scrapeProfessorPublications };
