-- Enable RLS on calendars table (was missing since the table was added
-- after the initial security linter fix migration).

ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Users can view their own calendars
CREATE POLICY "Users can view their own calendars"
  ON public.calendars FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own calendars
CREATE POLICY "Users can insert their own calendars"
  ON public.calendars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own calendars
CREATE POLICY "Users can update their own calendars"
  ON public.calendars FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own calendars
CREATE POLICY "Users can delete their own calendars"
  ON public.calendars FOR DELETE
  USING (auth.uid() = user_id);
