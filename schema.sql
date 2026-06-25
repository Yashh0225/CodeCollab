-- Create the room_members table for Role-Based Access Control
CREATE TABLE public.room_members (
    room_id text NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
);

-- Note: Ensure that the 'room_id' corresponds to your rooms table schema 
-- and 'user_id' corresponds to your users table schema.
