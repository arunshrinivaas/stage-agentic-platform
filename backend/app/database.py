import sqlite3
import os
from contextlib import contextmanager
from app.config import settings

def get_db_connection():
    db_dir = os.path.dirname(settings.database_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        
    conn = sqlite3.connect(settings.database_path, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA busy_timeout = 30000;")
    except Exception:
        pass
    return conn

@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('performer', 'provider', 'audience', 'organiser', 'admin')),
            password_hash TEXT,
            avatar_url TEXT,
            bio TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Migration check for existing users table
        try:
            cursor.execute("PRAGMA table_info(users);")
            user_cols = {col["name"] for col in cursor.fetchall()}
            if "password_hash" not in user_cols:
                cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT;")
        except Exception:
            pass

        # 1b. User Sessions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);")

        # 1c. User Settings table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            theme TEXT DEFAULT 'system',
            layout_density TEXT DEFAULT 'comfortable',
            email_notifications INTEGER DEFAULT 1,
            booking_confirmations INTEGER DEFAULT 1,
            request_status_updates INTEGER DEFAULT 1,
            cause_updates INTEGER DEFAULT 1,
            ai_recommendations INTEGER DEFAULT 1,
            proactive_ai_assistance INTEGER DEFAULT 1,
            ai_notification_preferences TEXT DEFAULT 'all',
            preferred_recommendation_categories TEXT DEFAULT '["Music", "Theatre", "Dance", "Spoken Word"]',
            calendar_sync_enabled INTEGER DEFAULT 0,
            calendar_provider TEXT DEFAULT 'download_ics',
            reminder_advance_hours INTEGER DEFAULT 24,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 2. Performer profiles
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS performer_profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            handle TEXT UNIQUE NOT NULL,
            avatar_url TEXT,
            bio TEXT,
            art_form TEXT NOT NULL,
            sub_genre TEXT,
            verified INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 3. Stage Venues
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS stage_venues (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            venue_type TEXT NOT NULL,
            address TEXT NOT NULL,
            neighborhood TEXT NOT NULL,
            city TEXT NOT NULL,
            seated_capacity INTEGER NOT NULL,
            standing_capacity INTEGER NOT NULL,
            formatted_capacity TEXT NOT NULL,
            suitable_categories TEXT NOT NULL, -- JSON array string
            amenities TEXT NOT NULL,           -- JSON array string
            availability_notice TEXT NOT NULL,
            availability_status TEXT NOT NULL DEFAULT 'open_slots',
            host_name TEXT NOT NULL,
            host_role TEXT NOT NULL,
            host_policy TEXT NOT NULL,
            image_url TEXT NOT NULL,
            is_demonstration INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 4. Performance Requests
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS performance_requests (
            id TEXT PRIMARY KEY,
            performer_id TEXT NOT NULL,
            performer_name TEXT NOT NULL,
            performer_handle TEXT NOT NULL,
            title TEXT NOT NULL,
            art_form TEXT NOT NULL,
            preferred_location TEXT NOT NULL,
            venue_id TEXT REFERENCES stage_venues(id) ON DELETE SET NULL,
            venue_name TEXT,
            date TEXT NOT NULL,
            time TEXT,
            expected_audience_size INTEGER NOT NULL,
            budget REAL NOT NULL,
            currency TEXT DEFAULT '₹',
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'returned', 'withdrawn')),
            review_note TEXT,
            created_at TEXT NOT NULL,
            technical_rider TEXT,
            duration_minutes INTEGER DEFAULT 60,
            notes TEXT,
            updated_at TIMESTAMP,
            status_history TEXT DEFAULT '[]'
        );
        """)

        # Migration check for performance_requests to ensure 'returned'/'withdrawn' support & new columns
        try:
            cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='performance_requests';")
            row = cursor.fetchone()
            if row and row[0]:
                sql_def = row[0]
                if "'returned'" not in sql_def or "technical_rider" not in sql_def:
                    # Migrate existing performance_requests table safely
                    cursor.execute("""
                    CREATE TABLE IF NOT EXISTS performance_requests_migrated (
                        id TEXT PRIMARY KEY,
                        performer_id TEXT NOT NULL,
                        performer_name TEXT NOT NULL,
                        performer_handle TEXT NOT NULL,
                        title TEXT NOT NULL,
                        art_form TEXT NOT NULL,
                        preferred_location TEXT NOT NULL,
                        venue_id TEXT REFERENCES stage_venues(id) ON DELETE SET NULL,
                        venue_name TEXT,
                        date TEXT NOT NULL,
                        time TEXT,
                        expected_audience_size INTEGER NOT NULL,
                        budget REAL NOT NULL,
                        currency TEXT DEFAULT '₹',
                        description TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'returned', 'withdrawn')),
                        review_note TEXT,
                        created_at TEXT NOT NULL,
                        technical_rider TEXT,
                        duration_minutes INTEGER DEFAULT 60,
                        notes TEXT,
                        updated_at TIMESTAMP,
                        status_history TEXT DEFAULT '[]'
                    );
                    """)
                    cursor.execute("""
                    INSERT INTO performance_requests_migrated (
                        id, performer_id, performer_name, performer_handle,
                        title, art_form, preferred_location, venue_id, venue_name,
                        date, time, expected_audience_size, budget, currency,
                        description, status, review_note, created_at,
                        technical_rider, duration_minutes, notes, updated_at, status_history
                    ) SELECT 
                        id, performer_id, performer_name, performer_handle,
                        title, art_form, preferred_location, venue_id, venue_name,
                        date, time, expected_audience_size, budget, currency,
                        description, status, review_note, created_at,
                        '', 60, '', created_at, '[]'
                    FROM performance_requests;
                    """)
                    cursor.execute("DROP TABLE performance_requests;")
                    cursor.execute("ALTER TABLE performance_requests_migrated RENAME TO performance_requests;")
        except Exception as e:
            print("Notice: performance_requests migration check:", e)

        # 5. Causes
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS causes (
            id TEXT PRIMARY KEY,
            title TEXT UNIQUE NOT NULL,
            tagline TEXT NOT NULL,
            description TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL NOT NULL DEFAULT 0,
            currency TEXT DEFAULT '₹',
            linked_performances_count INTEGER DEFAULT 0,
            organizer_name TEXT NOT NULL,
            organizer_type TEXT NOT NULL,
            organizer_verified INTEGER DEFAULT 1,
            focus_area TEXT NOT NULL,
            image_url TEXT NOT NULL,
            is_demonstration INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 6. Events
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            performer_id TEXT,
            performer_name TEXT NOT NULL,
            performer_handle TEXT NOT NULL,
            performer_avatar_url TEXT,
            performer_bio TEXT,
            art_form TEXT NOT NULL,
            sub_genre TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            date_time_iso TEXT NOT NULL,
            venue_id TEXT REFERENCES stage_venues(id) ON DELETE SET NULL,
            venue_name TEXT NOT NULL,
            neighborhood TEXT NOT NULL,
            city TEXT NOT NULL,
            is_indoor INTEGER DEFAULT 1,
            total_seats INTEGER NOT NULL,
            available_seats INTEGER NOT NULL,
            price_label TEXT NOT NULL,
            seat_status TEXT NOT NULL DEFAULT 'available',
            image_url TEXT NOT NULL,
            description TEXT NOT NULL,
            cause_id TEXT REFERENCES causes(id) ON DELETE SET NULL,
            cause_name TEXT,
            cause_percentage REAL DEFAULT 0,
            featured INTEGER DEFAULT 0,
            is_demonstration INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 7. Bookings
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            booking_code TEXT UNIQUE NOT NULL,
            event_id TEXT NOT NULL REFERENCES events(id),
            event_title TEXT NOT NULL,
            event_art_form TEXT NOT NULL,
            event_date TEXT NOT NULL,
            event_time TEXT NOT NULL,
            venue_name TEXT NOT NULL,
            city TEXT NOT NULL,
            ticket_count INTEGER NOT NULL,
            total_paid REAL NOT NULL,
            currency TEXT DEFAULT '₹',
            attendee_name TEXT NOT NULL,
            attendee_email TEXT NOT NULL,
            linked_cause_name TEXT,
            cause_contribution_amount REAL DEFAULT 0,
            booked_at TEXT NOT NULL,
            qr_code_placeholder TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'confirmed',
            is_simulated INTEGER DEFAULT 1
        );
        """)

        # 8. Contributions (Transparent Impact Ledger)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS contributions (
            id TEXT PRIMARY KEY,
            cause_id TEXT NOT NULL REFERENCES causes(id),
            cause_title TEXT NOT NULL,
            event_id TEXT NOT NULL REFERENCES events(id),
            event_title TEXT NOT NULL,
            performer_name TEXT NOT NULL,
            venue_name TEXT NOT NULL,
            booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
            date TEXT NOT NULL,
            tickets_sold INTEGER NOT NULL,
            gross_proceeds REAL NOT NULL,
            pledged_percentage REAL NOT NULL,
            impact_amount REAL NOT NULL,
            currency TEXT DEFAULT '₹',
            is_simulated INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 9. Notifications
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            role TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            read INTEGER DEFAULT 0,
            type TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 10. Platform Cache Metadata (Durable generational invalidation)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS platform_cache_metadata (
            namespace TEXT PRIMARY KEY,
            generation INTEGER NOT NULL DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 11. Transactional Event Outbox
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS event_outbox (
            event_id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            aggregate_type TEXT NOT NULL,
            aggregate_id TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            published_at TIMESTAMP,
            attempts INTEGER DEFAULT 0,
            last_error TEXT
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_outbox_published ON event_outbox(published_at);")

        # 12. Idempotent Consumer Processed Events
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS processed_events (
            consumer_group TEXT NOT NULL,
            event_id TEXT NOT NULL,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (consumer_group, event_id)
        );
        """)

        # 13. Event Analytics Ledger
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS event_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            aggregate_type TEXT NOT NULL,
            aggregate_id TEXT NOT NULL,
            payload TEXT NOT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON event_analytics(event_type);")

        # 14. Persistent User Reminders
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_reminders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('booking', 'schedule', 'request_deadline', 'civic_deadline', 'campaign_milestone', 'settlement', 'custom')),
            target_date TEXT NOT NULL,
            target_time TEXT,
            target_timestamp TEXT,
            venue TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'missed', 'cancelled')),
            advance_hours INTEGER DEFAULT 24,
            dedup_key TEXT UNIQUE,
            metadata_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reminders_user_status ON user_reminders(user_id, status);")

        # 15. Verified Digital Passes
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS digital_passes (
            id TEXT PRIMARY KEY,
            booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            event_id TEXT NOT NULL REFERENCES events(id),
            user_id TEXT REFERENCES users(id),
            booking_code TEXT NOT NULL,
            verification_token TEXT UNIQUE NOT NULL,
            token_signature TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'valid' CHECK(status IN ('valid', 'used', 'cancelled', 'revoked')),
            issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP,
            used_by_scanner TEXT,
            checkin_device_id TEXT
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_passes_token ON digital_passes(verification_token);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_passes_booking ON digital_passes(booking_id);")

        # 16. Pass Check-in Audit Trail
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS pass_checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pass_id TEXT NOT NULL REFERENCES digital_passes(id),
            scanner_user_id TEXT,
            scanner_role TEXT,
            scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            action TEXT NOT NULL CHECK(action IN ('admitted', 'duplicate_rejected', 'tampered_rejected', 'revoked_rejected', 'cancelled_rejected')),
            device_info TEXT,
            notes TEXT
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_checkins_pass ON pass_checkins(pass_id);")

        # 17. Deterministic Financial Settlements
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS financial_settlements (
            id TEXT PRIMARY KEY,
            contribution_id TEXT NOT NULL REFERENCES contributions(id),
            campaign_id TEXT NOT NULL REFERENCES causes(id),
            event_id TEXT NOT NULL REFERENCES events(id),
            gross_amount TEXT NOT NULL,
            performer_share TEXT NOT NULL,
            cause_share TEXT NOT NULL,
            platform_fee TEXT NOT NULL,
            rounding_remainder TEXT NOT NULL DEFAULT '0.00',
            currency TEXT NOT NULL DEFAULT '₹',
            calculation_version TEXT NOT NULL DEFAULT 'v1.0',
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'settled', 'failed', 'reversed')),
            settled_at TIMESTAMP,
            reconciled INTEGER NOT NULL DEFAULT 1,
            is_simulated INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_settlements_status ON financial_settlements(status);")

        # 18. Immutable Settlement Transaction Ledger (Append-Only Journal)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS settlement_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            settlement_id TEXT NOT NULL REFERENCES financial_settlements(id),
            entry_type TEXT NOT NULL CHECK(entry_type IN ('credit', 'debit', 'allocation', 'payout', 'reversal')),
            account TEXT NOT NULL CHECK(account IN ('escrow', 'performer_payout', 'cause_endowment', 'platform_operations')),
            amount TEXT NOT NULL,
            currency TEXT NOT NULL DEFAULT '₹',
            balance_after TEXT NOT NULL,
            narrative TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_settlement ON settlement_ledger(settlement_id);")


