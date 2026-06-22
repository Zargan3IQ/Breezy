'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import type { AccountStatus, UserRole, UserSearchResult } from '@/types/user';
import type { BackendPost, BackendReport } from '@/types/post';
import { banUser, reinstateUser, searchUsers, suspendUser, updateUserRole } from '@/lib/api/users';
import { deletePost, fetchPostsByIds, fetchReports, updateReportStatus } from '@/lib/api/posts';
import { fetchPublicUserById } from '@/lib/api/users';

const statusBadgeClass: Record<AccountStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-amber-50 text-amber-700 border-amber-200',
  banned: 'bg-red-50 text-red-700 border-red-200',
};

const roleBadgeClass: Record<UserRole, string> = {
  user: 'app-surface-muted app-text border app-border-subtle',
  moderator: 'bg-sky-500/12 text-sky-700 border-sky-200 dark:border-sky-900 dark:text-sky-300',
  admin: 'bg-fuchsia-500/12 text-fuchsia-700 border-fuchsia-200 dark:border-fuchsia-900 dark:text-fuchsia-300',
};

const toDefaultSuspendUntil = () => {
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return nextWeek.toISOString().slice(0, 16);
};

export default function StaffPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation('staff');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [roleSelections, setRoleSelections] = useState<Record<string, UserRole>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [suspendUntilByUser, setSuspendUntilByUser] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<BackendReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportPostMap, setReportPostMap] = useState<Record<string, BackendPost>>({});
  const [reportAuthorMap, setReportAuthorMap] = useState<Record<string, string>>({});

  const isStaff = user?.role === 'admin' || user?.role === 'moderator';
  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language ?? 'fr';

  const ROLE_LABELS: Record<UserRole, string> = {
    user: t('roles.user'),
    moderator: t('roles.moderator'),
    admin: t('roles.admin'),
  };

  const STATUS_LABELS: Record<AccountStatus, string> = {
    active: t('statuses.active'),
    suspended: t('statuses.suspended'),
    banned: t('statuses.banned'),
  };

  const groupedReports = Object.values(
    reports.reduce<Record<string, { latestReport: BackendReport; reportCount: number }>>((accumulator, report) => {
      const currentEntry = accumulator[report.target_id];

      if (!currentEntry) {
        accumulator[report.target_id] = {
          latestReport: report,
          reportCount: 1,
        };
        return accumulator;
      }

      const currentDate = new Date(currentEntry.latestReport.createdAt).getTime();
      const nextDate = new Date(report.createdAt).getTime();

      accumulator[report.target_id] = {
        latestReport: nextDate > currentDate ? report : currentEntry.latestReport,
        reportCount: currentEntry.reportCount + 1,
      };

      return accumulator;
    }, {})
  );

  useEffect(() => {
    if (!isStaff) return;

    const loadReports = async () => {
      setIsLoadingReports(true);

      try {
        const pendingReports = (await fetchReports('pending')).filter((entry) => entry.target_type === 'post');
        setReports(pendingReports);

        const uniquePostIds = [...new Set(pendingReports.map((entry) => entry.target_id))];
        const posts = await fetchPostsByIds(uniquePostIds);
        const nextPostMap = Object.fromEntries(posts.map((post) => [post._id, post]));
        setReportPostMap(nextPostMap);

        const uniqueAuthorIds = [...new Set(posts.map((post) => post.authorId))];
        const users = await Promise.allSettled(uniqueAuthorIds.map(fetchPublicUserById));
        const nextAuthorMap: Record<string, string> = {};
        users.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            nextAuthorMap[uniqueAuthorIds[index]] = result.value.username;
          }
        });
        setReportAuthorMap(nextAuthorMap);
      } catch {
        setError(t('errors.load_reports'));
      } finally {
        setIsLoadingReports(false);
      }
    };

    void loadReports();
  }, [isStaff, t]);

  const applyUserUpdate = (updatedUser: UserSearchResult) => {
    setResults((currentResults) =>
      currentResults.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry))
    );
    setRoleSelections((currentSelections) => ({
      ...currentSelections,
      [updatedUser.id]: updatedUser.role,
    }));
  };

  const loadUsers = async (searchValue: string) => {
    if (!searchValue.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const foundUsers = await searchUsers(searchValue, { includeInactive: true });
      setResults(foundUsers);
      setRoleSelections(Object.fromEntries(foundUsers.map((entry) => [entry.id, entry.role])));
      setSuspendUntilByUser((currentMap) => {
        const nextMap = { ...currentMap };
        foundUsers.forEach((entry) => {
          if (!nextMap[entry.id]) {
            nextMap[entry.id] = toDefaultSuspendUntil();
          }
        });
        return nextMap;
      });
    } catch {
      setError(t('errors.load_accounts'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadUsers(query);
  };

  const handleRoleUpdate = async (targetUser: UserSearchResult) => {
    const nextRole = roleSelections[targetUser.id];
    if (!nextRole || nextRole === targetUser.role) {
      return;
    }

    setPendingUserId(targetUser.id);
    setError(null);
    setMessage(null);

    try {
      const updatedUser = await updateUserRole(targetUser.id, nextRole);
      applyUserUpdate({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
      setMessage(t('messages.role_updated', { username: updatedUser.username }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('errors.update_role'));
    } finally {
      setPendingUserId(null);
    }
  };

  const handleSuspend = async (targetUser: UserSearchResult) => {
    const until = suspendUntilByUser[targetUser.id];
    if (!until) {
      setError(t('errors.suspend_until_required'));
      return;
    }

    setPendingUserId(targetUser.id);
    setError(null);
    setMessage(null);

    try {
      const updatedUser = await suspendUser(targetUser.id, new Date(until).toISOString(), reasons[targetUser.id]);
      applyUserUpdate({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
      setMessage(t('messages.account_suspended', { username: updatedUser.username }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('errors.suspend_account'));
    } finally {
      setPendingUserId(null);
    }
  };

  const handleBan = async (targetUser: UserSearchResult) => {
    setPendingUserId(targetUser.id);
    setError(null);
    setMessage(null);

    try {
      const updatedUser = await banUser(targetUser.id, reasons[targetUser.id]);
      applyUserUpdate({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
      setMessage(t('messages.account_banned', { username: updatedUser.username }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('errors.ban_account'));
    } finally {
      setPendingUserId(null);
    }
  };

  const handleReinstate = async (targetUser: UserSearchResult) => {
    setPendingUserId(targetUser.id);
    setError(null);
    setMessage(null);

    try {
      const updatedUser = await reinstateUser(targetUser.id);
      applyUserUpdate({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
      setMessage(t('messages.account_reinstated', { username: updatedUser.username }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('errors.reinstate_account'));
    } finally {
      setPendingUserId(null);
    }
  };

  const handleDismissReport = async (targetId: string) => {
    const reportsToDismiss = reports.filter((entry) => entry.target_id === targetId);
    if (reportsToDismiss.length === 0) {
      return;
    }

    setPendingReportId(targetId);
    setError(null);
    setMessage(null);

    try {
      await Promise.all(reportsToDismiss.map((report) => updateReportStatus(report._id, 'dismissed')));
      setReports((currentReports) => currentReports.filter((entry) => entry.target_id !== targetId));
      setMessage(t('messages.report_dismissed', { count: reportsToDismiss.length }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('errors.update_report'));
    } finally {
      setPendingReportId(null);
    }
  };

  const handleDeleteReportedPost = async (report: BackendReport) => {
    const relatedPost = reportPostMap[report.target_id];
    if (!relatedPost) {
      setError(t('errors.reported_post_missing'));
      return;
    }

    if (!window.confirm(t('reports.delete_confirm'))) {
      return;
    }

    setDeletingPostId(relatedPost._id);
    setError(null);
    setMessage(null);

    try {
      await deletePost(relatedPost._id);
      setReports((currentReports) => currentReports.filter((entry) => entry.target_id !== relatedPost._id));
      setReportPostMap((currentMap) => {
        const nextMap = { ...currentMap };
        delete nextMap[relatedPost._id];
        return nextMap;
      });
      setMessage(t('messages.post_deleted'));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('errors.delete_post'));
    } finally {
      setDeletingPostId(null);
    }
  };

  const availableRoleOptions: UserRole[] = user?.role === 'admin'
    ? ['user', 'moderator', 'admin']
    : ['moderator'];

  if (!isStaff) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.16),_transparent_42%)] px-4 py-12 sm:px-6 app-page">
        <section className="mx-auto max-w-3xl rounded-[2rem] border app-border app-surface-elevated p-10 text-center shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur">
          <Shield className="mx-auto mb-4 text-teal-600" size={36} />
          <h1 className="text-3xl font-black app-text">{t('guard.title')}</h1>
          <p className="mt-3 text-sm app-text-muted">{t('guard.description')}</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-700">
            {t('guard.back_home')}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.16),_transparent_42%)] px-4 py-8 sm:px-6 lg:px-10 app-page">
      <section className="mx-auto max-w-6xl rounded-[2rem] border app-border app-surface-elevated p-6 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 border-b app-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-teal-700">{t('header.eyebrow')}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight app-text">{t('header.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm app-text-muted">
              {t('header.description')}
            </p>
          </div>

          <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-700 dark:text-teal-300">
            {t('header.connected_as')} <span className="font-bold">{ROLE_LABELS[user.role]}</span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border app-border app-surface-muted p-4 sm:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-full app-surface px-4 py-3 shadow-sm">
            <Search size={18} className="app-text-soft" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full bg-transparent text-sm app-text outline-none placeholder:app-text-muted"
            />
          </label>

          <Button type="submit" size="md" className="sm:min-w-44" disabled={isLoading}>
            {isLoading ? t('search.loading') : t('search.submit')}
          </Button>
        </form>

        {error && <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {message && <p className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}

        <section className="mt-6 rounded-[1.5rem] border app-border app-surface-muted p-4 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black app-text">{t('reports.title')}</h2>
              <p className="text-sm app-text-muted">{t('reports.description')}</p>
            </div>
            <span className="text-sm font-semibold app-text-muted">{t('reports.pending_count', { count: groupedReports.length })}</span>
          </div>

          {isLoadingReports && (
            <p className="mt-4 text-sm app-text-muted">{t('reports.loading')}</p>
          )}

          {!isLoadingReports && groupedReports.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed app-border px-4 py-8 text-center text-sm app-text-muted">
              {t('reports.empty')}
            </div>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {groupedReports.map(({ latestReport, reportCount }) => {
              const report = latestReport;
              const relatedPost = reportPostMap[report.target_id];
              const isPending = pendingReportId === report.target_id;
              const isDeleting = deletingPostId === report.target_id;
              const authorName = relatedPost ? (reportAuthorMap[relatedPost.authorId] ?? relatedPost.authorId) : t('reports.author_missing');

              return (
                <article key={report._id} className="rounded-[1.5rem] border app-border app-surface p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-600">{t(`report_reasons.${report.reason}`)}</p>
                      <h3 className="mt-2 text-lg font-black app-text">@{authorName}</h3>
                      <p className="mt-1 text-xs app-text-soft">{t('reports.reported_at', { date: new Date(report.createdAt).toLocaleString(resolvedLanguage) })}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-300">
                        {t('reports.count', { count: reportCount })}
                      </span>
                      <Link href={`/posts/${report.target_id}`} className="text-sm font-semibold text-teal-700 hover:underline">
                        {t('reports.view_post')}
                      </Link>
                    </div>
                  </div>

                  <p className="mt-4 rounded-2xl app-surface-muted px-4 py-3 text-sm app-text">
                    {relatedPost ? relatedPost.content : t('reports.content_missing')}
                  </p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full sm:w-auto"
                      onClick={() => handleDismissReport(report.target_id)}
                      disabled={isPending || isDeleting}
                    >
                      {t('reports.dismiss')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="w-full sm:w-auto"
                      onClick={() => handleDeleteReportedPost(report)}
                      disabled={!relatedPost || isPending || isDeleting}
                    >
                      {isDeleting ? t('reports.deleting') : t('reports.delete_post')}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {results.length === 0 && !isLoading && !error && (
          <div className="mt-6 rounded-[1.5rem] border border-dashed app-border px-6 py-12 text-center text-sm app-text-muted">
            {t('accounts.empty')}
          </div>
        )}

        <div className="mt-6 grid gap-4 2xl:grid-cols-2">
          {results.map((entry) => {
            const currentRoleSelection = roleSelections[entry.id] ?? entry.role;
            const isPending = pendingUserId === entry.id;
            const canEditRole = user.role === 'admin' || (user.role === 'moderator' && entry.role === 'user');
            const canModerate = user.role === 'admin' || entry.role === 'user';

            return (
              <article key={entry.id} className="overflow-hidden rounded-[1.75rem] border app-border app-surface p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${encodeURIComponent(entry.username)}`} className="block break-all text-lg font-black app-text hover:text-teal-700">
                      @{entry.username}
                    </Link>
                    <p className="mt-1 break-all text-sm app-text-muted">{entry.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${roleBadgeClass[entry.role]}`}>
                        {ROLE_LABELS[entry.role]}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass[entry.status]}`}>
                        {STATUS_LABELS[entry.status]}
                      </span>
                    </div>
                  </div>

                  <div className="max-w-full break-all text-left text-xs font-semibold uppercase tracking-[0.2em] app-text-soft sm:max-w-[13rem] sm:text-right">
                    {entry.id}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 border-t app-border-subtle pt-5">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                    <label className="grid min-w-0 gap-2 text-sm font-semibold app-text">
                      {t('accounts.target_role')}
                      <select
                        value={currentRoleSelection}
                        onChange={(event) => setRoleSelections((current) => ({ ...current, [entry.id]: event.target.value as UserRole }))}
                        disabled={!canEditRole || isPending}
                        className="min-w-0 w-full rounded-2xl border app-input px-4 py-3 text-sm font-medium outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {availableRoleOptions.map((roleOption) => (
                          <option key={roleOption} value={roleOption}>{ROLE_LABELS[roleOption]}</option>
                        ))}
                      </select>
                    </label>

                    <Button type="button" className="w-full xl:w-auto" onClick={() => handleRoleUpdate(entry)} disabled={!canEditRole || isPending || currentRoleSelection === entry.role}>
                      {t('accounts.update_role')}
                    </Button>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <label className="grid min-w-0 gap-2 text-sm font-semibold app-text">
                      {t('accounts.suspend_until')}
                      <input
                        type="datetime-local"
                        value={suspendUntilByUser[entry.id] ?? ''}
                        onChange={(event) => setSuspendUntilByUser((current) => ({ ...current, [entry.id]: event.target.value }))}
                        disabled={!canModerate || isPending}
                        className="min-w-0 w-full rounded-2xl border app-input px-4 py-3 text-sm outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>

                    <label className="grid min-w-0 gap-2 text-sm font-semibold app-text">
                      {t('accounts.reason')}
                      <input
                        type="text"
                        value={reasons[entry.id] ?? ''}
                        onChange={(event) => setReasons((current) => ({ ...current, [entry.id]: event.target.value }))}
                        placeholder={t('accounts.reason_placeholder')}
                        disabled={!canModerate || isPending}
                        className="min-w-0 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => handleSuspend(entry)} disabled={!canModerate || isPending}>
                      {t('accounts.suspend')}
                    </Button>
                    <Button type="button" variant="danger" className="w-full sm:w-auto" onClick={() => handleBan(entry)} disabled={!canModerate || isPending}>
                      {t('accounts.ban')}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => handleReinstate(entry)} disabled={!canModerate || isPending || entry.status === 'active'}>
                      {t('accounts.reinstate')}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}