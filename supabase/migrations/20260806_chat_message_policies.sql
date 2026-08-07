-- Enforce 15-minute edit/delete window for messages
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages within 15 minutes" ON messages;

CREATE POLICY "Users can update their own messages within 15 minutes"
ON messages
FOR UPDATE
USING (
  auth.uid() = sender_id AND (now() - created_at) <= interval '15 minutes'
)
WITH CHECK (
  auth.uid() = sender_id AND (now() - created_at) <= interval '15 minutes'
);
