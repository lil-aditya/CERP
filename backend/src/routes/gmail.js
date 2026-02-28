const express = require('express');
const { authenticate } = require('../middleware/auth');
const gmailService = require('../services/gmailService');

const router = express.Router();

/**
 * GET /api/gmail/auth-url
 * Returns the Google OAuth consent URL. Frontend opens this in a new window.
 * Requires CERP auth (user must be logged in).
 */
router.get('/auth-url', authenticate, (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
      return res.status(503).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env' });
    }
    const url = gmailService.getAuthUrl(req.user.id);
    res.json({ url });
  } catch (err) {
    console.error('[Gmail] Auth URL error:', err.message);
    res.status(500).json({ error: 'Failed to generate auth URL.' });
  }
});

/**
 * GET /api/gmail/callback
 * Google redirects here after user consents. Exchanges code for tokens,
 * stores them, and redirects back to frontend.
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect('http://localhost:3000/preferences?gmail=error&reason=missing_params');
    }

    const userId = parseInt(state);
    if (!userId) {
      return res.redirect('http://localhost:3000/preferences?gmail=error&reason=invalid_state');
    }

    // Exchange code for tokens
    const tokens = await gmailService.exchangeCode(code);

    // Get the user's Gmail address
    const { google } = require('googleapis');
    const oauth2Client = gmailService.createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const gmailEmail = userInfo.data.email;

    // Store tokens in DB
    gmailService.storeTokens(userId, tokens, gmailEmail);

    console.log(`[Gmail] Connected for user ${userId}: ${gmailEmail}`);

    // Redirect back to frontend preferences page with success flag
    res.redirect(`http://localhost:3000/preferences?gmail=connected&email=${encodeURIComponent(gmailEmail)}`);
  } catch (err) {
    console.error('[Gmail] Callback error:', err.message);
    if (err.response?.data) {
      console.error('[Gmail] Google error details:', JSON.stringify(err.response.data));
    }
    console.error('[Gmail] Client ID used:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
    console.error('[Gmail] Redirect URI:', process.env.GOOGLE_REDIRECT_URI);
    res.redirect('http://localhost:3000/preferences?gmail=error&reason=token_exchange_failed');
  }
});

/**
 * GET /api/gmail/status
 * Check if current user has Gmail connected.
 */
router.get('/status', authenticate, (req, res) => {
  try {
    const status = gmailService.isGmailConnected(req.user.id);
    res.json(status);
  } catch (err) {
    console.error('[Gmail] Status error:', err.message);
    res.status(500).json({ error: 'Failed to check Gmail status.' });
  }
});

/**
 * POST /api/gmail/sync
 * Trigger a manual sync: fetch latest emails → categorize → store.
 */
router.post('/sync', authenticate, async (req, res) => {
  try {
    const status = gmailService.isGmailConnected(req.user.id);
    if (!status.connected) {
      return res.status(400).json({ error: 'Gmail not connected. Connect your Gmail first.' });
    }

    const maxResults = Math.min(parseInt(req.query.max) || 50, 100);
    const result = await gmailService.syncGmailEmails(req.user.id, maxResults);

    // Also re-categorize existing emails with the improved NLP engine
    let recategorized = 0;
    try {
      recategorized = gmailService.recategorizeAllEmails(req.user.id);
    } catch (e) { console.log('[Gmail] Recategorize during sync skipped:', e.message); }

    console.log(`[Gmail] Sync for user ${req.user.id}: ${result.fetched} fetched, ${result.categorized} new, ${recategorized} recategorized`);
    res.json({
      message: 'Sync complete.',
      fetched: result.fetched,
      new_emails: result.categorized,
      recategorized,
    });
  } catch (err) {
    console.error('[Gmail] Sync error:', err.message);
    if (err.message.includes('invalid_grant') || err.message.includes('Token has been expired')) {
      // Token expired and can't refresh — disconnect
      gmailService.disconnectGmail(req.user.id);
      return res.status(401).json({ error: 'Gmail session expired. Please reconnect.' });
    }
    res.status(500).json({ error: 'Failed to sync emails.' });
  }
});

/**
 * GET /api/gmail/emails
 * Get categorized emails for the current user.
 * Query params: category, club_id, preferred_only, limit
 */
router.get('/emails', authenticate, (req, res) => {
  try {
    const status = gmailService.isGmailConnected(req.user.id);
    if (!status.connected) {
      return res.status(400).json({ error: 'Gmail not connected.' });
    }

    const { category, club_id, preferred_only, limit } = req.query;
    const emails = gmailService.getCategorizedEmails(req.user.id, {
      category,
      club_id,
      preferred_only: preferred_only === 'true',
      limit: limit || 50,
    });

    res.json(emails);
  } catch (err) {
    console.error('[Gmail] Emails error:', err.message);
    res.status(500).json({ error: 'Failed to fetch emails.' });
  }
});

/**
 * GET /api/gmail/feed
 * Get preference-filtered emails (only from user's subscribed clubs).
 * This is the main endpoint for the dashboard/announcements integration.
 */
router.get('/feed', authenticate, (req, res) => {
  try {
    const status = gmailService.isGmailConnected(req.user.id);
    if (!status.connected) {
      return res.json([]); // silently return empty if not connected
    }

    const emails = gmailService.getCategorizedEmails(req.user.id, {
      preferred_only: true,
      limit: req.query.limit || 20,
    });

    res.json(emails);
  } catch (err) {
    console.error('[Gmail] Feed error:', err.message);
    res.json([]); // fail silently for feed
  }
});

/**
 * DELETE /api/gmail/disconnect
 * Disconnect Gmail — removes tokens and cached emails.
 */
router.delete('/disconnect', authenticate, (req, res) => {
  try {
    gmailService.disconnectGmail(req.user.id);
    console.log(`[Gmail] Disconnected for user ${req.user.id}`);
    res.json({ message: 'Gmail disconnected.' });
  } catch (err) {
    console.error('[Gmail] Disconnect error:', err.message);
    res.status(500).json({ error: 'Failed to disconnect Gmail.' });
  }
});

/**
 * POST /api/gmail/recategorize
 * Re-run NLP categorization on all cached emails (e.g. after preferences change).
 */
router.post('/recategorize', authenticate, (req, res) => {
  try {
    const status = gmailService.isGmailConnected(req.user.id);
    if (!status.connected) {
      return res.status(400).json({ error: 'Gmail not connected.' });
    }

    const updated = gmailService.recategorizeAllEmails(req.user.id);
    console.log(`[Gmail] Re-categorized ${updated} emails for user ${req.user.id}`);
    res.json({ message: 'Re-categorization complete.', updated });
  } catch (err) {
    console.error('[Gmail] Recategorize error:', err.message);
    res.status(500).json({ error: 'Failed to recategorize emails.' });
  }
});

module.exports = router;
