import json
from app.database import get_db
from app.services.auth import hash_password

def seed_database():
    with get_db() as conn:
        cursor = conn.cursor()

        # Generate default demo password hash using bcrypt
        default_pw_hash = hash_password("stage2026")

        # 1. Users
        users = [
            ("usr-aarav", "Aarav Mehta", "aarav@stage.live", "performer", default_pw_hash, "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80", "Classical Indian sitarist pairing ragas with baroque French cello."),
            ("usr-heritage", "Priya Sanghavi", "priya@heritagestages.live", "provider", default_pw_hash, "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80", "Curator of heritage brick lofts and community spaces."),
            ("usr-rhea", "Rhea Sen", "rhea.sen@example.com", "audience", default_pw_hash, "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80", "Independent art patron and supporter of youth music programs."),
            ("usr-delta", "Delta Melody Foundation", "organizer@deltamelody.org", "organiser", default_pw_hash, "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=160&auto=format&fit=crop&q=80", "Grassroots cultural non-profit mobilizing instruments for rural schools."),
            ("usr-admin", "STAGE Admin & Demo Lead", "admin@stage.live", "admin", default_pw_hash, "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80", "Platform administrator with multi-role demonstration access."),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO users (id, name, email, role, password_hash, avatar_url, bio)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, users)

        # Update existing demo users if their password_hash is null
        cursor.execute("SELECT id FROM users WHERE password_hash IS NULL;")
        null_rows = cursor.fetchall()
        for r in null_rows:
            cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?;", (default_pw_hash, r["id"]))

        # 2. Performer profiles
        performers = [
            ("perf-mehta", "usr-aarav", "Aarav Mehta & Clara Dubois", "@mehta.dubois", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80", "Classical Indian sitar paired with baroque French cello, exploring cross-continental raga improvisations.", "Music", "Indo-Classical & Chamber Fusion", 1),
            ("perf-raghavan", None, "Divya Raghavan Movement Ensemble", "@divya.raghavan.dance", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80", "Pushing sacred geometric footwork into urban industrial spaces to narrate modern migration.", "Dance", "Contemporary Classical Dance", 1),
            ("perf-soliloquy", None, "The Soliloquy Collective", "@soliloquy.theatre", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80", "Experimental theatre troupe creating hyper-realistic, documentary-style blackbox plays.", "Theatre", "Experimental Blackbox Drama", 1),
            ("perf-kabir", None, "Kabir Sen & The Urban Bards", "@kabir.poet", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80", "Slam champion and community organizer curating safe poetic spaces for healing and vulnerability.", "Spoken Word", "Lyric Poetry & Storytelling", 1),
            ("perf-oldtown", None, "Old Town Brass Brigade", "@oldtownbrass", "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=160&auto=format&fit=crop&q=80", "8-piece brass and percussion collective bringing high-voltage brass grooves to civic public squares.", "Street Performance", "Acoustic Brass & Street Jazz", 1),
            ("perf-zoya", None, "Zoya & The Nocturne Collective", "@zoyamakesmusic", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80", "Analog synthesist and sarangi exponent sculpting deep ambient listening sessions.", "Music", "Ambient & Electronic Raga", 1),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO performer_profiles (id, user_id, name, handle, avatar_url, bio, art_form, sub_genre, verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, performers)

        # 3. Stage venues
        venues = [
            (
                "venue-01",
                "The Vault Amphitheater",
                "Historic Brick Amphitheater",
                "14 River Heritage Way",
                "South Waterfront",
                "Kolkata",
                140,
                200,
                "140 seated · 200 total",
                json.dumps(["Music", "Theatre", "Spoken Word"]),
                json.dumps(["Natural Stone Acoustics", "Tuning Green Room", "DMX Lighting Rig", "PA Soundboard"]),
                "Open for Weekend Dusk & Evening slots",
                "open_slots",
                "Heritage Arts Trust",
                "Non-profit cultural steward",
                "85% box-office proceeds retained by performer",
                "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&auto=format&fit=crop&q=85",
                1
            ),
            (
                "venue-02",
                "The Heritage Mill Loft",
                "Daylit Industrial Warehouse",
                "Compound 10, Cotton Mills Estate",
                "Textile Mills District",
                "Mumbai",
                90,
                150,
                "90 seated / sprung floor",
                json.dumps(["Dance", "Theatre", "Street Performance"]),
                json.dumps(["Sprung Harlequin Dance Floor", "Double-height Grid", "Blackout Curtains", "Changing Suites"]),
                "Curated slots open for Dec & Jan",
                "curated_application",
                "Priya Sanghavi",
                "Stage Curator & Choreographer",
                "Flat subsidized community fee or cause barter",
                "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=900&auto=format&fit=crop&q=85",
                1
            ),
            (
                "venue-03",
                "The Sunken Garden Pavilion",
                "Open-Air Terraced Courtyard",
                "Gate 4, Botanical Commons",
                "Civic Esplanade",
                "New Delhi",
                220,
                400,
                "220 terraced lawn seats",
                json.dumps(["Street Performance", "Music", "Spoken Word"]),
                json.dumps(["Weather-protected Canopy", "Solar Powered Audio", "360° Amphitheatric Sightlines"]),
                "Sundays & Public Holidays available",
                "weekend_only",
                "Civic Green Arts Board",
                "Public space curator",
                "100% free venue hire for verified social-impact events",
                "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900&auto=format&fit=crop&q=85",
                1
            ),
            (
                "venue-04",
                "Acoustic Cellar at Old Mill",
                "Intimate Underground Listening Room",
                "Basement Level, 88 Brigade Lane",
                "Fort Heritage Quarter",
                "Bengaluru",
                55,
                70,
                "55 intimate cabaret seating",
                json.dumps(["Spoken Word", "Music", "Theatre"]),
                json.dumps(["Warm Velvet Drapes", "Boutique Microphones", "Espresso Bar", "Multitrack Live Recording"]),
                "Thursday & Friday open mic / residency slots",
                "open_slots",
                "Marcus Roy",
                "Sound Engineer & Venue Owner",
                "75/25 split + free multitrack live audio recording",
                "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&auto=format&fit=crop&q=85",
                1
            ),
            (
                "venue-05",
                "The Marina Coastal Amphitheatre",
                "Open-Air Seaside Amphitheatre",
                "18 Beach Road, Santhome",
                "Mylapore Waterfront",
                "Chennai",
                120,
                180,
                "120 tiered stone seats · 180 total",
                json.dumps(["Music", "Theatre", "Spoken Word"]),
                json.dumps(["Acoustic Shell", "Seaside Breeze Drapes", "Custom PA System", "Green Room"]),
                "Open for Weekend Sunset Acoustic Sessions",
                "open_slots",
                "Karthik Raman",
                "Cultural Trust Trustee",
                "80% artist split + 10% venue maintenance + 10% cause pledge",
                "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?w=900&auto=format&fit=crop&q=85",
                1
            ),
            (
                "venue-06",
                "Kalakshetra Heritage Pavilion",
                "Teakwood Open-Air Mandapam",
                "Kalakshetra Road, Thiruvanmiyur",
                "Thiruvanmiyur",
                "Chennai",
                150,
                220,
                "150 courtyard seats",
                json.dumps(["Music", "Dance", "Theatre"]),
                json.dumps(["Traditional Acoustic Resonance", "Natural Stone Stage", "Modular Spotlights", "Green Room"]),
                "Acoustic chamber slots available for certified ensembles",
                "open_slots",
                "Meenakshi Sundaram",
                "Carnatic & Folk Arts Steward",
                "85% artist split + 15% venue maintenance",
                "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=85",
                1
            ),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO stage_venues (
            id, name, venue_type, address, neighborhood, city,
            seated_capacity, standing_capacity, formatted_capacity,
            suitable_categories, amenities, availability_notice,
            availability_status, host_name, host_role, host_policy,
            image_url, is_demonstration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, venues)

        # 4. Causes
        causes = [
            (
                "cause-01",
                "Instruments for Riverbank Classrooms",
                "Empowering 500 children along the delta with violins, harmoniums, and dedicated music mentorship.",
                "Many rural municipal schools lack basic musical instruments. In partnership with touring acoustic artists on STAGE, every ticket contribution funds handmade student instruments and weekly community lessons.",
                500000.0,
                384500.0,
                "₹",
                8,
                "Delta Melody Foundation",
                "Grassroots Arts Non-Profit",
                1,
                "Youth Arts Education",
                "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&auto=format&fit=crop&q=85",
                1
            ),
            (
                "cause-02",
                "Shelter Stories: Creative Therapy for Youth",
                "Weekly expressive theatre workshops and poetry open mics for adolescents in transit shelters.",
                "Transforming personal adversity into poignant stage storytelling. Stage providers donate rehearsal spaces, while performers facilitate weekly writing circles that rebuild dignity and emotional resilience.",
                350000.0,
                295000.0,
                "₹",
                12,
                "Compassion Arts Collective",
                "Community Mental Health Alliance",
                1,
                "Mental Health & Shelter Support",
                "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=900&auto=format&fit=crop&q=85",
                1
            ),
            (
                "cause-03",
                "Preserving Delta Folk & Classical Traditions",
                "Archiving, paying fair performance stipends, and digitizing endangered oral folk musical traditions.",
                "Elder folk master musicians often struggle to access urban stages. STAGE pairs heritage balladeers with contemporary performers, providing dignified performance fees and studio archiving.",
                750000.0,
                560000.0,
                "₹",
                6,
                "Living Heritage Heritage Trust",
                "Cultural Preservation Initiative",
                1,
                "Folk Preservation & Elder Care",
                "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=900&auto=format&fit=crop&q=85",
                1
            ),
            (
                "cause-04",
                "Green Stages: Low-Carbon Public Art",
                "Solar-powered stage setups and zero-waste community festivals across municipal parks.",
                "Pioneering mobile solar batteries and compostable stage props for outdoor street ensembles, proving that vibrant public culture can leave a positive environmental footprint.",
                280000.0,
                215000.0,
                "₹",
                5,
                "EcoArts Forum",
                "Environmental Action Society",
                1,
                "Ecological Action in Culture",
                "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=900&auto=format&fit=crop&q=85",
                1
            ),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO causes (
            id, title, tagline, description, target_amount, current_amount,
            currency, linked_performances_count, organizer_name, organizer_type,
            organizer_verified, focus_area, image_url, is_demonstration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, causes)

        # 5. Events
        events = [
            (
                "evt-01",
                "Echoes of the Ghats: Sitar & Cello Dialogue",
                "perf-mehta",
                "Aarav Mehta & Clara Dubois",
                "@mehta.dubois",
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
                "Classical Indian sitar paired with baroque French cello, exploring cross-continental raga improvisations.",
                "Music",
                "Indo-Classical & Chamber Fusion",
                "Sat, Nov 28",
                "7:30 PM",
                "2026-11-28T19:30:00",
                "venue-01",
                "The Vault Amphitheater",
                "Old Waterfront Basin",
                "Kolkata & Virtual Stream",
                1,
                120,
                24,
                "₹450 / Pay-what-you-wish",
                "limited",
                "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=900&auto=format&fit=crop&q=85",
                "An intimate dusk recital where centuries-old Hindustani ragas intertwine with contemplative European chamber harmonics. Curated specifically for natural stone acoustic resonance.",
                "cause-01",
                "Instruments for Riverbank Classrooms",
                30.0,
                1,
                1
            ),
            (
                "evt-02",
                "Shadows in Concrete: Contemporary Kathak",
                "perf-raghavan",
                "Divya Raghavan Movement Ensemble",
                "@divya.raghavan.dance",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80",
                "Pushing sacred geometric footwork into urban industrial spaces to narrate modern migration.",
                "Dance",
                "Contemporary Classical Dance",
                "Sun, Nov 29",
                "6:00 PM",
                "2026-11-29T18:00:00",
                "venue-02",
                "The Heritage Mill Loft",
                "Textile Mills District",
                "Mumbai",
                1,
                90,
                12,
                "₹600",
                "limited",
                "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=900&auto=format&fit=crop&q=85",
                "A raw, kinetic exploration of migration, belonging, and memory. The ensemble blends intense classical Kathak chakkars (pirouettes) with immersive spoken soundscapes.",
                "cause-03",
                "Preserving Delta Folk & Classical Traditions",
                25.0,
                1,
                1
            ),
            (
                "evt-03",
                "The Unspoken Monologues: Voices from the Margin",
                "perf-soliloquy",
                "The Soliloquy Collective",
                "@soliloquy.theatre",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80",
                "Experimental theatre troupe creating hyper-realistic, documentary-style blackbox plays.",
                "Theatre",
                "Experimental Blackbox Drama",
                "Thu, Dec 03",
                "8:00 PM",
                "2026-12-03T20:00:00",
                "venue-02",
                "Blackbox Studio 4",
                "Kala Ghoda Arts Enclave",
                "Mumbai",
                1,
                65,
                38,
                "₹350 / Student concessions available",
                "available",
                "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=900&auto=format&fit=crop&q=85",
                "Seven intensely vulnerable monologues written in collaboration with frontline workers, care providers, and community elders. An immersive circular staging where audience and actor share the breath.",
                "cause-02",
                "Shelter Stories: Creative Therapy for Youth",
                40.0,
                0,
                1
            ),
            (
                "evt-04",
                "Verses for Sanity: Open Mic & Spoken Word Slam",
                "perf-kabir",
                "Kabir Sen & The Urban Bards",
                "@kabir.poet",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80",
                "Slam champion and community organizer curating safe poetic spaces for healing and vulnerability.",
                "Spoken Word",
                "Lyric Poetry & Storytelling",
                "Fri, Dec 04",
                "7:00 PM",
                "2026-12-04T19:00:00",
                "venue-04",
                "Acoustic Cellar at Old Mill",
                "Fort Heritage Quarter",
                "Bengaluru",
                1,
                50,
                8,
                "Free entry / RSVP required",
                "limited",
                "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=900&auto=format&fit=crop&q=85",
                "An electric evening of spoken word poetry confronting loneliness, modern hustle culture, and everyday triumphs. Community open mic slots open after the headline performance.",
                "cause-02",
                "Shelter Stories: Creative Therapy for Youth",
                100.0,
                0,
                1
            ),
            (
                "evt-05",
                "Brass & Echoes: Sunset Promenade Fanfare",
                "perf-oldtown",
                "Old Town Brass Brigade",
                "@oldtownbrass",
                "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=160&auto=format&fit=crop&q=80",
                "8-piece brass and percussion collective bringing high-voltage brass grooves to civic public squares.",
                "Street Performance",
                "Acoustic Brass & Street Jazz",
                "Sat, Dec 05",
                "5:30 PM",
                "2026-12-05T17:30:00",
                "venue-03",
                "The Sunken Garden Pavilion",
                "Civic Esplanade",
                "New Delhi",
                0,
                250,
                110,
                "Public open access · Donations welcomed",
                "available",
                "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=900&auto=format&fit=crop&q=85",
                "Reclaiming public squares with soaring trumpets, sousaphones, and dholak-infused street rhythms as the sun sets over the historic promenade.",
                "cause-04",
                "Green Stages: Low-Carbon Public Art",
                50.0,
                0,
                1
            ),
            (
                "evt-06",
                "Midnight Raga & Ambient Synths",
                "perf-zoya",
                "Zoya & The Nocturne Collective",
                "@zoyamakesmusic",
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80",
                "Analog synthesist and sarangi exponent sculpting deep ambient listening sessions.",
                "Music",
                "Ambient & Electronic Raga",
                "Sun, Dec 06",
                "9:00 PM",
                "2026-12-06T21:00:00",
                "venue-04",
                "The Atrium at Metro Center",
                "Cultural Corridor",
                "Bengaluru",
                1,
                100,
                4,
                "₹750",
                "limited",
                "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&auto=format&fit=crop&q=85",
                "A meditative 90-minute sonic journey bridging 100-year-old bowed sarangi melodies with warm analog modular synthesizers under architectural vaulted ceilings.",
                "cause-01",
                "Instruments for Riverbank Classrooms",
                20.0,
                0,
                1
            ),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO events (
            id, title, performer_id, performer_name, performer_handle,
            performer_avatar_url, performer_bio, art_form, sub_genre,
            date, time, date_time_iso, venue_id, venue_name,
            neighborhood, city, is_indoor, total_seats, available_seats,
            price_label, seat_status, image_url, description,
            cause_id, cause_name, cause_percentage, featured, is_demonstration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, events)

        # 6. Performance Requests
        requests = [
            (
                "req-01",
                "perf-mehta",
                "Aarav Mehta & Clara Dubois",
                "@mehta.dubois",
                "Echoes of the Ghats: Sitar & Cello Dialogue",
                "Music",
                "Kolkata Waterfront",
                "venue-01",
                "The Vault Amphitheater",
                "2026-11-28",
                "7:30 PM",
                120,
                35000.0,
                "₹",
                "An acoustic chamber dialogue between sitar and French cello. Natural stone acoustic setup requested.",
                "approved",
                "Approved. Sound technician assigned for natural stone acoustic balance.",
                "2026-11-14"
            ),
            (
                "req-02",
                "perf-mehta",
                "Aarav Mehta & Clara Dubois",
                "@mehta.dubois",
                "Monsoon Rhythms: Tarang & Pakhawaj Chamber Session",
                "Music",
                "Mumbai Textile Mills",
                "venue-02",
                "The Heritage Mill Loft",
                "2026-12-18",
                "6:30 PM",
                85,
                28000.0,
                "₹",
                "Intimate dusk acoustic recital exploring seasonal Malhar ragas with guest pakhawaj player.",
                "pending",
                None,
                "2026-11-20"
            ),
            (
                "req-03",
                "perf-raghavan",
                "Divya Raghavan Movement Ensemble",
                "@divya.raghavan.dance",
                "Rhythm in Concrete: Contemporary Kathak Showcase",
                "Dance",
                "Mumbai Textile Mills",
                "venue-02",
                "The Heritage Mill Loft",
                "2026-11-29",
                "6:00 PM",
                90,
                45000.0,
                "₹",
                "Full stage dance performance requiring sprung Harlequin floor and perimeter blackout curtains.",
                "approved",
                "Approved. Sprung floor reserved and lighting tech allocated.",
                "2026-11-10"
            ),
            (
                "req-04",
                "perf-mehta",
                "Aarav Mehta & Clara Dubois",
                "@mehta.dubois",
                "Midnight Electronic Sitar Rave",
                "Music",
                "Bengaluru Fort Quarter",
                "venue-04",
                "Acoustic Cellar at Old Mill",
                "2026-12-24",
                "11:30 PM",
                110,
                60000.0,
                "₹",
                "High SPL amplified electronic fusion with subwoofers.",
                "rejected",
                "Declined: Exceeds acoustic listening room decibel and capacity thresholds.",
                "2026-11-12"
            ),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO performance_requests (
            id, performer_id, performer_name, performer_handle,
            title, art_form, preferred_location, venue_id, venue_name,
            date, time, expected_audience_size, budget, currency,
            description, status, review_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, requests)

        # 7. Bookings
        bookings = [
            (
                "book-01",
                "STG-8821-KOL",
                "evt-01",
                "Echoes of the Ghats: Sitar & Cello Dialogue",
                "Music",
                "Sat, Nov 28",
                "7:30 PM",
                "The Vault Amphitheater",
                "Kolkata",
                2,
                900.0,
                "₹",
                "Rhea Sen",
                "rhea.sen@example.com",
                "Instruments for Riverbank Classrooms",
                270.0,
                "2026-11-21T14:30:00",
                "STG-QR-ECHOES-8821",
                "confirmed",
                1
            ),
            (
                "book-02",
                "STG-4409-MUM",
                "evt-03",
                "The Unspoken Monologues: Voices from the Margin",
                "Theatre",
                "Thu, Dec 03",
                "8:00 PM",
                "Blackbox Studio 4",
                "Mumbai",
                1,
                350.0,
                "₹",
                "Rhea Sen",
                "rhea.sen@example.com",
                "Shelter Stories: Creative Therapy for Youth",
                140.0,
                "2026-11-22T09:15:00",
                "STG-QR-MONO-4409",
                "confirmed",
                1
            ),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO bookings (
            id, booking_code, event_id, event_title, event_art_form,
            event_date, event_time, venue_name, city, ticket_count,
            total_paid, currency, attendee_name, attendee_email,
            linked_cause_name, cause_contribution_amount, booked_at,
            qr_code_placeholder, status, is_simulated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, bookings)

        # 8. Contributions
        contributions = [
            ("led-01", "cause-01", "Instruments for Riverbank Classrooms", "evt-01", "Echoes of the Ghats: Sitar & Cello Dialogue", "Aarav Mehta & Clara Dubois", "The Vault Amphitheater", "book-01", "2026-11-21", 96, 43200.0, 30.0, 12960.0, "₹", 1),
            ("led-02", "cause-02", "Shelter Stories: Creative Therapy for Youth", "evt-03", "The Unspoken Monologues", "The Soliloquy Collective", "Blackbox Studio 4", "book-02", "2026-11-20", 27, 9450.0, 40.0, 3780.0, "₹", 1),
            ("led-03", "cause-03", "Preserving Delta Folk & Classical Traditions", "evt-02", "Shadows in Concrete: Contemporary Kathak", "Divya Raghavan Movement Ensemble", "The Heritage Mill Loft", None, "2026-11-19", 78, 46800.0, 25.0, 11700.0, "₹", 1),
            ("led-04", "cause-04", "Green Stages: Low-Carbon Public Art", "evt-05", "Brass & Echoes: Sunset Promenade Fanfare", "Old Town Brass Brigade", "The Sunken Garden Pavilion", None, "2026-11-18", 140, 28000.0, 50.0, 14000.0, "₹", 1),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO contributions (
            id, cause_id, cause_title, event_id, event_title,
            performer_name, venue_name, booking_id, date, tickets_sold,
            gross_proceeds, pledged_percentage, impact_amount, currency, is_simulated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, contributions)

        # 9. Notifications
        notifications = [
            ("notif-01", "performer", "Stage Request Approved", "The Vault Amphitheater approved 'Echoes of the Ghats' for Nov 28.", "2 hours ago", 0, "approval"),
            ("notif-02", "provider", "New Incoming Request", "Aarav Mehta submitted a rider for 'Monsoon Rhythms' on Dec 18.", "5 hours ago", 0, "request"),
            ("notif-03", "audience", "Booking Confirmed", "Pass STG-8821 for Sitar & Cello Dialogue is confirmed.", "1 day ago", 0, "booking"),
            ("notif-04", "organiser", "Cause Milestone Reached", "Riverbank Classrooms campaign crossed 75% funding goal.", "1 day ago", 0, "cause"),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO notifications (
            id, role, title, message, timestamp, read, type
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
        """, notifications)

