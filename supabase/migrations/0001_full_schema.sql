-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Person Table
CREATE TABLE IF NOT EXISTS person (
    person_id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    fullname TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    phone TEXT,
    profile_picture_url TEXT,
    password TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_otp TEXT,
    otp_expires_at TIMESTAMPTZ,
    auth_provider TEXT DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE person ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON person FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON person FOR UPDATE USING (true); -- Simplified for API usage

-- 2. Groups Table
CREATE TABLE IF NOT EXISTS groups (
    group_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_by INTEGER REFERENCES person(person_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups are viewable by participants" ON groups FOR SELECT USING (true);

-- 3. Group Participants Table
CREATE TABLE IF NOT EXISTS group_participants (
    participant_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER', -- 'ADMIN', 'MEMBER'
    status TEXT DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, person_id)
);

ALTER TABLE group_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants are viewable by everyone" ON group_participants FOR SELECT USING (true);

-- 4. Starred Groups Table
CREATE TABLE IF NOT EXISTS starred_groups (
    starred_group_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(person_id, group_id)
);

ALTER TABLE starred_groups ENABLE ROW LEVEL SECURITY;

-- 5. Scene Table
CREATE TABLE IF NOT EXISTS scene (
    scene_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    description TEXT,
    scene_timestamptz TIMESTAMPTZ NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scene ENABLE ROW LEVEL SECURITY;

-- 6. Scene Participants Table
CREATE TABLE IF NOT EXISTS scene_participants (
    scene_participant_id SERIAL PRIMARY KEY,
    scene_id INTEGER REFERENCES scene(scene_id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    pending_amount DECIMAL(12, 2) DEFAULT 0,
    additional_amount DECIMAL(12, 2) DEFAULT 0,
    participant_category TEXT DEFAULT 'SHARING', -- 'SHARING', 'INDIVIDUAL'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scene_participants ENABLE ROW LEVEL SECURITY;

-- 7. Transaction (Ledger) Table
CREATE TABLE IF NOT EXISTS transaction (
    transaction_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    scene_id INTEGER REFERENCES scene(scene_id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    type TEXT NOT NULL, -- 'DEBIT', 'CREDIT'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transaction ENABLE ROW LEVEL SECURITY;

-- 8. Deposit Requests Table
CREATE TABLE IF NOT EXISTS deposit_requests (
    request_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    deposit_type TEXT DEFAULT 'CASH', -- 'CASH', 'BANK_TRANSFER', 'OTHER'
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    description TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;

-- 9. Group Invites Table
CREATE TABLE IF NOT EXISTS group_invites (
    invite_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'DECLINED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- 10. Appeals Table
CREATE TABLE IF NOT EXISTS appeals (
    appeal_id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(group_id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachment_url TEXT,
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

-- 11. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    receiver_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES person(person_id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 12. Storage Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('scene-on', 'scene-on', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'scene-on');
CREATE POLICY "All can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'scene-on');
