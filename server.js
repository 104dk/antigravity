const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const { hashPassword, verifyPassword, generateToken, authenticateToken, requireAdmin } = require('./auth');
const { createBackup, listBackups, scheduleBackups } = require('./backup');

const app = express();
const PORT = 3000;

// Security Middlewares
app.use(helmet()); // Basic security headers

// General Rate Limit (apply to all requests)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: 'Muitas requisições, por favor tente novamente mais tarde.' }
});
app.use('/api', generalLimiter);

// Strict Rate Limit for Login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per window
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files with security restriction
const allowedExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico'];
app.use((req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    // Allow root (index.html), directories, and explicitly allowed extensions
    if (req.path === '/' || !ext || allowedExtensions.includes(ext)) {
        return next();
    }
    // Deny access to anything else (like .db, .js server files, .json)
    res.status(403).send('Acesso Negado');
});
app.use(express.static(path.join(__dirname))); 

// --- Helpers ---
function isValidPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    // Brazilian phones have 10 (fixed) or 11 (mobile) digits
    if (cleanPhone.length < 10 || cleanPhone.length > 11) return false;

    // DDD must be between 11 and 99
    const ddd = parseInt(cleanPhone.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;

    // If mobile (11 digits), the 3rd digit (index 2) must be 9
    if (cleanPhone.length === 11 && cleanPhone[2] !== '9') return false;

    return true;
}

function logAudit(userId, action, details, req) {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'system';
    db.run(
        'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
        [userId, action, details, ip],
        (err) => {
            if (err) console.error('Error recording audit log:', err.message);
        }
    );
}

// API Routes

// Initialize automatic backups
scheduleBackups();

// Create Appointment
app.post('/api/appointments', (req, res) => {
    const { name, phone, service, date, time, payment_method, amount } = req.body;

    if (!name || !phone || !service || !date || !time) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    if (!isValidPhone(phone)) {
        return res.status(400).json({ error: 'Número de telefone inválido. Use um formato brasileiro válido.' });
    }

    // Check for conflicts
    db.get('SELECT id FROM appointments WHERE date = ? AND time = ?', [date, time], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (row) {
            return res.status(409).json({ error: 'Horário indisponível. Por favor, escolha outro.' });
        }

        // Check if client exists, otherwise create
        db.get('SELECT id FROM clients WHERE phone = ?', [phone], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (row) {
                // Client exists, create appointment
                createAppointment(row.id, service, date, time, payment_method, amount, res);
            } else {
                // Create new client
                db.run('INSERT INTO clients (name, phone) VALUES (?, ?)', [name, phone], function (err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    // Client created, create appointment
                    createAppointment(this.lastID, service, date, time, payment_method, amount, res);
                });
            }
        });
    });
});

function createAppointment(clientId, service, date, time, payment_method, amount, res) {
    db.run('INSERT INTO appointments (client_id, service, date, time, payment_method, amount) VALUES (?, ?, ?, ?, ?, ?)',
        [clientId, service, date, time, payment_method, amount],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({
                message: 'Agendamento realizado com sucesso!',
                appointmentId: this.lastID
            });
        }
    );
}

// Get Availability
app.get('/api/availability', (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ error: 'Data é obrigatória' });
    }

    const allSlots = [
        "09:00", "10:00", "11:00", "12:00",
        "13:00", "14:00", "15:00", "16:00",
        "17:00", "18:00"
    ];

    db.all('SELECT time FROM appointments WHERE date = ?', [date], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const bookedTimes = rows.map(row => row.time);
        const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

        res.json({ availableSlots });
    });
});

// Get Appointments (Optional - for testing)
app.get('/api/appointments', (req, res) => {
    db.all(`
        SELECT a.id, c.name, c.phone, a.service, a.date, a.time, a.status 
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        ORDER BY a.date DESC, a.time ASC
    `, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// --- Admin & Services API ---

// --- Authentication API ---

// Login with database authentication
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Update last login
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        logAudit(user.id, 'LOGIN_SUCCESS', `Usuário ${username} logado com sucesso`, req);

        const token = generateToken(user);
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    });
});

// Change password (authenticated users only)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (new_password.length < 4) {
        return res.status(400).json({ error: 'Nova senha deve ter pelo menos 4 caracteres' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const isValidPassword = await verifyPassword(current_password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        const newPasswordHash = await hashPassword(new_password);
        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, user.id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            logAudit(user.id, 'PASSWORD_CHANGE', `Usuário alterou sua própria senha`, req);
            res.json({ success: true, message: 'Senha alterada com sucesso' });
        });
    });
});

// --- User Management API (Admin only) ---

// Get all users
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT id, username, full_name, role, created_at, last_login FROM users ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create new user
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, full_name, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 4 caracteres' });
    }

    const passwordHash = await hashPassword(password);

    db.run('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        [username, passwordHash, full_name || username, role || 'admin'], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ error: 'Nome de usuário já existe' });
                }
                return res.status(500).json({ error: err.message });
            }
            logAudit(req.user.id, 'USER_CREATE', `Criou novo usuário: ${username} (Role: ${role || 'admin'})`, req);
            res.json({ id: this.lastID, message: 'Usuário criado com sucesso' });
        });
});

// Update user
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { username, full_name, role, password } = req.body;

    if (password) {
        // If password is being updated
        if (password.length < 4) {
            return res.status(400).json({ error: 'Senha deve ter pelo menos 4 caracteres' });
        }
        const passwordHash = await hashPassword(password);
        db.run('UPDATE users SET username = ?, full_name = ?, role = ?, password_hash = ? WHERE id = ?',
            [username, full_name, role, passwordHash, req.params.id], function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(409).json({ error: 'Nome de usuário já existe' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                logAudit(req.user.id, 'USER_UPDATE', `Atualizou usuário ID: ${req.params.id} (incluindo senha)`, req);
                res.json({ changes: this.changes, message: 'Usuário atualizado com sucesso' });
            });
    } else {
        // Update without password change
        db.run('UPDATE users SET username = ?, full_name = ?, role = ? WHERE id = ?',
            [username, full_name, role, req.params.id], function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(409).json({ error: 'Nome de usuário já existe' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                logAudit(req.user.id, 'USER_UPDATE', `Atualizou usuário ID: ${req.params.id}`, req);
                res.json({ changes: this.changes, message: 'Usuário atualizado com sucesso' });
            });
    }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
    // Prevent deleting yourself
    if (parseInt(req.params.id) === req.user.id) {
        return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    }

    db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        logAudit(req.user.id, 'USER_DELETE', `Excluiu usuário ID: ${req.params.id}`, req);
        res.json({ changes: this.changes, message: 'Usuário excluído com sucesso' });
    });
});

// --- Backup API (Admin only) ---

// Create manual backup
app.post('/api/backup/create', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const backupPath = await createBackup();
        logAudit(req.user.id, 'BACKUP_CREATE', `Backup manual criado: ${path.basename(backupPath)}`, req);
        res.json({ success: true, path: backupPath, message: 'Backup criado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List all backups
app.get('/api/backup/list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const backups = await listBackups();
        res.json(backups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Services CRUD
app.get('/api/services', (req, res) => {
    db.all('SELECT * FROM services', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/services', authenticateToken, (req, res) => {
    const { name, description, price, icon } = req.body;
    db.run('INSERT INTO services (name, description, price, icon) VALUES (?, ?, ?, ?)',
        [name, description, price, icon], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.user.id, 'SERVICE_CREATE', `Criou serviço: ${name}`, req);
            res.json({ id: this.lastID });
        });
});

app.put('/api/services/:id', authenticateToken, (req, res) => {
    const { name, description, price, icon } = req.body;
    db.run('UPDATE services SET name = ?, description = ?, price = ?, icon = ? WHERE id = ?',
        [name, description, price, icon, req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.user.id, 'SERVICE_UPDATE', `Atualizou serviço ID: ${req.params.id}`, req);
            res.json({ changes: this.changes });
        });
});

app.delete('/api/services/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM services WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logAudit(req.user.id, 'SERVICE_DELETE', `Excluiu serviço ID: ${req.params.id}`, req);
        res.json({ changes: this.changes });
    });
});

// Admin Appointments
app.get('/api/admin/appointments', authenticateToken, (req, res) => {
    db.all(`
        SELECT a.id, c.name, c.phone, a.service, a.date, a.time, a.status 
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        ORDER BY a.date DESC, a.time ASC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/appointments/:id/status', authenticateToken, (req, res) => {
    const { status } = req.body;
    db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logAudit(req.user.id, 'APPOINTMENT_STATUS_UPDATE', `Alterou status do agendamento ${req.params.id} para ${status}`, req);
        res.json({ changes: this.changes });
    });
});

app.put('/api/appointments/:id', authenticateToken, (req, res) => {
    const { payment_method, amount } = req.body;
    db.run('UPDATE appointments SET payment_method = ?, amount = ? WHERE id = ?',
        [payment_method, amount, req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.user.id, 'PAYMENT_REGISTER', `Registrou pagamento no valor de R$ ${amount} para agendamento ${req.params.id}`, req);
            res.json({ changes: this.changes });
        });
});

app.put('/api/appointments/:id/reschedule', authenticateToken, (req, res) => {
    const { date, time } = req.body;
    if (!date || !time) {
        return res.status(400).json({ error: 'Data e hora são obrigatórios.' });
    }

    db.run('UPDATE appointments SET date = ?, time = ? WHERE id = ?',
        [date, time, req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.user.id, 'APPOINTMENT_RESCHEDULE', `Reagendou atendimento ${req.params.id} para ${date} às ${time}`, req);
            res.json({ changes: this.changes });
        });
});

// Stats API
app.get('/api/stats', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const stats = {};

    db.get('SELECT COUNT(*) as count FROM appointments WHERE date = ?', [today], (err, row) => {
        stats.todayCount = row ? row.count : 0;

        db.get('SELECT COUNT(*) as count FROM appointments WHERE date >= ?', [weekAgo], (err, row) => {
            stats.weekCount = row ? row.count : 0;

            db.get('SELECT COUNT(*) as count FROM appointments WHERE date >= ?', [monthAgo], (err, row) => {
                stats.monthCount = row ? row.count : 0;

                db.get('SELECT SUM(amount) as total FROM appointments WHERE status = "completed"', [], (err, row) => {
                    stats.totalRevenue = row && row.total ? row.total : 0;

                    db.all('SELECT service, COUNT(*) as count FROM appointments GROUP BY service ORDER BY count DESC LIMIT 5', [], (err, rows) => {
                        stats.topServices = rows || [];
                        res.json(stats);
                    });
                });
            });
        });
    });
});

// Reports API
app.get('/api/reports', authenticateToken, (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ error: 'Start and end dates required' });
    }

    db.all(`
        SELECT a.id, c.name, c.phone, a.service, a.date, a.time, a.payment_method, a.amount, a.status
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        WHERE a.date BETWEEN ? AND ? AND a.status = 'completed'
        ORDER BY a.date DESC, a.time ASC
    `, [start, end], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const total = rows.reduce((sum, row) => sum + (row.amount || 0), 0);
        res.json({ appointments: rows, total });
    });
});

// Clients API
app.get('/api/clients', authenticateToken, (req, res) => {
    db.all(`
        SELECT c.id, c.name, c.phone, c.created_at,
               COUNT(a.id) as appointment_count,
               SUM(CASE WHEN a.status = 'completed' THEN a.amount ELSE 0 END) as total_spent
        FROM clients c
        LEFT JOIN appointments a ON c.id = a.client_id
        GROUP BY c.id
        ORDER BY c.name ASC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/clients/:id/history', authenticateToken, (req, res) => {
    db.all(`
        SELECT a.id, a.service, a.date, a.time, a.status, a.payment_method, a.amount
        FROM appointments a
        WHERE a.client_id = ?
        ORDER BY a.date DESC, a.time DESC
    `, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/clients/:id', authenticateToken, (req, res) => {
    const { name, phone } = req.body;

    if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ error: 'Número de telefone inválido. Use um formato brasileiro válido.' });
    }

    db.run('UPDATE clients SET name = ?, phone = ? WHERE id = ?',
        [name, phone, req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.user.id, 'CLIENT_UPDATE', `Atualizou cliente ID: ${req.params.id}`, req);
            res.json({ changes: this.changes });
        });
});

app.delete('/api/clients/:id', authenticateToken, (req, res) => {
    // First delete all appointments for this client
    db.run('DELETE FROM appointments WHERE client_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        // Then delete the client
        db.run('DELETE FROM clients WHERE id = ?', [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.user.id, 'CLIENT_DELETE', `Excluiu cliente ID: ${req.params.id}`, req);
            res.json({ changes: this.changes });
        });
    });
});

// Messages API
app.get('/api/messages', authenticateToken, (req, res) => {
    db.all('SELECT * FROM messages ORDER BY sent_at DESC LIMIT 50', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/messages', authenticateToken, (req, res) => {
    const { content, recipient_count } = req.body;
    db.run('INSERT INTO messages (content, recipient_count) VALUES (?, ?)',
        [content, recipient_count], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.user.id, 'MESSAGE_BULK_SEND', `Enviou mensagem em massa para ${recipient_count} destinatários`, req);
            res.json({ id: this.lastID });
        });
});

// Audit Logs API (Admin only)
app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, (req, res) => {
    db.all(`
        SELECT l.*, u.username 
        FROM audit_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.timestamp DESC LIMIT 100
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
