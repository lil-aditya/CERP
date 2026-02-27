require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();
  try {
    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('Schema created successfully.');

    // Seed Super Admin
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@CERP2026';
    const hash = await bcrypt.hash(superAdminPassword, 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO UPDATE SET password_hash = $3, role = $4`,
      ['Super Admin', process.env.SUPERADMIN_EMAIL || 'superadmin@iitj.ac.in', hash, 'superadmin']
    );
    console.log('Super Admin seeded.');

    // Seed sample admin
    const adminHash = await bcrypt.hash('Admin@CERP2026', 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO NOTHING`,
      ['Admin User', 'admin@iitj.ac.in', adminHash, 'admin']
    );
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

    for (const [name, desc] of domains) {
      await client.query(
        `INSERT INTO domains (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [name, desc]
      );
    }
    console.log('Domains seeded.');

    // Seed Clubs (IIT Jodhpur clubs)
    const clubs = [
      ['Robotics Club', 'Building and programming robots', 'https://iitj.ac.in/clubs/robotics', null, 'Technical'],
      ['Programming Club', 'Competitive programming and software development', 'https://iitj.ac.in/clubs/programming', null, 'Technical'],
      ['AI Club', 'Artificial Intelligence and ML enthusiasts', 'https://iitj.ac.in/clubs/ai', null, 'Technical'],
      ['Astronomy Club', 'Stargazing and space science', 'https://iitj.ac.in/clubs/astronomy', null, 'Science'],
      ['Music Club', 'Musical performances and jam sessions', 'https://iitj.ac.in/clubs/music', null, 'Cultural'],
      ['Drama Club', 'Theatre and performing arts', 'https://iitj.ac.in/clubs/drama', null, 'Cultural'],
      ['Literary Club', 'Debates, quizzes and creative writing', 'https://iitj.ac.in/clubs/literary', null, 'Cultural'],
      ['Sports Club', 'Athletics and sports activities', 'https://iitj.ac.in/clubs/sports', null, 'Sports'],
      ['Photography Club', 'Photography walks and exhibitions', 'https://iitj.ac.in/clubs/photography', null, 'Creative'],
      ['Entrepreneurship Cell', 'Startup culture and business ideas', 'https://iitj.ac.in/clubs/ecell', null, 'Professional'],
      ['Finance Club', 'Stock markets, finance and economics', 'https://iitj.ac.in/clubs/finance', null, 'Professional'],
      ['Design Club', 'UI/UX and graphic design', 'https://iitj.ac.in/clubs/design', null, 'Creative'],
    ];

    for (const [name, desc, url, logo, category] of clubs) {
      await client.query(
        `INSERT INTO clubs (name, description, website_url, logo_url, category) 
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING`,
        [name, desc, url, logo, category]
      );
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

    for (const [name, dept, email, profile, scholar] of professors) {
      await client.query(
        `INSERT INTO professors (name, department, email, profile_url, scholar_id) 
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [name, dept, email, profile, scholar]
      );
    }
    console.log('Professors seeded.');

    // Seed sample events
    const events = [
      ['Hackathon 2026', 'Annual 24-hour coding hackathon', '2026-03-15 09:00:00', '2026-03-16 09:00:00', 'Lecture Hall Complex', 2, 'Technical', false],
      ['AI Workshop', 'Hands-on workshop on deep learning', '2026-03-20 14:00:00', '2026-03-20 17:00:00', 'CS Department Lab', 3, 'Technical', false],
      ['Convocation 2026', 'Annual convocation ceremony', '2026-04-10 10:00:00', '2026-04-10 14:00:00', 'Central Auditorium', null, 'Academic', true],
      ['Cultural Fest - Aaftab', 'Annual cultural festival', '2026-03-25 18:00:00', '2026-03-27 23:00:00', 'Open Air Theatre', 5, 'Cultural', false],
      ['Research Symposium', 'Inter-departmental research showcase', '2026-04-05 09:00:00', '2026-04-05 17:00:00', 'Conference Hall', null, 'Academic', true],
      ['Robotics Competition', 'Line follower and maze solver challenge', '2026-03-18 10:00:00', '2026-03-18 16:00:00', 'Robotics Lab', 1, 'Technical', false],
      ['Photography Exhibition', 'Showcasing the best campus photos', '2026-04-01 11:00:00', '2026-04-03 18:00:00', 'Art Gallery', 9, 'Creative', false],
      ['Startup Pitch Night', 'Present your startup ideas to investors', '2026-03-22 19:00:00', '2026-03-22 22:00:00', 'Seminar Hall', 10, 'Professional', false],
    ];

    for (const [title, desc, date, end, location, club_id, category, is_uni] of events) {
      await client.query(
        `INSERT INTO events (title, description, event_date, end_date, location, club_id, category, is_university_event, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)`,
        [title, desc, date, end, location, club_id, category, is_uni]
      );
    }
    console.log('Events seeded.');

    // Seed sample announcements
    const announcements = [
      ['Registrations Open for Hackathon 2026', 'Register now at our website. Last date: March 10.', null, 2, '2026-03-01'],
      ['AI Club Weekly Meetup', 'This week we discuss transformer architectures. All are welcome!', null, 3, '2026-02-28'],
      ['Robotics Club Recruitment', 'Looking for new members! No prior experience required.', null, 1, '2026-02-25'],
      ['Literary Club - Poetry Slam', 'Open mic poetry event this Friday at 6 PM.', null, 7, '2026-02-27'],
      ['E-Cell Startup Bootcamp', '3-day bootcamp on building your first startup. Free entry.', null, 10, '2026-02-26'],
      ['Sports Club Cricket Trials', 'Cricket team selection trials on March 5.', null, 8, '2026-02-28'],
    ];

    for (const [title, content, url, club_id, pub_date] of announcements) {
      await client.query(
        `INSERT INTO announcements (title, content, source_url, club_id, published_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [title, content, url, club_id, pub_date]
      );
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

    for (const [title, authors, abstract_text, journal, year, citations, url, doi, prof_id, domain_id] of publications) {
      await client.query(
        `INSERT INTO publications (title, authors, abstract, journal, publication_year, citation_count, url, doi, professor_id, domain_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [title, authors, abstract_text, journal, year, citations, url, doi, prof_id, domain_id]
      );
    }
    console.log('Publications seeded.');

    console.log('\n=== SEED COMPLETE ===');
    console.log('Super Admin Credentials:');
    console.log(`  Email: ${process.env.SUPERADMIN_EMAIL || 'superadmin@iitj.ac.in'}`);
    console.log(`  Password: ${superAdminPassword}`);
    console.log(`  Role: superadmin`);
    console.log('=====================\n');

  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
