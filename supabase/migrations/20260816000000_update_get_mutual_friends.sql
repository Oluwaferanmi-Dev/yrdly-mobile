CREATE OR REPLACE FUNCTION get_mutual_friends(
  p_user_id uuid,
  p_limit int default 20,
  p_offset int default 0
) RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY
  WITH my_mutuals AS (
    SELECT f1.following_id AS mutual_id
    FROM followers f1
    JOIN followers f2 ON f1.following_id = f2.follower_id AND f2.following_id = f1.follower_id
    WHERE f1.follower_id = p_user_id
  ),
  their_mutuals AS (
    SELECT u.id AS user_id, f1.following_id AS mutual_id
    FROM users u
    JOIN followers f1 ON f1.follower_id = u.id
    JOIN followers f2 ON f1.following_id = f2.follower_id AND f2.following_id = f1.follower_id
    WHERE u.id != p_user_id
  )
  SELECT DISTINCT u.* 
  FROM users u
  JOIN their_mutuals tm ON tm.user_id = u.id
  JOIN my_mutuals mm ON mm.mutual_id = tm.mutual_id
  WHERE u.id != p_user_id
    AND u.discoverable IS NOT FALSE
    AND u.id NOT IN (SELECT mutual_id FROM my_mutuals)
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
