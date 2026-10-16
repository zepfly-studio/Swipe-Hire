import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyShell from '../../components/CompanyShell';
import FeedFilters, { EMPTY_FILTERS, filterParams, fromSaved } from '../../components/FeedFilters';
import { Button, Spinner } from '../../components/ui';
import { api, cx, errorMessage } from '../../lib/api';

function filterSummary(filters = {}) {
  return [
    filters.role,
    filters.location || (filters.role && 'All India'),
    filters.minExp != null || filters.maxExp != null
      ? `${filters.minExp ?? 0}–${filters.maxExp ?? 'Any'} yrs`
      : null,
    filters.skills?.length ? filters.skills.join(', ') : null,
  ].filter(Boolean);
}

export default function CompanyFiltersPage() {
  const navigate = useNavigate();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadSearches = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/company/searches');
      setSearches(data.searches);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSearches();
  }, []);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const saveSearch = async (name, filters) => {
    try {
      const { data } = await api.post('/company/searches', { name, filters: filterParams(filters), alerts: true });
      setSearches((current) => [data.search, ...current]);
      toast.success(`Saved "${name}".`);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  const updateSearch = async (id, name, filters) => {
    try {
      const { data } = await api.patch(`/company/searches/${id}`, { name, filters: filterParams(filters) });
      setSearches((current) => current.map((search) => (search.id === id ? data.search : search)));
      toast.success(`Updated "${data.search.name}".`);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  const toggleAlerts = async (search) => {
    const updated = { ...search, alerts: !search.alerts };
    setSearches((current) => current.map((item) => (item.id === search.id ? updated : item)));
    try {
      const { data } = await api.patch(`/company/searches/${search.id}`, { alerts: updated.alerts });
      setSearches((current) => current.map((item) => (item.id === search.id ? data.search : item)));
    } catch (err) {
      setSearches((current) => current.map((item) => (item.id === search.id ? search : item)));
      toast.error(errorMessage(err));
    }
  };

  const deleteSearch = async (search) => {
    try {
      await api.delete(`/company/searches/${search.id}`);
      setSearches((current) => current.filter((item) => item.id !== search.id));
      toast.success(`Deleted "${search.name}".`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const applySearch = (search) => navigate(`/company/swipe?search=${encodeURIComponent(search.id)}`);
  const removeFilters = () => navigate('/company/swipe', { state: { filters: EMPTY_FILTERS } });
  const applyNewFilters = (filters) => navigate('/company/swipe', { state: { filters } });

  return (
    <CompanyShell>
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Saved filters</h1>
            <p className="mt-1 text-sm text-white/50">Apply, edit, or remove your candidate searches.</p>
          </div>
          <Button
            className="btn-primary shrink-0"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={17} />
            New filter
          </Button>
        </div>

        {loading && <Spinner className="min-h-48" />}
        {!loading && error && (
          <div className="glass rounded-2xl p-5">
            <p className="text-sm text-danger">{error}</p>
            <Button className="btn-ghost mt-3" onClick={loadSearches}>Try again</Button>
          </div>
        )}
        {!loading && !error && !searches.length && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="font-semibold">No saved filters yet</p>
            <p className="mt-1 text-sm text-white/50">Create a filter to start finding matching candidates.</p>
          </div>
        )}
        {!loading && !error && searches.length > 0 && (
          <div className="space-y-3">
            {searches.map((search) => {
              const summary = filterSummary(search.filters);
              return (
                <article key={search.id} className="glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold">{search.name}</h2>
                    <p className="mt-1 truncate text-sm text-white/50">
                      {summary.length ? summary.join(' · ') : 'Candidate filter'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button className="btn-primary px-3 py-2 text-sm" onClick={() => applySearch(search)}>Apply</Button>
                    <Button
                      className="btn-ghost px-3 py-2 text-sm"
                      onClick={() => {
                        setEditing(search);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button className="btn-ghost px-3 py-2 text-sm" onClick={removeFilters}>Remove</Button>
                    <Button
                      className="btn-ghost px-2.5 py-2 text-danger"
                      onClick={() => toggleAlerts(search)}
                      title={search.alerts ? 'Turn off new-candidate alerts' : 'Turn on new-candidate alerts'}
                      aria-label={search.alerts ? `Turn off alerts for ${search.name}` : `Turn on alerts for ${search.name}`}
                    >
                      {search.alerts ? <Bell size={16} /> : <BellOff size={16} />}
                    </Button>
                    <Button
                      className={cx('btn-ghost px-2.5 py-2 text-danger')}
                      onClick={() => deleteSearch(search)}
                      aria-label={`Delete ${search.name}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <FeedFilters
        open={formOpen}
        onClose={closeForm}
        value={editing ? fromSaved(editing.filters) : EMPTY_FILTERS}
        initialName={editing?.name || ''}
        initialSearchId={editing?.id || ''}
        showSavedSearches={false}
        onSaveSearch={saveSearch}
        onUpdateSearch={updateSearch}
        onSaved={closeForm}
        onApply={applyNewFilters}
      />
    </CompanyShell>
  );
}
