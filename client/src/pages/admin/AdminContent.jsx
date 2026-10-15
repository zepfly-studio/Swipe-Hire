import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import TagInput from '../../components/TagInput';
import { Button, Field, Input, Spinner, Textarea } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { DEFAULT_FAQ } from '../../lib/faq';
import AdminShell from './AdminShell';

// Editable website text (FAQ, About intro) and extra suggestion words.
export default function AdminContent() {
  const [faq, setFaq] = useState(null);
  const [custom, setCustom] = useState(false);
  const [about, setAbout] = useState('');
  const [lists, setLists] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api
      .get('/admin/settings')
      .then(({ data }) => {
        setCustom(Boolean(data.content.faq));
        setFaq(data.content.faq || DEFAULT_FAQ.map((f) => ({ ...f })));
        setAbout(data.content.aboutIntro || '');
        setLists(data.taxonomy);
      })
      .catch((err) => toast.error(errorMessage(err)));
  }, []);

  const saveContent = async (useDefault = false) => {
    setBusy('content');
    try {
      await api.put('/admin/settings/content', { faq: useDefault ? null : faq, aboutIntro: about });
      if (useDefault) {
        setFaq(DEFAULT_FAQ.map((f) => ({ ...f })));
        setCustom(false);
      } else setCustom(true);
      toast.success('Website text saved');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  };
  const saveLists = async () => {
    setBusy('lists');
    try {
      const { data } = await api.put('/admin/settings/taxonomy', lists);
      setLists(data.taxonomy);
      toast.success('Lists saved. New words show up in suggestions after a page refresh.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  };
  const editFaq = (i, k, v) => setFaq((list) => list.map((f, j) => (j === i ? { ...f, [k]: v } : f)));

  if (!faq || !lists)
    return (
      <AdminShell title="Content & lists">
        <Spinner className="py-20" />
      </AdminShell>
    );

  return (
    <AdminShell title="Content & lists" subtitle="Change the FAQ and About text on the website, and add skills, cities and job titles to the suggestion lists.">
      <div className="space-y-4">
        <section className="glass rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">FAQ on the home page</h2>
              <p className="text-sm text-white/55">{custom ? 'Using your edited FAQ.' : 'Using the built-in FAQ. Edit and save to change it.'}</p>
            </div>
            <div className="flex gap-2">
              {custom && (
                <Button className="btn-ghost text-sm" onClick={() => window.confirm('Go back to the built-in FAQ?') && saveContent(true)}>
                  Use built-in FAQ
                </Button>
              )}
              <Button className="btn-primary text-sm" loading={busy === 'content'} onClick={() => saveContent(false)}>
                <Save size={16} /> Save text
              </Button>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {faq.map((f, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                <div className="flex gap-2">
                  <Input value={f.q} onChange={(e) => editFaq(i, 'q', e.target.value)} maxLength={200} placeholder="Question" aria-label={`Question ${i + 1}`} />
                  <button onClick={() => setFaq((list) => list.filter((_, j) => j !== i))} className="rounded-xl px-2.5 text-danger hover:bg-red-500/10" aria-label="Remove question">
                    <Trash2 size={16} />
                  </button>
                </div>
                <Textarea value={f.a} onChange={(e) => editFaq(i, 'a', e.target.value)} maxLength={1000} placeholder="Answer" className="mt-2" aria-label={`Answer ${i + 1}`} />
              </div>
            ))}
            {faq.length < 20 && (
              <button onClick={() => setFaq((list) => [...list, { q: '', a: '' }])} className="btn-ghost text-sm">
                <Plus size={16} /> Add a question
              </button>
            )}
          </div>
          <Field label="About page introduction" hint="Optional. Replaces the paragraph under the heading on /about." className="mt-6">
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} maxLength={1000} className="min-h-28" placeholder="Glide Recruit is an Indian hiring platform…" />
          </Field>
        </section>

        <section className="glass rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Suggestion lists</h2>
              <p className="text-sm text-white/55">Extra words added to the built-in lists that appear while users type. Press Enter or a comma after each.</p>
            </div>
            <Button className="btn-primary text-sm" loading={busy === 'lists'} onClick={saveLists}>
              <Save size={16} /> Save lists
            </Button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Field label="Extra skills" as="div">
              <TagInput options={[]} value={lists.skills} onChange={(v) => setLists({ ...lists, skills: v })} placeholder="e.g. Shopify, Zoho CRM" />
            </Field>
            <Field label="Extra cities" as="div">
              <TagInput options={[]} value={lists.cities} onChange={(v) => setLists({ ...lists, cities: v })} placeholder="e.g. Kishangarh" />
            </Field>
            <Field label="Extra job titles" as="div">
              <TagInput options={[]} value={lists.roles} onChange={(v) => setLists({ ...lists, roles: v })} placeholder="e.g. Prompt Engineer" />
            </Field>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
