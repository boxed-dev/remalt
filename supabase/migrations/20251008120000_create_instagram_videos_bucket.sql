-- Create a public bucket for instagram videos if it doesn't exist.
INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram_videos', 'instagram_videos', true)
ON CONFLICT (id) DO NOTHING;
