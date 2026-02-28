const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'cerp.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function seed() {
  try {
    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
    console.log('Schema created successfully.');

    // Clear old data for fresh seed (preserve users and gmail_tokens)
    db.exec(`
      DELETE FROM email_match_rules;
      DELETE FROM gmail_emails;
      DELETE FROM announcements;
      DELETE FROM events;
      DELETE FROM publications;
      DELETE FROM professor_domains;
      DELETE FROM professors;
      DELETE FROM user_clubs;
      DELETE FROM user_domains;
      DELETE FROM clubs;
      DELETE FROM domains;
    `);
    console.log('Old data cleared (users & gmail tokens preserved).');

    // Reset AUTOINCREMENT for clubs so IDs are predictable
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('clubs', 'domains', 'professors', 'events', 'announcements', 'publications', 'email_match_rules');`);

    // Seed Super Admin
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@CERP2026';
    const hash = bcrypt.hashSync(superAdminPassword, 12);
    db.prepare(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES (?, ?, ?, ?) 
       ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role`
    ).run('Super Admin', process.env.SUPERADMIN_EMAIL || 'superadmin@iitj.ac.in', hash, 'superadmin');
    console.log('Super Admin seeded.');

    // Seed sample admin
    const adminHash = bcrypt.hashSync('Admin@CERP2026', 12);
    db.prepare(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES (?, ?, ?, ?) 
       ON CONFLICT (email) DO NOTHING`
    ).run('Admin User', 'admin@iitj.ac.in', adminHash, 'admin');
    console.log('Admin user seeded.');

    // Seed Domains (IIT Jodhpur relevant)
    const domains = [
      ['Artificial Intelligence', 'AI and Machine Learning research'],
      ['Computer Vision', 'Image processing and visual computing'],
      ['Natural Language Processing', 'Text and language understanding'],
      ['Cybersecurity', 'Network and information security'],
      ['Data Science', 'Data analytics and big data'],
      ['Robotics', 'Robotics and autonomous systems'],
      ['VLSI Design', 'Very Large Scale Integration and chip design'],
      ['Signal Processing', 'Digital and analog signal processing'],
      ['Renewable Energy', 'Solar, wind and sustainable energy systems'],
      ['Structural Engineering', 'Civil and structural engineering'],
      ['Bioinformatics', 'Computational biology and genomics'],
      ['Quantum Computing', 'Quantum information and computation'],
      ['IoT', 'Internet of Things and embedded systems'],
      ['Computational Mathematics', 'Numerical methods and mathematical modeling'],
      ['Materials Science', 'Advanced materials and nanotechnology'],
    ];

    const insertDomain = db.prepare(
      `INSERT INTO domains (name, description) VALUES (?, ?) ON CONFLICT (name) DO NOTHING`
    );
    for (const [name, desc] of domains) {
      insertDomain.run(name, desc);
    }
    console.log('Domains seeded.');

    // Seed Clubs (IIT Jodhpur — Real club names and boards)
    const clubs = [
      // Board of Co-curricular Activity — Technical
      ['Robotics Society', 'Building and programming robots, drones, and autonomous systems', 'https://iitj.ac.in/clubs/robotics', null, 'Technical'],
      ['PClub', 'Competitive programming, software development and open source', 'https://pclub-iitj.github.io/', null, 'Technical'],
      ['RAID', 'AI, Machine Learning, Deep Learning and Data Science', 'https://iitj.ac.in/clubs/raid', null, 'Technical'],
      ['Nexus', 'Astronomy, stargazing and space science', 'https://iitj.ac.in/clubs/nexus', null, 'Science'],
      ['GDSC IIT Jodhpur', 'Google Developer Student Clubs — workshops, hackathons and tech talks', 'https://gdsc.community.dev/iit-jodhpur/', null, 'Technical'],
      ['Devlup Labs', 'Open source development, web and app projects', 'https://devluplabs.tech/', null, 'Technical'],
      ['Boltheads', 'Electronics, circuits, embedded systems and hardware hacking', 'https://iitj.ac.in/clubs/boltheads', null, 'Technical'],
      ['Quiz Society', 'Quizzing, trivia events and general knowledge', 'https://iitj.ac.in/clubs/quiz', null, 'Cultural'],
      ['Pheme', 'Public speaking, oratory and communication skills', 'https://iitj.ac.in/clubs/pheme', null, 'Cultural'],
      ['LitSoc', 'Debates, creative writing, poetry and literary events', 'https://iitj.ac.in/clubs/litsoc', null, 'Cultural'],
      // Board of Art and Culture
      ['Dramebaaz', 'Theatre, street plays, acting and performing arts', 'https://iitj.ac.in/clubs/dramebaaz', null, 'Cultural'],
      ['Ateliers', 'Sketching, painting, art walks and visual arts', 'https://iitj.ac.in/clubs/ateliers', null, 'Creative'],
      ['Raw', 'Music production, audio engineering and sound design', 'https://iitj.ac.in/clubs/raw', null, 'Cultural'],
      ['Sangam', 'Cultural society — music, dance and cultural events', 'https://iitj.ac.in/clubs/sangam', null, 'Cultural'],
      ['Designerds', 'UI/UX, graphic design and design thinking', 'https://iitj.ac.in/clubs/designerds', null, 'Creative'],
      ['Framex', 'Filmmaking, photography and visual storytelling', 'https://iitj.ac.in/clubs/framex', null, 'Creative'],
      ['The Groove Theory', 'Dance — classical, western, hip hop and freestyle', 'https://iitj.ac.in/clubs/groovetheory', null, 'Cultural'],
      ['Inside', 'Campus journalism, media coverage and newsletters', 'https://iitj.ac.in/clubs/inside', null, 'Cultural'],
      // Professional
      ['E-Cell', 'Startup culture, entrepreneurship and business ideas', 'https://ecell-iitj.org/', null, 'Professional'],
      ['Quant Club', 'Quantitative finance, stock markets, trading and economics', 'https://iitj.ac.in/clubs/quant', null, 'Professional'],
      // Board of Student Sports
      ['Sports Council', 'Athletics, inter-IIT sports and fitness activities', 'https://iitj.ac.in/sports', null, 'Sports'],
      ['Cricket Society', 'Cricket team, matches and tournaments', null, null, 'Sports'],
      ['Basketball Society', 'Basketball team and tournaments', null, null, 'Sports'],
      ['Football Society', 'Football team and tournaments', null, null, 'Sports'],
      ['Badminton Society', 'Badminton team and tournaments', null, null, 'Sports'],
      ['Hockey Society', 'Hockey team and tournaments', null, null, 'Sports'],
      ['Chess Society', 'Chess club, strategy and tournaments', null, null, 'Sports'],
      ['Volleyball Society', 'Volleyball team and tournaments', null, null, 'Sports'],
      ['Lawn Tennis Society', 'Tennis team and tournaments', null, null, 'Sports'],
      ['Table Tennis Society', 'Table tennis team and tournaments', null, null, 'Sports'],
      ['Athletic Society', 'Track & field, marathon and athletics', null, null, 'Sports'],
      ['Kabaddi Society', 'Kabaddi team and tournaments', null, null, 'Sports'],
      ['Squash Society', 'Squash courts and tournaments', null, null, 'Sports'],
      ['E-Sports Society', 'Competitive gaming, Valorant, CS2 and esports', null, null, 'Sports'],
      ['Weightlifting Society', 'Weightlifting, powerlifting and strength training', null, null, 'Sports'],
      ['Self Defence Club', 'Martial arts, karate and self defence training', null, null, 'Sports'],
    ];

    const insertClub = db.prepare(
      `INSERT INTO clubs (name, description, website_url, logo_url, category) 
       VALUES (?, ?, ?, ?, ?) ON CONFLICT (name) DO NOTHING`
    );
    for (const [name, desc, url, logo, category] of clubs) {
      insertClub.run(name, desc, url, logo, category);
    }
    console.log('Clubs seeded.');

    // Seed sample professors (IIT Jodhpur CS department)
    const professors = [
      ['Dr. Anand Mishra', 'Computer Science', 'anand.mishra@iitj.ac.in', 'https://iitj.ac.in/~anand.mishra', null],
      ['Dr. Sumit Kalra', 'Computer Science', 'sumit.kalra@iitj.ac.in', 'https://iitj.ac.in/~sumit.kalra', null],
      ['Dr. Suchetana Chakraborty', 'Computer Science', 'suchetana@iitj.ac.in', 'https://iitj.ac.in/~suchetana', null],
      ['Dr. Ravi Bhandari', 'Electrical Engineering', 'ravi.bhandari@iitj.ac.in', 'https://iitj.ac.in/~ravi.bhandari', null],
      ['Dr. Anil Kumar Tiwari', 'Electrical Engineering', 'akt@iitj.ac.in', 'https://iitj.ac.in/~akt', null],
      ['Dr. Deepak Mishra', 'Computer Science', 'deepak.mishra@iitj.ac.in', 'https://iitj.ac.in/~deepak.mishra', null],
    ];

    const insertProf = db.prepare(
      `INSERT OR IGNORE INTO professors (name, department, email, profile_url, scholar_id) 
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const [name, dept, email, profile, scholar] of professors) {
      insertProf.run(name, dept, email, profile, scholar);
    }
    console.log('Professors seeded.');

    // Seed sample events (club_ids based on new club order above)
    // 1=Robotics, 2=PClub, 3=RAID, 4=Nexus, 5=GDSC, 6=Devlup, 7=Boltheads
    // 8=Quiz, 9=Pheme, 10=LitSoc, 11=Dramebaaz, 12=Ateliers, 13=Raw, 14=Sangam
    // 15=Designerds, 16=Framex, 17=Groove Theory, 18=Inside, 19=E-Cell, 20=Quant
    // 21=Sports Council, 22=Cricket, 23=Basketball, ...
    const events = [
      ['The Insomniac Hackathon', '24-hour onsite devfest by PClub', '2026-03-15 09:00:00', '2026-03-16 09:00:00', 'Lecture Hall Complex', 2, 'Technical', 0],
      ['RAID AI Workshop', 'Hands-on workshop on deep learning with PyTorch', '2026-03-20 14:00:00', '2026-03-20 17:00:00', 'CS Department Lab', 3, 'Technical', 0],
      ['Convocation 2026', 'Annual convocation ceremony', '2026-04-10 10:00:00', '2026-04-10 14:00:00', 'Central Auditorium', null, 'Academic', 1],
      ['Aaftab - Cultural Fest', 'Annual cultural festival featuring Sangam, Dramebaaz, and more', '2026-03-25 18:00:00', '2026-03-27 23:00:00', 'Open Air Theatre', 14, 'Cultural', 0],
      ['Research Symposium', 'Inter-departmental research showcase', '2026-04-05 09:00:00', '2026-04-05 17:00:00', 'Conference Hall', null, 'Academic', 1],
      ['Robowar - Robotics Competition', 'Line follower and combat bot challenge', '2026-03-18 10:00:00', '2026-03-18 16:00:00', 'Robotics Lab', 1, 'Technical', 0],
      ['Framex Photo Exhibition', 'Showcasing the best campus photography', '2026-04-01 11:00:00', '2026-04-03 18:00:00', 'Art Gallery', 16, 'Creative', 0],
      ['E-Cell Startup Pitch Night', 'Present your startup ideas to investors', '2026-03-22 19:00:00', '2026-03-22 22:00:00', 'Seminar Hall', 19, 'Professional', 0],
      ['Nexus Stargazing Night', 'Telescope observation and constellation mapping', '2026-03-10 21:00:00', '2026-03-10 23:59:00', 'Hostel Terrace', 4, 'Science', 0],
      ['GDSC Devfest', 'Google technologies workshop — Flutter, Firebase, Cloud', '2026-03-28 10:00:00', '2026-03-28 18:00:00', 'LHC 101', 5, 'Technical', 0],
    ];

    const insertEvent = db.prepare(
      `INSERT INTO events (title, description, event_date, end_date, location, club_id, category, is_university_event, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    );
    for (const [title, desc, date, end, location, club_id, category, is_uni] of events) {
      insertEvent.run(title, desc, date, end, location, club_id, category, is_uni);
    }
    console.log('Events seeded.');

    // Seed sample announcements
    const announcements = [
      ['Registrations Open for The Insomniac Hackathon', 'Register now at PClub website. Last date: March 10.', null, 2, '2026-03-01'],
      ['RAID Weekly Meetup', 'This week we discuss transformer architectures and LLMs. All are welcome!', null, 3, '2026-02-28'],
      ['Robotics Society Recruitment', 'Looking for new members! No prior experience required.', null, 1, '2026-02-25'],
      ['LitSoc - Poetry Slam', 'Open mic poetry event this Friday at 6 PM in OAT.', null, 10, '2026-02-27'],
      ['E-Cell Startup Bootcamp', '3-day bootcamp on building your first startup. Free entry.', null, 19, '2026-02-26'],
      ['Cricket Society Trials', 'Cricket team selection trials on March 5 at the Sports Complex.', null, 22, '2026-02-28'],
      ['Nexus Astronomy Night', 'Join us for stargazing this Saturday at 9 PM.', null, 4, '2026-02-27'],
      ['GDSC Flutter Workshop', 'Learn to build mobile apps with Flutter. Bring your laptop!', null, 5, '2026-02-26'],
    ];

    const insertAnnouncement = db.prepare(
      `INSERT INTO announcements (title, content, source_url, club_id, published_at) 
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const [title, content, url, club_id, pub_date] of announcements) {
      insertAnnouncement.run(title, content, url, club_id, pub_date);
    }
    console.log('Announcements seeded.');

    // Seed sample publications
    const publications = [
      ['Deep Learning for Visual Question Answering', 'Anand Mishra et al.', 'A survey of VQA methods using deep learning.', 'IEEE TPAMI', 2024, 45, null, null, 1, 1],
      ['Secure Multi-party Computation in IoT', 'Sumit Kalra et al.', 'Novel protocols for IoT security.', 'ACM Computing Surveys', 2023, 32, null, null, 2, 4],
      ['Network Traffic Analysis using ML', 'Suchetana Chakraborty et al.', 'ML-based approach to network anomaly detection.', 'Computer Networks', 2024, 28, null, null, 3, 4],
      ['VLSI Design for Low-Power Systems', 'Ravi Bhandari et al.', 'New architectures for energy-efficient VLSI.', 'IEEE Trans. VLSI Systems', 2023, 19, null, null, 4, 7],
      ['Signal Processing in Biomedical Imaging', 'Anil Kumar Tiwari et al.', 'Advanced signal processing for MRI analysis.', 'Medical Image Analysis', 2024, 37, null, null, 5, 8],
      ['Reinforcement Learning for Robotics', 'Deepak Mishra et al.', 'RL algorithms for autonomous navigation.', 'ICRA', 2024, 52, null, null, 6, 6],
      ['Transformer Models for NLP', 'Anand Mishra et al.', 'Efficient transformer variants for NLP tasks.', 'ACL', 2025, 15, null, null, 1, 3],
      ['Quantum Algorithms for Optimization', 'Sumit Kalra et al.', 'Quantum computing approaches to combinatorial problems.', 'Nature Quantum', 2025, 8, null, null, 2, 12],
    ];

    const insertPub = db.prepare(
      `INSERT INTO publications (title, authors, abstract, journal, publication_year, citation_count, url, doi, professor_id, domain_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const [title, authors, abstract_text, journal, year, citations, url, doi, prof_id, domain_id] of publications) {
      insertPub.run(title, authors, abstract_text, journal, year, citations, url, doi, prof_id, domain_id);
    }
    console.log('Publications seeded.');

    // Seed email matching rules (club_ids match the club insert order above)
    // 1=Robotics, 2=PClub, 3=RAID, 4=Nexus, 5=GDSC, 6=Devlup, 7=Boltheads
    // 8=Quiz, 9=Pheme, 10=LitSoc, 11=Dramebaaz, 12=Ateliers, 13=Raw, 14=Sangam
    // 15=Designerds, 16=Framex, 17=Groove Theory, 18=Inside, 19=E-Cell, 20=Quant
    // 21=Sports Council
    const emailRules = [
      // PClub (id=2)
      [2, 'sender', 'pclub@iitj.ac.in'],
      [2, 'sender', 'programmingclub@iitj.ac.in'],
      [2, 'sender', 'codingclub@'],
      [2, 'keyword', 'hackathon'],
      [2, 'keyword', 'coding competition'],
      [2, 'keyword', 'competitive programming'],
      [2, 'keyword', 'codeforces'],
      [2, 'keyword', 'leetcode'],
      [2, 'keyword', 'github'],
      [2, 'keyword', 'open source'],
      [2, 'keyword', 'web development'],
      [2, 'keyword', 'app development'],
      [2, 'keyword', 'pclub'],
      [2, 'keyword', 'insomniac'],
      [2, 'keyword', 'devfest'],
      // RAID — AI Club (id=3)
      [3, 'sender', 'raid@iitj.ac.in'],
      [3, 'sender', 'aiclub@iitj.ac.in'],
      [3, 'keyword', 'machine learning'],
      [3, 'keyword', 'deep learning'],
      [3, 'keyword', 'artificial intelligence'],
      [3, 'keyword', 'neural network'],
      [3, 'keyword', 'computer vision'],
      [3, 'keyword', 'kaggle'],
      [3, 'keyword', 'data science'],
      [3, 'keyword', 'raid'],
      [3, 'keyword', 'tensorflow'],
      [3, 'keyword', 'pytorch'],
      [3, 'keyword', 'llm'],
      // Robotics Society (id=1)
      [1, 'sender', 'robotics@iitj.ac.in'],
      [1, 'keyword', 'robotics'],
      [1, 'keyword', 'line follower'],
      [1, 'keyword', 'arduino'],
      [1, 'keyword', 'drone'],
      [1, 'keyword', 'embedded systems'],
      [1, 'keyword', 'iot'],
      [1, 'keyword', 'ros'],
      [1, 'keyword', 'robowar'],
      // Nexus — Astronomy (id=4)
      [4, 'sender', 'nexus@iitj.ac.in'],
      [4, 'sender', 'astronomy@iitj.ac.in'],
      [4, 'keyword', 'stargazing'],
      [4, 'keyword', 'telescope'],
      [4, 'keyword', 'astronomy'],
      [4, 'keyword', 'night sky'],
      [4, 'keyword', 'constellation'],
      [4, 'keyword', 'nexus'],
      // GDSC (id=5)
      [5, 'sender', 'gdsc@iitj.ac.in'],
      [5, 'keyword', 'gdsc'],
      [5, 'keyword', 'google developer'],
      [5, 'keyword', 'flutter'],
      [5, 'keyword', 'firebase'],
      [5, 'keyword', 'google cloud'],
      // Devlup Labs (id=6)
      [6, 'sender', 'devlup@iitj.ac.in'],
      [6, 'keyword', 'devlup'],
      [6, 'keyword', 'open source project'],
      // Boltheads (id=7)
      [7, 'sender', 'boltheads@iitj.ac.in'],
      [7, 'keyword', 'boltheads'],
      [7, 'keyword', 'circuit'],
      [7, 'keyword', 'soldering'],
      [7, 'keyword', 'pcb design'],
      // Quiz Society (id=8)
      [8, 'sender', 'quiz@iitj.ac.in'],
      [8, 'keyword', 'quiz'],
      [8, 'keyword', 'trivia'],
      [8, 'keyword', 'general knowledge'],
      // Pheme (id=9)
      [9, 'sender', 'pheme@iitj.ac.in'],
      [9, 'keyword', 'pheme'],
      [9, 'keyword', 'public speaking'],
      [9, 'keyword', 'oratory'],
      [9, 'keyword', 'mun'],
      // LitSoc (id=10)
      [10, 'sender', 'litsoc@iitj.ac.in'],
      [10, 'keyword', 'debate'],
      [10, 'keyword', 'creative writing'],
      [10, 'keyword', 'poetry'],
      [10, 'keyword', 'litsoc'],
      [10, 'keyword', 'spoken word'],
      // Dramebaaz (id=11)
      [11, 'sender', 'dramebaaz@iitj.ac.in'],
      [11, 'keyword', 'theatre'],
      [11, 'keyword', 'drama'],
      [11, 'keyword', 'nukkad natak'],
      [11, 'keyword', 'dramebaaz'],
      [11, 'keyword', 'audition'],
      [11, 'keyword', 'stage play'],
      // Ateliers (id=12)
      [12, 'sender', 'ateliers@iitj.ac.in'],
      [12, 'keyword', 'ateliers'],
      [12, 'keyword', 'sketch walk'],
      [12, 'keyword', 'painting'],
      [12, 'keyword', 'art exhibition'],
      // Raw (id=13)
      [13, 'sender', 'raw@iitj.ac.in'],
      [13, 'keyword', 'music production'],
      [13, 'keyword', 'audio engineering'],
      [13, 'keyword', 'raw music'],
      // Sangam (id=14)
      [14, 'sender', 'sangam@iitj.ac.in'],
      [14, 'keyword', 'sangam'],
      [14, 'keyword', 'jam session'],
      [14, 'keyword', 'open mic'],
      [14, 'keyword', 'battle of bands'],
      [14, 'keyword', 'concert'],
      [14, 'keyword', 'singing'],
      [14, 'keyword', 'music night'],
      // Designerds (id=15)
      [15, 'sender', 'designerds@iitj.ac.in'],
      [15, 'keyword', 'designerds'],
      [15, 'keyword', 'ui/ux'],
      [15, 'keyword', 'figma'],
      [15, 'keyword', 'design thinking'],
      [15, 'keyword', 'graphic design'],
      // Framex (id=16)
      [16, 'sender', 'framex@iitj.ac.in'],
      [16, 'keyword', 'framex'],
      [16, 'keyword', 'photography walk'],
      [16, 'keyword', 'photo exhibition'],
      [16, 'keyword', 'filmmaking'],
      [16, 'keyword', 'short film'],
      [16, 'keyword', 'photowalk'],
      // Groove Theory (id=17)
      [17, 'sender', 'groovetheory@iitj.ac.in'],
      [17, 'keyword', 'groove theory'],
      [17, 'keyword', 'dance'],
      [17, 'keyword', 'hip hop'],
      [17, 'keyword', 'choreography'],
      // Inside (id=18)
      [18, 'sender', 'inside@iitj.ac.in'],
      [18, 'keyword', 'inside iitj'],
      [18, 'keyword', 'campus news'],
      [18, 'keyword', 'newsletter'],
      // E-Cell (id=19)
      [19, 'sender', 'ecell@iitj.ac.in'],
      [19, 'keyword', 'startup'],
      [19, 'keyword', 'entrepreneurship'],
      [19, 'keyword', 'pitch night'],
      [19, 'keyword', 'investor'],
      [19, 'keyword', 'e-cell'],
      [19, 'keyword', 'e-summit'],
      // Quant Club (id=20)
      [20, 'sender', 'quant@iitj.ac.in'],
      [20, 'keyword', 'trading'],
      [20, 'keyword', 'stock market'],
      [20, 'keyword', 'quant club'],
      [20, 'keyword', 'finance workshop'],
      [20, 'keyword', 'portfolio'],
      // Sports Council (id=21)
      [21, 'sender', 'sports@iitj.ac.in'],
      [21, 'keyword', 'inter-iit'],
      [21, 'keyword', 'sports fest'],
      [21, 'keyword', 'spardha'],
      // General IIT Jodhpur
      [null, 'sender', 'dean@iitj.ac.in'],
      [null, 'sender', 'registrar@iitj.ac.in'],
      [null, 'sender', 'academic@iitj.ac.in'],
      [null, 'keyword', 'convocation'],
      [null, 'keyword', 'semester registration'],
      [null, 'keyword', 'examination'],
    ];

    const insertRule = db.prepare(
      `INSERT INTO email_match_rules (club_id, rule_type, pattern) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`
    );
    for (const [clubId, ruleType, pattern] of emailRules) {
      insertRule.run(clubId, ruleType, pattern);
    }
    console.log('Email match rules seeded.');

    console.log('\n=== SEED COMPLETE ===');
    console.log('Super Admin Credentials:');
    console.log(`  Email: ${process.env.SUPERADMIN_EMAIL || 'superadmin@iitj.ac.in'}`);
    console.log(`  Password: ${superAdminPassword}`);
    console.log(`  Role: superadmin`);
    console.log('=====================\n');

  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    db.close();
  }
}

seed();
