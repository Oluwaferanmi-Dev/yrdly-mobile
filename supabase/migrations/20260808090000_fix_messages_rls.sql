DROP POLICY IF EXISTS "Participants can update messages" ON messages;

CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id uuid, check_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conv_id
    AND check_uid::text = ANY(participant_ids::text[])
  );
$$;

CREATE POLICY "Participants can update messages"
ON messages
FOR UPDATE
USING (
  is_conversation_participant(conversation_id, auth.uid())
)
WITH CHECK (
  is_conversation_participant(conversation_id, auth.uid())
);
