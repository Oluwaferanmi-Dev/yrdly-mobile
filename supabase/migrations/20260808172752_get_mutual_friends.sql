CREATE OR REPLACE FUNCTION get_mutual_friends(
  p_user_id uuid,
  p_limit int default 20,
  p_offset int default 0
) RETURNS SETOF users AS $$
DECLARE
  my_friends uuid[];
BEGIN
  -- Get the current user's friends list
  SELECT friends INTO my_friends FROM users WHERE id = p_user_id;
  
  -- If the user has no friends, they can't have mutual friends
  IF my_friends IS NULL OR array_length(my_friends, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT * FROM users u
  WHERE u.id != p_user_id
    AND u.discoverable IS NOT FALSE
    AND NOT u.id = ANY(my_friends) -- Not already friends
    AND (
      -- Has at least one mutual friend
      u.friends && my_friends
    )
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
