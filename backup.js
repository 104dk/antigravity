const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Configuration
const BACKUP_DIR = path.join(__dirname, 'backups');
const DB_PATH = path.join(__dirname, 'salon.db');
const RETENTION_DAYS = 30;

/**
 * Ensure backup directory exists
 */
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log('Backup directory created:', BACKUP_DIR);
    }
}

/**
 * Create a backup of the database
 * @returns {Promise<string>} - Path to the backup file
 */
async function createBackup() {
    ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `salon-backup-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    return new Promise((resolve, reject) => {
        fs.copyFile(DB_PATH, backupPath, (err) => {
            if (err) {
                console.error('Backup failed:', err);
                reject(err);
            } else {
                console.log('Backup created:', backupFileName);
                resolve(backupPath);
            }
        });
    });
}

/**
 * Delete old backups based on retention policy
 */
function cleanOldBackups() {
    ensureBackupDir();

    const now = Date.now();
    const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) {
            console.error('Error reading backup directory:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(BACKUP_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error('Error getting file stats:', err);
                    return;
                }

                const fileAge = now - stats.mtimeMs;
                if (fileAge > maxAge) {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error('Error deleting old backup:', err);
                        } else {
                            console.log('Deleted old backup:', file);
                        }
                    });
                }
            });
        });
    });
}

/**
 * List all available backups
 * @returns {Promise<Array>} - Array of backup file info
 */
async function listBackups() {
    ensureBackupDir();

    return new Promise((resolve, reject) => {
        fs.readdir(BACKUP_DIR, (err, files) => {
            if (err) {
                reject(err);
                return;
            }

            const backupFiles = files
                .filter(file => file.endsWith('.db'))
                .map(file => {
                    const filePath = path.join(BACKUP_DIR, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.mtime
                    };
                })
                .sort((a, b) => b.created - a.created);

            resolve(backupFiles);
        });
    });
}

/**
 * Schedule automatic daily backups
 */
function scheduleBackups() {
    // Run backup every day at 3:00 AM
    cron.schedule('0 3 * * *', async () => {
        console.log('Running scheduled backup...');
        try {
            await createBackup();
            cleanOldBackups();
        } catch (error) {
            console.error('Scheduled backup failed:', error);
        }
    });

    console.log('Automatic backup scheduled: daily at 3:00 AM');
}

module.exports = {
    createBackup,
    listBackups,
    cleanOldBackups,
    scheduleBackups
};
