CREATE OR REPLACE FUNCTION check_message_update_rules()
RETURNS trigger AS $$
BEGIN
  -- Check if text or media content is being modified
  IF NEW.text IS DISTINCT FROM OLD.text OR 
     NEW.content IS DISTINCT FROM OLD.content OR
     NEW.media_url IS DISTINCT FROM OLD.media_url THEN
     
    -- Only the sender can modify the content
    IF auth.uid() != OLD.sender_id THEN
      RAISE EXCEPTION 'Only the sender can edit or delete this message.';
    END IF;
    
    -- Must be within 15 minutes
    IF (now() - OLD.created_at) > interval '15 minutes' THEN
      RAISE EXCEPTION 'Messages can only be edited or deleted within 15 minutes of sending.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
