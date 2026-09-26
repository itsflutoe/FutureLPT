import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type Announcement,
} from '@/services/announcements';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { format } from 'date-fns';

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [published, setPublished] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getAllAnnouncements());
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'Failed to load. Run migration 009_announcements.sql in Supabase if the table is missing.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setPublished(true);
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await updateAnnouncement(editId, {
          title,
          body,
          is_published: published,
        });
      } else {
        await createAnnouncement({
          title,
          body,
          is_published: published,
          created_by: user?.id,
        });
      }
      resetForm();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (a: Announcement) => {
    setEditId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setPublished(a.is_published);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      if (editId === id) resetForm();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const togglePublish = async (a: Announcement) => {
    try {
      await updateAnnouncement(a.id, { is_published: !a.is_published });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link to="/admin" className="text-sm text-[var(--accent-color)] hover:underline">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold mt-1">Announcements</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tips and updates for students. Only you can post.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <h2 className="font-semibold text-sm">{editId ? 'Edit announcement' : 'New announcement'}</h2>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              maxLength={200}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message (tips, schedule, study advice…)"
              rows={5}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm resize-y min-h-[120px]"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Published (visible to students)
            </label>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Update' : 'Publish'}
              </Button>
              {editId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={a.is_published ? 'success' : 'outline'}>
                    {a.is_published ? 'Published' : 'Draft'}
                  </Badge>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {format(new Date(a.created_at), 'MMM d, yyyy · h:mm a')}
                  </span>
                </div>
                <h3 className="font-semibold text-sm">{a.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap">{a.body}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => startEdit(a)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => togglePublish(a)}>
                    {a.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(a.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
