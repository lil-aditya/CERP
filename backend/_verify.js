const db = require('./src/db/pool');

// Check tables
const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").rows;
console.log('=== TABLES ===');
console.log(tables.map(t => t.name).join(', '));

// Check clubs
const clubs = db.query('SELECT id, name FROM clubs ORDER BY id').rows;
console.log('\n=== CLUBS (' + clubs.length + ') ===');
clubs.forEach(c => console.log('  ' + c.id + '. ' + c.name));

// Check email match rules
const rules = db.query('SELECT COUNT(*) as cnt FROM email_match_rules').rows[0];
console.log('\n=== EMAIL MATCH RULES: ' + rules.cnt + ' ===');

// Check users
const users = db.query('SELECT id, name, email, role FROM users').rows;
console.log('\n=== USERS ===');
users.forEach(u => console.log('  ' + u.id + '. ' + u.name + ' (' + u.email + ') [' + u.role + ']'));

// Check gmail tables exist
const gmailTokens = db.query('SELECT COUNT(*) as cnt FROM gmail_tokens').rows[0];
const gmailEmails = db.query('SELECT COUNT(*) as cnt FROM gmail_emails').rows[0];
console.log('\n=== GMAIL DATA ===');
console.log('  Tokens:', gmailTokens.cnt);
console.log('  Emails:', gmailEmails.cnt);

// Check events
const events = db.query('SELECT COUNT(*) as cnt FROM events').rows[0];
console.log('\n=== EVENTS: ' + events.cnt + ' ===');

// Check announcements
const ann = db.query('SELECT COUNT(*) as cnt FROM announcements').rows[0];
console.log('=== ANNOUNCEMENTS: ' + ann.cnt + ' ===');

console.log('\n✅ Database verification complete!');
