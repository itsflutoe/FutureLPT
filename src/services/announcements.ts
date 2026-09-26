import { supabase } from '@/lib/supabase';

export type Announcement = {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Published announcements for students (newest first). */
export async function getPublishedAnnouncements(limit = 20): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Announcement[];
}

/** Latest single published post (dashboard teaser). */
export async function getLatestAnnouncement(): Promise<Announcement | null> {
  const list = await getPublishedAnnouncements(1);
  return list[0] || null;
}

/** Admin: all announcements including drafts. */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Announcement[];
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  is_published?: boolean;
  created_by?: string;
}): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title: input.title.trim(),
      body: input.body.trim(),
      is_published: input.is_published !== false,
      created_by: input.created_by || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Announcement;
}

export async function updateAnnouncement(
  id: string,
  input: { title?: string; body?: string; is_published?: boolean }
): Promise<Announcement> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.body !== undefined) patch.body = input.body.trim();
  if (input.is_published !== undefined) patch.is_published = input.is_published;

  const { data, error } = await supabase
    .from('announcements')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}
