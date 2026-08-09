import React, { useState, useEffect, useMemo } from 'react';
import {
  ReviewItem,
  fetchReviews,
  approveReview,
  rejectReview,
  deleteReview,
  updateReview,
  submitReview,
  bulkApproveReviews,
  bulkRejectReviews,
  bulkDeleteReviews,
  bulkUpdateReviewPlacements,
  downloadReviewsAsCSV,
  downloadReviewsAsJSON,
  downloadSingleReview,
  REVIEW_PLACEMENT_OPTIONS,
} from '../lib/supabase';
import {
  ZkStarIcon,
  ZkTrashIcon,
  ZkPlusIcon,
  ZkCheckIcon,
  ZkSearchIcon,
  ZkDownloadIcon,
  ZkFilterIcon,
  ZkResetIcon,
  ZkEyeIcon,
} from './adminIcons';

export default function ReviewsEditor({ app }: { app: any }) {
  const { T, S, AdminBtn, Box, cfg } = app;
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [placementFilter, setPlacementFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // حالت انتخاب تکی و گروهی (Selected IDs)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // حالت‌های ویرایش درجا (Inline Editing State)
  const [editMap, setEditMap] = useState<
    Record<
      number,
      {
        name: string;
        courseId: string;
        rating: number;
        comment: string;
        placements: string[];
      }
    >
  >({});

  // مودال افزودن نظر جدید دستی
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newReview, setNewReview] = useState({
    name: '',
    courseId: 'تک دوره رشد قد',
    rating: 5,
    comment: '',
    status: 'approved' as 'approved' | 'pending',
    placements: ['home', 'courses', 'course_detail'],
  });

  // مودال تغییر دسته‌جمعی محل‌های نمایش (Bulk Placements Modal)
  const [bulkPlacementModalOpen, setBulkPlacementModalOpen] = useState(false);
  const [bulkTargetPlacements, setBulkTargetPlacements] = useState<string[]>(['home', 'courses', 'course_detail']);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchReviews('all');
      setReviews(data || []);
      const map: Record<number, any> = {};
      (data || []).forEach((r) => {
        map[r.id] = {
          name: r.reviewer_name || '',
          courseId: r.course_id || 'عمومی',
          rating: r.rating || 5,
          comment: r.comment || '',
          placements: r.placements && r.placements.length > 0 ? r.placements : ['home', 'courses', 'course_detail'],
        };
      });
      setEditMap(map);
    } catch (e) {
      console.error('Error loading reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const coursesList = useMemo(() => {
    const fromTabs: string[] = [];
    (cfg?.courseTabs || []).forEach((t: any) => {
      (t.courses || []).forEach((c: any) => {
        if (c.title) fromTabs.push(c.title);
      });
    });
    return Array.from(
      new Set(['عمومی', 'تک دوره رشد قد', 'دوره بی‌اشتهایی و وزن‌گیری', 'دوره هوش و تمرکز', ...fromTabs])
    );
  }, [cfg]);

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;
  const approvedCount = reviews.filter((r) => r.status === 'approved').length;
  const rejectedCount = reviews.filter((r) => r.status === 'rejected').length;

  const filtered = useMemo(() => {
    return reviews
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (courseFilter !== 'all' && (r.course_id || 'عمومی') !== courseFilter) return false;
        if (placementFilter !== 'all') {
          const currentPlaces =
            editMap[r.id]?.placements || r.placements || ['home', 'courses', 'course_detail'];
          if (
            !currentPlaces.includes(placementFilter) &&
            !currentPlaces.includes('all_places')
          ) {
            return false;
          }
        }
        if (search.trim()) {
          const kw = search.trim().toLowerCase();
          return (
            (r.reviewer_name || '').toLowerCase().includes(kw) ||
            (r.comment || '').toLowerCase().includes(kw) ||
            (r.course_id || '').toLowerCase().includes(kw)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortOrder === 'highest') return (b.rating || 5) - (a.rating || 5);
        if (sortOrder === 'lowest') return (a.rating || 5) - (b.rating || 5);
        return 0;
      });
  }, [reviews, statusFilter, courseFilter, placementFilter, search, sortOrder, editMap]);

  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // عملیات انتخاب و لغو انتخاب
  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    const allFilteredIds = filtered.map((r) => r.id);
    setSelectedIds(allFilteredIds);
    showToast(`تمام ${allFilteredIds.length} نظر فیلترشده با موفقیت انتخاب شدند.`);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
    showToast('انتخاب تمام نظرات لغو شد.');
  };

  const isAllSelected = filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id));
  const hasSomeSelected = selectedIds.length > 0;

  // عملیات تکی
  const handleApprove = async (id: number) => {
    await approveReview(id);
    await load();
    showToast('نظر با موفقیت تأیید و در بخش‌های مشخص‌شده قابل پخش شد.');
  };

  const handleReject = async (id: number) => {
    await rejectReview(id);
    await load();
    showToast('نظر به وضعیت غیرقابل پخش (رد شده) تغییر یافت.');
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('آیا از حذف کامل این نظر اطمینان دارید؟ این عملیات غیرقابل بازگشت است.')) return;
    await deleteReview(id);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    await load();
    showToast('نظر با موفقیت حذف شد.');
  };

  const handleTogglePlacement = (reviewId: number, placementId: string) => {
    const current = editMap[reviewId] || {
      name: '',
      courseId: 'عمومی',
      rating: 5,
      comment: '',
      placements: ['home', 'courses', 'course_detail'],
    };

    let updatedPlaces = [...(current.placements || [])];

    if (placementId === 'all_places') {
      if (updatedPlaces.includes('all_places')) {
        updatedPlaces = ['home', 'courses', 'course_detail'];
      } else {
        updatedPlaces = ['all_places', ...REVIEW_PLACEMENT_OPTIONS.map((p) => p.id)];
      }
    } else {
      if (updatedPlaces.includes(placementId)) {
        updatedPlaces = updatedPlaces.filter((p) => p !== placementId && p !== 'all_places');
      } else {
        updatedPlaces.push(placementId);
      }
    }

    setEditMap({
      ...editMap,
      [reviewId]: {
        ...current,
        placements: updatedPlaces,
      },
    });
  };

  const handleSaveEdit = async (r: ReviewItem) => {
    const edit = editMap[r.id];
    if (!edit) return;
    if (!edit.name.trim()) {
      alert('لطفاً نام والد را وارد نمایید.');
      return;
    }

    try {
      await updateReview(r.id, {
        reviewer_name: edit.name.trim(),
        course_id: edit.courseId,
        rating: edit.rating,
        comment: edit.comment.trim(),
        placements: edit.placements && edit.placements.length > 0 ? edit.placements : ['home', 'courses', 'course_detail'],
      });
      await load();
      showToast('تغییرات نظر و محل‌های نمایش با موفقیت ذخیره شد.');
    } catch (e) {
      console.error('Update review error:', e);
      alert('خطا در ذخیره تغییرات نظر.');
    }
  };

  // عملیات دسته‌جمعی (Bulk Actions)
  const handleBulkApprove = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    try {
      await bulkApproveReviews(selectedIds);
      await load();
      showToast(`تعداد ${selectedIds.length} نظر انتخاب‌شده با موفقیت تأیید و منتشر شدند.`);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      alert('خطا در تأیید گروهی نظرات.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    try {
      await bulkRejectReviews(selectedIds);
      await load();
      showToast(`تعداد ${selectedIds.length} نظر انتخاب‌شده به حالت غیرقابل پخش تغییر یافتند.`);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      alert('خطا در رد گروهی نظرات.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`آیا از حذف کامل ${selectedIds.length} نظر انتخاب‌شده اطمینان دارید؟`)) return;
    setLoading(true);
    try {
      await bulkDeleteReviews(selectedIds);
      await load();
      showToast(`تعداد ${selectedIds.length} نظر با موفقیت حذف شدند.`);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      alert('خطا در حذف گروهی نظرات.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBulkPlacements = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    try {
      await bulkUpdateReviewPlacements(selectedIds, bulkTargetPlacements);
      await load();
      setBulkPlacementModalOpen(false);
      showToast(`محل نمایش ${selectedIds.length} نظر انتخاب‌شده با موفقیت بروزرسانی شد.`);
    } catch (e) {
      console.error(e);
      alert('خطا در تغییر گروهی محل‌های نمایش.');
    } finally {
      setLoading(false);
    }
  };

  // دانلودها
  const handleDownloadSelectedCSV = () => {
    if (!selectedIds.length) {
      alert('لطفاً ابتدا حداقل یک نظر را انتخاب نمایید.');
      return;
    }
    const targetReviews = reviews.filter((r) => selectedIds.includes(r.id));
    downloadReviewsAsCSV(targetReviews, `zeynalikid-selected-reviews-${selectedIds.length}.csv`);
    showToast(`فایل اکسل ${selectedIds.length} نظر انتخابی دانلود شد.`);
  };

  const handleDownloadSelectedJSON = () => {
    if (!selectedIds.length) {
      alert('لطفاً ابتدا حداقل یک نظر را انتخاب نمایید.');
      return;
    }
    const targetReviews = reviews.filter((r) => selectedIds.includes(r.id));
    downloadReviewsAsJSON(targetReviews, `zeynalikid-selected-reviews-${selectedIds.length}.json`);
    showToast(`فایل JSON برای ${selectedIds.length} نظر انتخابی دانلود شد.`);
  };

  const handleDownloadAllCSV = () => {
    downloadReviewsAsCSV(reviews, `zeynalikid-all-reviews-${reviews.length}.csv`);
    showToast(`فایل اکسل کل نظرات (${reviews.length} مورد) دانلود شد.`);
  };

  const handleDownloadAllJSON = () => {
    downloadReviewsAsJSON(reviews, `zeynalikid-all-reviews-${reviews.length}.json`);
    showToast(`فایل کامل JSON نظرات (${reviews.length} مورد) دانلود شد.`);
  };

  const handleAddNewReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.name.trim()) {
      alert('لطفاً نام کاربر را وارد نمایید.');
      return;
    }
    if (!newReview.comment.trim()) {
      alert('لطفاً متن نظر را وارد نمایید.');
      return;
    }

    try {
      const created = await submitReview(
        newReview.courseId,
        newReview.name.trim(),
        newReview.rating,
        newReview.comment.trim(),
        newReview.placements
      );
      if (newReview.status === 'approved' && created?.id) {
        await approveReview(created.id);
      }
      await load();
      setAddModalOpen(false);
      setNewReview({
        name: '',
        courseId: 'تک دوره رشد قد',
        rating: 5,
        comment: '',
        status: 'approved',
        placements: ['home', 'courses', 'course_detail'],
      });
      showToast('نظر جدید با موفقیت ثبت و در بخش‌های تعیین‌شده منتشر گردید.');
    } catch (err) {
      console.error('Create review fail:', err);
      alert('خطایی در ثبت نظر رخ داد.');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return { background: '#D1FAE5', color: '#065F46', label: '✓ قابل پخش در سایت' };
    if (status === 'rejected') return { background: '#FEE2E2', color: '#991B1B', label: '✕ غیرقابل پخش' };
    return { background: '#FEF3C7', color: '#92400E', label: '⏳ در انتظار بررسی' };
  };

  const fmtDate = (dString?: string) => {
    if (!dString) return '—';
    try {
      return new Date(dString).toLocaleDateString('fa-IR');
    } catch {
      return dString;
    }
  };

  return (
    <div>
      <Box title="مدیریت جامع نظرات، تجربیات و محل‌های نمایش (Reviews Management)">
        {/* Toast Feedback */}
        {toastMsg && (
          <div
            style={{
              padding: '12px 18px',
              background: '#ecfdf5',
              border: '1px solid #10b981',
              color: '#047857',
              borderRadius: 14,
              fontSize: 13.5,
              fontWeight: 800,
              marginBottom: 16,
              boxShadow: '0 4px 14px rgba(16,185,129,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              animation: 'fade .25s ease both',
            }}
          >
            <span style={{ fontSize: 16 }}>✓</span>
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Top Header Toolbar & Global Download Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            background: T.soft || '#F4F1EA',
            padding: '12px 16px',
            borderRadius: T.cardRadius || 16,
            border: `1px solid ${T.brd || '#E5E0D8'}`,
          }}
        >
          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `همه نظرات (${reviews.length})` },
              { id: 'approved', label: `قابل پخش (${approvedCount})` },
              { id: 'pending', label: `در انتظار (${pendingCount})` },
              { id: 'rejected', label: `غیرقابل پخش (${rejectedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setPage(1);
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: T.btnRadius || 12,
                  border: `1px solid ${statusFilter === tab.id ? (T.acc || '#0F766E') : (T.brd || '#E5E0D8')}`,
                  background: statusFilter === tab.id ? (T.acc || '#0F766E') : (T.card || '#fff'),
                  color: statusFilter === tab.id ? '#fff' : (T.txt || '#1F2937'),
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all .15s ease',
                  boxShadow: statusFilter === tab.id ? '0 2px 8px rgba(15,118,110,0.25)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action Buttons: Add Review, Full CSV Download, Full JSON Download */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleDownloadAllCSV}
              title="دانلود فایل اکسل (CSV با کدگذاری UTF-8 فارسی) از تمامی نظرات ثبت‌شده"
              style={{
                ...AdminBtn(),
                background: '#047857',
                color: '#fff',
                border: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                fontSize: 12.5,
              }}
            >
              <ZkDownloadIcon size={14} />
              <span>دانلود اکسل کل نظرات</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAllJSON}
              title="دانلود کامل دیتابیس نظرات به فرمت JSON"
              style={{
                ...AdminBtn(),
                background: T.card || '#fff',
                color: T.txt || '#1F2937',
                border: `1px solid ${T.brd || '#E5E0D8'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                fontSize: 12.5,
              }}
            >
              <ZkDownloadIcon size={14} />
              <span>خروجی JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              style={{
                ...AdminBtn(),
                background: T.grad || T.acc || '#0F766E',
                color: '#fff',
                border: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              <ZkPlusIcon size={14} />
              <span>+ افزودن نظر جدید دستی</span>
            </button>
          </div>
        </div>

        {/* Filters, Placement Filter, Search & Sort Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 1.3fr) minmax(140px, 1fr) minmax(160px, 1.1fr) 140px',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="جستجو در نام والد، متن نظر یا دوره..."
              style={S.inp}
            />
          </div>

          {/* فیلتر دوره */}
          <select
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setPage(1);
            }}
            style={S.inp}
          >
            <option value="all">همه دوره‌ها</option>
            {coursesList.map((c) => (
              <option key={c} value={c}>
                دوره: {c}
              </option>
            ))}
          </select>

          {/* فیلتر محل نمایش در بخش‌های سایت */}
          <select
            value={placementFilter}
            onChange={(e) => {
              setPlacementFilter(e.target.value);
              setPage(1);
            }}
            style={{
              ...S.inp,
              borderColor: placementFilter !== 'all' ? (T.acc || '#0F766E') : undefined,
              fontWeight: placementFilter !== 'all' ? 700 : 400,
            }}
          >
            <option value="all">همه محل‌های نمایش سایت</option>
            {REVIEW_PLACEMENT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                محل: {opt.label}
              </option>
            ))}
          </select>

          {/* مرتب‌سازی */}
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as any);
              setPage(1);
            }}
            style={S.inp}
          >
            <option value="newest">جدیدترین اول</option>
            <option value="oldest">قدیمی‌ترین اول</option>
            <option value="highest">بیشترین امتیاز (۵ ستاره)</option>
            <option value="lowest">کمترین امتیاز</option>
          </select>
        </div>

        {/* Selection Controller Toolbar (Select All, Deselect All, Stats) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            padding: '10px 14px',
            background: hasSomeSelected ? '#eff6ff' : (T.card || '#fff'),
            border: `1px solid ${hasSomeSelected ? '#93c5fd' : (T.brd || '#E5E0D8')}`,
            borderRadius: 12,
            marginBottom: 16,
            transition: 'all .2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* دکمه انتخاب همه */}
            <button
              type="button"
              onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid ${isAllSelected ? '#2563eb' : (T.brd || '#E5E0D8')}`,
                background: isAllSelected ? '#2563eb' : (T.soft || '#F4F1EA'),
                color: isAllSelected ? '#fff' : (T.txt || '#1F2937'),
                fontWeight: 800,
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => {}}
                style={{ cursor: 'pointer', pointerEvents: 'none' }}
              />
              <span>{isAllSelected ? 'لغو انتخاب همه' : `انتخاب همه (${filtered.length} نظر)`}</span>
            </button>

            {hasSomeSelected && (
              <button
                type="button"
                onClick={handleDeselectAll}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${T.brd || '#E5E0D8'}`,
                  background: 'transparent',
                  color: T.mut || '#6B7280',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                لغو انتخاب
              </button>
            )}

            <span style={{ fontSize: 13, fontWeight: 700, color: hasSomeSelected ? '#1e40af' : T.mut }}>
              {hasSomeSelected ? (
                <>
                  <b style={{ color: '#2563eb', fontSize: 14 }}>{selectedIds.length}</b> نظر از{' '}
                  <b>{filtered.length}</b> نظر فیلترشده انتخاب شده است
                </>
              ) : (
                <>تعداد کل نظرات فیلترشده: {filtered.length} مورد</>
              )}
            </span>
          </div>

          {/* Quick Bulk Action Buttons in Selection Bar */}
          {hasSomeSelected && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleBulkApprove}
                style={{
                  ...AdminBtn(),
                  padding: '6px 12px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 0,
                  fontSize: 12,
                  fontWeight: 700,
                }}
                title="تایید و پخش تمام نظرات انتخاب‌شده در سایت"
              >
                ✓ تایید ({selectedIds.length})
              </button>

              <button
                type="button"
                onClick={handleBulkReject}
                style={{
                  ...AdminBtn(),
                  padding: '6px 12px',
                  background: '#eab308',
                  color: '#422006',
                  border: 0,
                  fontSize: 12,
                  fontWeight: 700,
                }}
                title="رد و غیرقابل پخش کردن نظرات انتخاب‌شده"
              >
                ✕ رد ({selectedIds.length})
              </button>

              <button
                type="button"
                onClick={() => setBulkPlacementModalOpen(true)}
                style={{
                  ...AdminBtn(),
                  padding: '6px 12px',
                  background: '#7c3aed',
                  color: '#fff',
                  border: 0,
                  fontSize: 12,
                  fontWeight: 700,
                }}
                title="تعیین دسته‌جمعی محل‌های نمایش در سایت برای نظرات انتخاب‌شده"
              >
                🏷️ تنظیم جایگاه ({selectedIds.length})
              </button>

              <button
                type="button"
                onClick={handleDownloadSelectedCSV}
                style={{
                  ...AdminBtn(),
                  padding: '6px 12px',
                  background: '#0284c7',
                  color: '#fff',
                  border: 0,
                  fontSize: 12,
                  fontWeight: 700,
                }}
                title="دانلود اکسل اختصاصی نظرات انتخاب‌شده"
              >
                <ZkDownloadIcon size={12} /> دانلود انتخابی ({selectedIds.length})
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                style={{
                  ...AdminBtn(),
                  padding: '6px 12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  fontSize: 12,
                  fontWeight: 700,
                }}
                title="حذف دسته‌جمعی نظرات انتخاب‌شده"
              >
                <ZkTrashIcon size={12} /> حذف ({selectedIds.length})
              </button>
            </div>
          )}
        </div>

        {/* Reviews List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: T.mut }}>در حال بارگذاری نظرات...</div>
        ) : paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36, color: T.mut, background: T.card || '#fff', borderRadius: 14 }}>
            هیچ نظری مطابق با فیلترها و جستجوی شما یافت نشد.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {paginated.map((r) => {
              const isSelected = selectedIds.includes(r.id);
              const st = getStatusBadge(r.status);
              const currentEdit = editMap[r.id] || {
                name: r.reviewer_name || '',
                courseId: r.course_id || 'عمومی',
                rating: r.rating || 5,
                comment: r.comment || '',
                placements: r.placements && r.placements.length > 0 ? r.placements : ['home', 'courses', 'course_detail'],
              };

              return (
                <div
                  key={r.id}
                  style={{
                    background: isSelected ? '#f8fafc' : (T.card || '#fff'),
                    borderRadius: T.cardRadius || 14,
                    border: isSelected
                      ? '2px solid #2563eb'
                      : `1px solid ${r.status === 'approved' ? '#86efac' : r.status === 'rejected' ? '#fca5a5' : (T.brd || '#E5E0D8')}`,
                    padding: 16,
                    boxShadow: isSelected
                      ? '0 6px 20px rgba(37,99,235,0.12)'
                      : T.neuOut || '0 4px 15px rgba(0,0,0,0.06)',
                    position: 'relative',
                    transition: 'all .15s ease',
                  }}
                >
                  {/* Top Bar: Checkbox (Select Button), Name, Rating, Status & Single Download */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                      marginBottom: 12,
                      borderBottom: `1px solid ${T.brd || '#E5E0D8'}22`,
                      paddingBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {/* دکمه تیک انتخاب تکی */}
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          background: isSelected ? '#dbeafe' : (T.soft || '#F4F1EA'),
                          padding: '5px 10px',
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? '#3b82f6' : (T.brd || '#E5E0D8')}`,
                          fontWeight: 800,
                          fontSize: 12,
                          color: isSelected ? '#1e40af' : (T.txt || '#1F2937'),
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(r.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <span>{isSelected ? '✓ انتخاب‌شده' : 'انتخاب'}</span>
                      </label>

                      <span style={{ ...st, padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                        {st.label}
                      </span>
                      <span style={{ fontSize: 11.5, color: T.mut }}>تاریخ: {fmtDate(r.created_at)}</span>
                      <span style={{ fontSize: 11.5, color: T.mut, fontFamily: 'monospace' }}>#{r.id}</span>
                    </div>

                    {/* Interactive Star Rating Selector & Single Download */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, direction: 'ltr' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => {
                              setEditMap({
                                ...editMap,
                                [r.id]: { ...currentEdit, rating: star },
                              });
                            }}
                            title={`${star} ستاره`}
                            style={{
                              background: 'transparent',
                              border: 0,
                              cursor: 'pointer',
                              padding: 2,
                              color: star <= currentEdit.rating ? '#F59E0B' : '#D1D5DB',
                              fontSize: 18,
                              lineHeight: 1,
                              transition: 'color .15s ease',
                            }}
                          >
                            ★
                          </button>
                        ))}
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginInlineStart: 4 }}>
                          ({currentEdit.rating} از ۵)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => downloadSingleReview(r)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 8,
                          border: `1px solid ${T.brd || '#E5E0D8'}`,
                          background: T.soft || '#F4F1EA',
                          color: T.txt || '#1F2937',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="دانلود اکسل تک‌نظر با جزئیات کامل"
                      >
                        <ZkDownloadIcon size={12} />
                        <span>دانلود این نظر</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Editable Fields: Name & Course */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(140px, 1fr) minmax(180px, 1.4fr)',
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, color: T.mut, marginBottom: 4, fontWeight: 700 }}>
                        نام والد / کاربر:
                      </label>
                      <input
                        type="text"
                        style={S.inp}
                        value={currentEdit.name}
                        onChange={(e) => {
                          setEditMap({
                            ...editMap,
                            [r.id]: { ...currentEdit, name: e.target.value },
                          });
                        }}
                        placeholder="نام والد"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, color: T.mut, marginBottom: 4, fontWeight: 700 }}>
                        دوره یا بخش مربوطه:
                      </label>
                      <select
                        style={S.inp}
                        value={currentEdit.courseId}
                        onChange={(e) => {
                          setEditMap({
                            ...editMap,
                            [r.id]: { ...currentEdit, courseId: e.target.value },
                          });
                        }}
                      >
                        {coursesList.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* بخش دسترسی جداگانه برای هر نظر: انتخاب محل‌های نمایش در سایت */}
                  <div
                    style={{
                      marginBottom: 12,
                      background: T.soft || '#F4F1EA',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1px solid ${T.brd || '#E5E0D8'}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      <label style={{ fontSize: 12, color: T.ttl || '#0F766E', fontWeight: 800, margin: 0 }}>
                        📍 دسترسی و محل‌های مجاز نمایش این نظر در سایت:
                      </label>
                      <span style={{ fontSize: 11, color: T.mut }}>
                        (برای فعال/غیرفعال کردن هر بخش روی نشان آن کلیک کنید)
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {REVIEW_PLACEMENT_OPTIONS.map((opt) => {
                        const isAll = opt.id === 'all_places';
                        const isPlaced =
                          (currentEdit.placements || []).includes(opt.id) ||
                          (!isAll && (currentEdit.placements || []).includes('all_places'));

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleTogglePlacement(r.id, opt.id)}
                            title={opt.desc}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 20,
                              border: `1px solid ${isPlaced ? opt.color : (T.brd || '#E5E0D8')}`,
                              background: isPlaced ? `${opt.color}15` : (T.card || '#fff'),
                              color: isPlaced ? opt.color : (T.mut || '#6B7280'),
                              fontWeight: isPlaced ? 800 : 500,
                              fontSize: 11.5,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all .15s ease',
                              boxShadow: isPlaced ? `0 1px 4px ${opt.color}22` : 'none',
                            }}
                          >
                            <span>{isPlaced ? '✓' : '+'}</span>
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Editable Comment Textarea */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11.5, color: T.mut, marginBottom: 4, fontWeight: 700 }}>
                      متن نظر والد / تجربه دوره:
                    </label>
                    <textarea
                      rows={3}
                      style={{ ...S.ta, minHeight: 65 }}
                      value={currentEdit.comment}
                      onChange={(e) => {
                        setEditMap({
                          ...editMap,
                          [r.id]: { ...currentEdit, comment: e.target.value },
                        });
                      }}
                      placeholder="متن تجربه و میزان رضایت والد از دوره..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* دکمه ذخیره تغییرات */}
                    <button
                      type="button"
                      style={{
                        ...AdminBtn(),
                        background: '#0284c7',
                        color: '#fff',
                        border: 0,
                        fontWeight: 700,
                      }}
                      onClick={() => handleSaveEdit(r)}
                      title="ذخیره ویرایش‌های نام، امتیاز، دوره، محل‌های نمایش و متن نظر"
                    >
                      💾 ذخیره تغییرات
                    </button>

                    {/* دکمه تایید و پخش در سایت */}
                    {r.status !== 'approved' && (
                      <button
                        type="button"
                        style={{
                          ...AdminBtn(),
                          background: '#16a34a',
                          color: '#fff',
                          border: 0,
                          fontWeight: 700,
                        }}
                        onClick={() => handleApprove(r.id)}
                        title="تایید برای نمایش زنده در سایت و بخش‌های انتخاب‌شده"
                      >
                        ✓ تایید و پخش در سایت
                      </button>
                    )}

                    {/* دکمه تعلیق و غیرقابل پخش */}
                    {r.status !== 'rejected' && (
                      <button
                        type="button"
                        style={{
                          ...AdminBtn(),
                          background: '#eab308',
                          color: '#422006',
                          border: 0,
                          fontWeight: 700,
                        }}
                        onClick={() => handleReject(r.id)}
                        title="تعلیق و عدم نمایش در سایت"
                      >
                        ✕ غیرقابل پخش (رد)
                      </button>
                    )}

                    {/* دکمه حذف کامل */}
                    <button
                      type="button"
                      style={{
                        ...AdminBtn(),
                        color: T.err || '#DC2626',
                        border: `1px solid ${(T.err || '#DC2626')}33`,
                        background: `${(T.err || '#DC2626')}10`,
                        marginInlineStart: 'auto',
                        fontWeight: 700,
                      }}
                      onClick={() => handleDelete(r.id)}
                      title="حذف دائمی نظر از دیتابیس"
                    >
                      <ZkTrashIcon size={13} /> حذف نظر
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              style={AdminBtn()}
            >
              قبلی
            </button>
            <span style={{ fontSize: 13, color: T.mut }}>
              صفحه {currentPage} از {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              style={AdminBtn()}
            >
              بعدی
            </button>
          </div>
        )}
      </Box>

      {/* مودال افزودن نظر جدید توسط ادمین */}
      {addModalOpen && (
        <div
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setAddModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9900,
            background: 'rgba(15, 30, 45, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            animation: 'fade .25s ease both',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: T.card || '#fff',
              border: `1px solid ${T.brd || '#E5E0D8'}`,
              borderRadius: T.cardRadius || 20,
              padding: 22,
              boxShadow: T.shadowStrong || '0 24px 60px rgba(0,0,0,.22)',
              animation: 'modalIn .25s ease both',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                borderBottom: `1px solid ${T.brd || '#E5E0D8'}`,
                paddingBottom: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.ttl || '#0F766E' }}>
                  + افزودن نظر جدید والد با تعیین محل‌های نمایش
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: T.mut || '#6B7280' }}>
                  ثبت مستقیم نظر و تجربه والد با امکان انتخاب دقیق جایگاه‌های پخش در سایت
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: `1px solid ${T.brd || '#E5E0D8'}`,
                  background: T.soft || '#CCFBF1',
                  color: T.acc || '#0F766E',
                  cursor: 'pointer',
                  fontSize: 18,
                  fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddNewReview} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  نام والد / کاربر <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  style={S.inp}
                  value={newReview.name}
                  onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                  placeholder="مثال: مریم احمدی (مادر کیان ۵ ساله)"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  دوره مربوطه
                </label>
                <select
                  style={S.inp}
                  value={newReview.courseId}
                  onChange={(e) => setNewReview({ ...newReview, courseId: e.target.value })}
                >
                  {coursesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* انتخاب محل‌های نمایش در هنگام افزودن نظر */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.ttl || '#0F766E', marginBottom: 6 }}>
                  محل‌های نمایش در سایت:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {REVIEW_PLACEMENT_OPTIONS.map((opt) => {
                    const isSelected = newReview.placements.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (opt.id === 'all_places') {
                            if (isSelected) {
                              setNewReview({ ...newReview, placements: ['home', 'courses', 'course_detail'] });
                            } else {
                              setNewReview({ ...newReview, placements: ['all_places', ...REVIEW_PLACEMENT_OPTIONS.map((p) => p.id)] });
                            }
                          } else {
                            if (isSelected) {
                              setNewReview({
                                ...newReview,
                                placements: newReview.placements.filter((p) => p !== opt.id && p !== 'all_places'),
                              });
                            } else {
                              setNewReview({ ...newReview, placements: [...newReview.placements, opt.id] });
                            }
                          }
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          border: `1px solid ${isSelected ? opt.color : (T.brd || '#E5E0D8')}`,
                          background: isSelected ? `${opt.color}18` : (T.card || '#fff'),
                          color: isSelected ? opt.color : (T.mut || '#6B7280'),
                          fontWeight: isSelected ? 800 : 500,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>{isSelected ? '✓' : '+'}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  امتیاز ستاره‌ای (۱ تا ۵):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      style={{
                        background: 'transparent',
                        border: 0,
                        cursor: 'pointer',
                        padding: 4,
                        color: star <= newReview.rating ? '#F59E0B' : '#D1D5DB',
                        fontSize: 24,
                        lineHeight: 1,
                      }}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', marginInlineStart: 6 }}>
                    {newReview.rating} از ۵ ستاره
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  متن نظر و تجربه والد <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  style={{ ...S.ta, minHeight: 85 }}
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  placeholder="شرح تجربه والد از افزایش قد، بهبود اشتها یا آرامش در طول دوره..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  وضعیت اولیه پخش در سایت
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                    <input
                      type="radio"
                      name="initStatus"
                      checked={newReview.status === 'approved'}
                      onChange={() => setNewReview({ ...newReview, status: 'approved' })}
                    />
                    <span>✓ پخش مستقیم در سایت</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                    <input
                      type="radio"
                      name="initStatus"
                      checked={newReview.status === 'pending'}
                      onChange={() => setNewReview({ ...newReview, status: 'pending' })}
                    />
                    <span>⏳ ذخیره در انتظار بررسی</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    minHeight: 46,
                    borderRadius: T.btnRadius || 12,
                    border: 0,
                    background: T.grad || T.acc || '#0F766E',
                    color: '#fff',
                    fontSize: 14.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  ثبت و انتشار نظر
                </button>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  style={{
                    padding: '0 20px',
                    minHeight: 46,
                    borderRadius: T.btnRadius || 12,
                    border: `1px solid ${T.brd || '#E5E0D8'}`,
                    background: T.card || '#fff',
                    color: T.mut || '#6B7280',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تغییر دسته‌جمعی محل‌های نمایش (Bulk Placements Modal) */}
      {bulkPlacementModalOpen && (
        <div
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setBulkPlacementModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9900,
            background: 'rgba(15, 30, 45, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            animation: 'fade .25s ease both',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 500,
              background: T.card || '#fff',
              border: `1px solid ${T.brd || '#E5E0D8'}`,
              borderRadius: T.cardRadius || 20,
              padding: 22,
              boxShadow: T.shadowStrong || '0 24px 60px rgba(0,0,0,.22)',
              animation: 'modalIn .25s ease both',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                borderBottom: `1px solid ${T.brd || '#E5E0D8'}`,
                paddingBottom: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#7c3aed' }}>
                  🏷️ تنظیم دسته‌جمعی محل‌های نمایش در سایت
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: T.mut || '#6B7280' }}>
                  اعمال یکپارچه بخش‌های انتخابی برای {selectedIds.length} نظر انتخاب‌شده
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkPlacementModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${T.brd || '#E5E0D8'}`,
                  background: T.soft || '#F4F1EA',
                  color: T.txt || '#1F2937',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 8 }}>
                بخش‌های مورد نظر برای نمایش این نظرات را مشخص کنید:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {REVIEW_PLACEMENT_OPTIONS.map((opt) => {
                  const isChecked = bulkTargetPlacements.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: `1px solid ${isChecked ? opt.color : (T.brd || '#E5E0D8')}`,
                        background: isChecked ? `${opt.color}12` : (T.soft || '#F4F1EA'),
                        cursor: 'pointer',
                        transition: 'all .15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (opt.id === 'all_places') {
                              if (isChecked) {
                                setBulkTargetPlacements(['home', 'courses', 'course_detail']);
                              } else {
                                setBulkTargetPlacements(['all_places', ...REVIEW_PLACEMENT_OPTIONS.map((p) => p.id)]);
                              }
                            } else {
                              if (isChecked) {
                                setBulkTargetPlacements(bulkTargetPlacements.filter((p) => p !== opt.id && p !== 'all_places'));
                              } else {
                                setBulkTargetPlacements([...bulkTargetPlacements, opt.id]);
                              }
                            }
                          }}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: isChecked ? 800 : 600, color: isChecked ? opt.color : T.txt }}>
                          {opt.label}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: T.mut }}>{opt.desc}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleApplyBulkPlacements}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: T.btnRadius || 12,
                  border: 0,
                  background: '#7c3aed',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                اعمال روی {selectedIds.length} نظر انتخاب‌شده
              </button>
              <button
                type="button"
                onClick={() => setBulkPlacementModalOpen(false)}
                style={{
                  padding: '0 18px',
                  minHeight: 44,
                  borderRadius: T.btnRadius || 12,
                  border: `1px solid ${T.brd || '#E5E0D8'}`,
                  background: T.card || '#fff',
                  color: T.mut || '#6B7280',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
