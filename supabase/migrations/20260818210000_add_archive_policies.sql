CREATE POLICY "Users can archive their own tickets" ON tickets
  FOR UPDATE USING (buyer_id = auth.uid()) WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Organizers can archive their own events" ON events
  FOR UPDATE USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());
