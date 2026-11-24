import sqlite3
import os
from contextlib import contextmanager
from app.config import settings

def get_db_connection():
    db_dir = os.path.dirname(settings.database_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        
    conn = sqlite3.connect(settings.database_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
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
            role TEXT NOT NULL CHECK(role IN ('performer', 'provider', 'audience', 'organiser')),
            avatar_url TEXT,
            bio TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            review_note TEXT,
            created_at TEXT NOT NULL
        );
        """)

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

