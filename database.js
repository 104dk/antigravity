const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { hashPassword } = require('./auth');

// Connect to SQLite database
const dbPath = path.resolve(__dirname, 'salon.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Clients Table
        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Appointments Table
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            service TEXT NOT NULL,
            date DATE NOT NULL,
            time TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            payment_method TEXT,
            amount REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES clients(id)
        )`, (err) => {
            if (!err) {
                // Check if 'time' column exists (for migration)
                db.all("PRAGMA table_info(appointments)", (err, rows) => {
                    if (!err) {
                        const hasTimeColumn = rows.some(r => r.name === 'time');
                        const hasPaymentMethod = rows.some(r => r.name === 'payment_method');
                        const hasAmount = rows.some(r => r.name === 'amount');

                        if (!hasTimeColumn) {
                            db.run("ALTER TABLE appointments ADD COLUMN time TEXT", (err) => {
                                if (err) console.error("Error adding time column:", err);
                                else console.log("Added 'time' column to appointments table.");
                            });
                        }
                        if (!hasPaymentMethod) {
                            db.run("ALTER TABLE appointments ADD COLUMN payment_method TEXT", (err) => {
                                if (err) console.error("Error adding payment_method column:", err);
                                else console.log("Added 'payment_method' column to appointments table.");
                            });
                        }
                        if (!hasAmount) {
                            db.run("ALTER TABLE appointments ADD COLUMN amount REAL", (err) => {
                                if (err) console.error("Error adding amount column:", err);
                                else console.log("Added 'amount' column to appointments table.");
                            });
                        }
                    }
                });
            }
        });

        // Messages Table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            recipient_count INTEGER
        )`);

        // Services Table
        db.run(`CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL,
            icon TEXT
        )`, (err) => {
            if (!err) {
                // Seed initial data if empty
                db.get("SELECT count(*) as count FROM services", (err, row) => {
                    if (!err && row.count === 0) {
                        const initialServices = [
                            { name: 'Corte & Estilo', description: 'Cortes personalizados que valorizam seu rosto e estilo de vida.', price: 120, icon: '✂️' },
                            { name: 'Coloração Premium', description: 'Técnicas avançadas de coloração para um visual vibrante e saudável.', price: 250, icon: '🎨' },
                            { name: 'Manicure & Pedicure', description: 'Cuidado completo para suas mãos e pés com produtos de alta qualidade.', price: 60, icon: '💅' },
                            { name: 'Tratamentos Capilares', description: 'Hidratação, reconstrução e tratamentos para revigorar seus fios.', price: 150, icon: '✨' }
                        ];

                        const stmt = db.prepare("INSERT INTO services (name, description, price, icon) VALUES (?, ?, ?, ?)");
                        initialServices.forEach(service => {
                            stmt.run(service.name, service.description, service.price, service.icon);
                        });
                        stmt.finalize();
                        console.log("Services seeded.");
                    }
                });
            }
        });

        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )`, async (err) => {
            if (!err) {
                // Seed default admin user if empty
                db.get("SELECT count(*) as count FROM users", async (err, row) => {
                    if (!err && row.count === 0) {
                        const defaultPassword = await hashPassword('admin');
                        db.run(
                            "INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
                            ['admin', defaultPassword, 'Administrador', 'admin'],
                            (err) => {
                                if (err) {
                                    console.error("Error creating default admin user:", err);
                                } else {
                                    console.log("Default admin user created (username: admin, password: admin)");
                                }
                            }
                        );
                    }
                });
            }
        });

        // Audit Logs Table
        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        console.log('Database tables initialized.');
    });
}

module.exports = db;
