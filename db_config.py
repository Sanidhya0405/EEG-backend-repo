import os

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'eeg_user'),
    'password': os.getenv('DB_PASSWORD', '5911'),
    'database': os.getenv('DB_NAME', 'eeg_biometric'),
    'port': int(os.getenv('DB_PORT', '3306')),
}
