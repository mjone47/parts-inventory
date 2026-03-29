import type Database from 'better-sqlite3';

export function seedDatabase(db: Database.Database): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return; // Already has data
  }

  // Only create a default admin user so the app is usable
  const insertUser = db.prepare('INSERT INTO users (id, name, email, role, avatar) VALUES (?, ?, ?, ?, ?)');
  insertUser.run('u-001-admin', 'Admin', 'admin@company.com', 'admin', null);

  console.log('Database initialized with default admin user.');
}
