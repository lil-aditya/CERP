const db = require('better-sqlite3')('cerp.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(r => r.name).join(', '));
const c = db.prepare('SELECT COUNT(*) as c FROM email_match_rules').get();
console.log('Match rules count:', c.c);
const sample = db.prepare('SELECT emr.*, c.name as club FROM email_match_rules emr LEFT JOIN clubs c ON emr.club_id = c.id LIMIT 5').all();
console.log('Sample rules:', JSON.stringify(sample, null, 2));
db.close();
