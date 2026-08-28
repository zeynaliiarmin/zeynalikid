import React, { useState, useEffect, useMemo } from 'react';
import {
  ReviewItem,
  fetchReviews,
  approveReview,
  rejectReview,
  deleteReview,
  updateReview,
  bulkApproveReviews,
  bulkRejectReviews,
  bulkDeleteReviews,
  bulkUpdateReviewPlacements,
  downloadReviewsAsCSV,
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
import {
  formatPersianReviewDate,
  manualMaskedPhoneTemplate,
  persianReviewDateToIso,
  reviewCountryFlag,
  sanitizeManualMaskedPhone,
  todayPersianReviewDate,
} from '../utils/reviewPresentation';
import { adminCreateReview } from '../lib/adminApi';

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
        courseIds: string[];
        phone: string;
        phoneCountry: string;
        createdAt: string;
      }
    >
  >({});

  // مودال افزودن نظر جدید دستی
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newReview, setNewReview] = useState({
    name: '',
    courseId: 'عمومی',
    rating: 5,
    comment: '',
    status: 'approved' as 'approved' | 'pending',
    placements: ['course_detail'] as string[],
    courseIds: [] as string[],
    phoneCountry: '+98',
    phone: manualMaskedPhoneTemplate('+98'),
    createdAt: todayPersianReviewDate(),
  });

  // مودال تغییر دسته‌جمعی محل‌های نمایش (Bulk Placements Modal)
  const [bulkPlacementModalOpen, setBulkPlacementModalOpen] = useState(false);
  const [bulkTargetPlacements, setBulkTargetPlacements] = useState<string[]>(['course_detail']);

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
          placements: (r.placements || []).filter((place) => place === 'course_detail' || place === 'product_detail').length
            ? (r.placements || []).filter((place) => place === 'course_detail' || place === 'product_detail')
            : ['course_detail'],
          courseIds: Array.isArray(r.course_ids) ? r.course_ids : [],
          phone: r.phone || '',
          phoneCountry: r.phone_country || '+98',
          createdAt: formatPersianReviewDate(r.created_at, false),
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

  const countries = useMemo(() => Array.isArray(cfg?.countryCodes) ? cfg.countryCodes : [], [cfg?.countryCodes]);
  // دوره‌ها و محصولات تنها مقصدهای واقعی ReviewSection هستند.
  const targetOptions = useMemo(() => {
    const list: { id: string; title: string; type: 'course' | 'product' | 'general' }[] = [{ id: 'عمومی', title: 'عمومی', type: 'general' }];
    const seen = new Set<string>(['عمومی']);
    (cfg?.courseTabs || []).forEach((tab: any) => {
      (tab.courses || []).forEach((course: any) => {
        const id = course.id ? String(course.id) : '';
        if (id && course.title && !seen.has(id)) {
          seen.add(id);
          list.push({ id, title: course.title, type: 'course' });
        }
      });
    });
    const products = cfg?.products?.list || cfg?.products?.items || [];
    products.forEach((product: any) => {
      const id = product.id ? String(product.id) : '';
      const title = product.name || product.title;
      if (id && title && !seen.has(id)) {
        seen.add(id);
        list.push({ id, title, type: 'product' });
      }
    });
    return list;
  }, [cfg]);
  const targetTitle = (id?: string) => {
    if (!id) return 'عمومی';
    const found = targetOptions.find((option) => option.id === id);
    return found ? found.title : id;
  };

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;
  const approvedCount = reviews.filter((r) => r.status === 'approved').length;
  const rejectedCount = reviews.filter((r) => r.status === 'rejected').length;

  const filtered = useMemo(() => {
    return reviews
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (courseFilter !== 'all' && (r.course_id || 'عمومی') !== courseFilter) return false;
        if (placementFilter !== 'all') {
          const currentPlaces = editMap[r.id]?.placements || r.placements || ['course_detail'];
          if (!currentPlaces.includes(placementFilter as any)) return false;
        }
        if (search.trim()) {
          const kw = search.trim().toLowerCase();
          return (
            (r.reviewer_name || '').toLowerCase().includes(kw) ||
            (r.comment || '').toLowerCase().includes(kw) ||
            (r.phone || '').toLowerCase().includes(kw) ||
            targetTitle(r.course_id).toLowerCase().includes(kw)
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
    const current = editMap[reviewId];
    if (!current) return;
    const places = current.placements || [];
    const updatedPlaces = places.includes(placementId)
      ? places.filter((place) => place !== placementId)
      : [...places, placementId];
    setEditMap((previous) => ({
      ...previous,
      [reviewId]: { ...current, placements: updatedPlaces },
    }));
  };

  // انتخاب چنددوره‌ای برای نمایش نظر در دوره‌های خاص
  const handleToggleCourse = (reviewId: number, courseId: string) => {
    const current = editMap[reviewId];
    if (!current) return;
    const cur = Array.isArray(current.courseIds) ? current.courseIds : [];
    const updated = cur.includes(courseId)
      ? cur.filter((c: string) => c !== courseId)
      : [...cur, courseId];
    setEditMap({
      ...editMap,
      [reviewId]: { ...current, courseIds: updated },
    });
  };

  const handleSaveEdit = async (r: ReviewItem) => {
    const edit = editMap[r.id];
    if (!edit) return;
    if (!edit.name.trim()) {
      alert('لطفاً نام والد را وارد نمایید.');
      return;
    }

    const createdAt = persianReviewDateToIso(edit.createdAt);
    if (!createdAt) {
      alert('تاریخ ثبت باید یک تاریخ معتبر هجری شمسی مانند ۱۴۰۴/۰۵/۲۳ باشد.');
      return;
    }
    if (!edit.placements.length) {
      alert('حداقل یکی از دو محل «جزئیات دوره» یا «جزئیات محصول» را انتخاب کنید.');
      return;
    }

    try {
      await updateReview(r.id, {
        reviewer_name: edit.name.trim(),
        course_id: edit.courseId,
        rating: edit.rating,
        comment: edit.comment.trim(),
        placements: edit.placements as any,
        course_ids: Array.isArray(edit.courseIds) ? edit.courseIds : [],
        phone: edit.phone.trim(),
        phone_country: edit.phoneCountry,
        created_at: createdAt,
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
    if (!bulkTargetPlacements.length) {
      alert('حداقل یکی از دو محل نمایش را انتخاب کنید.');
      return;
    }
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

  const handleDownloadAllCSV = () => {
    downloadReviewsAsCSV(reviews, `zeynalikid-all-reviews-${reviews.length}.csv`);
    showToast(`فایل اکسل کل نظرات (${reviews.length} مورد) دانلود شد.`);
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
    if (!/^\d{5}x{4}\d{2}$/.test(newReview.phone)) {
      alert('شماره دستی باید شامل پنج رقم اول، چهار x و دو رقم آخر باشد.');
      return;
    }
    const createdAt = persianReviewDateToIso(newReview.createdAt);
    if (!createdAt) {
      alert('تاریخ ثبت باید یک تاریخ معتبر هجری شمسی مانند ۱۴۰۴/۰۵/۲۳ باشد.');
      return;
    }
    if (!newReview.placements.length) {
      alert('حداقل یک محل نمایش را انتخاب کنید.');
      return;
    }

    try {
      await adminCreateReview({
        course_id: newReview.courseId,
        reviewer_name: newReview.name.trim(),
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        status: newReview.status,
        placements: newReview.placements,
        phone: newReview.phone,
        phone_country: newReview.phoneCountry,
        course_ids: newReview.courseIds,
        created_at: createdAt,
      });
      await load();
      setAddModalOpen(false);
      setNewReview({
        name: '',
        courseId: 'عمومی',
        rating: 5,
        comment: '',
        status: 'approved',
        placements: ['course_detail'],
        courseIds: [],
        phoneCountry: '+98',
        phone: manualMaskedPhoneTemplate('+98'),
        createdAt: todayPersianReviewDate(),
      });
      showToast('نظر جدید با موفقیت ثبت و در بخش‌های تعیین‌شده منتشر گردید.');
    } catch (err) {
      console.error('Create review fail:', err);
      alert('خطایی در ثبت نظر رخ داد.');
    }
  };

  const placementColor = (id: string) => id === 'course_detail' ? 'var(--zkad-placement-course)' : 'var(--zkad-placement-product)';
  const placementSoft = (id: string) => id === 'course_detail' ? 'var(--zkad-placement-course-soft)' : 'var(--zkad-placement-product-soft)';

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return { background: 'var(--zkad-tag-ok-bg)', color: 'var(--zkad-tag-ok-tx)', label: '✓ قابل پخش در سایت' };
    if (status === 'rejected') return { background: 'var(--zkad-tag-err-bg)', color: 'var(--zkad-tag-err-tx)', label: '✕ غیرقابل پخش' };
    return { background: 'var(--zkad-tag-warn-bg)', color: 'var(--zkad-tag-warn-tx)', label: '⏳ در انتظار بررسی' };
  };

  const fmtDate = (dString?: string) => formatPersianReviewDate(dString, true);

  return (
    <div>
      <Box title="مدیریت جامع نظرات، تجربیات و محل‌های نمایش (Reviews Management)">
        {/* Toast Feedback */}
        {toastMsg && (
          <div
            style={{
              padding: '12px 18px',
              background: 'var(--zkad-tag-ok-bg)',
              border: '1px solid var(--zkad-ok)',
              color: 'var(--zkad-tag-ok-tx)',
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
          className="zkad-rev-toolbar"
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
          <div className="zkad-rev-tabs">
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
                  color: statusFilter === tab.id ? 'var(--zkad-acc-contrast, #fff)' : (T.txt || '#1F2937'),
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
          <div className="zkad-rev-topbtns" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
          className="zkad-rev-filters"
          style={{ display: 'grid', gap: 10, marginBottom: 16 }}
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
            <option value="all">همه دوره‌ها و محصولات</option>
            {targetOptions.map((target) => (
              <option key={target.id} value={target.id}>
                {target.type === 'product' ? 'محصول' : target.type === 'course' ? 'دوره' : 'عمومی'}: {target.title}
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
            background: hasSomeSelected ? 'var(--zkad-tag-info-bg)' : (T.card || '#fff'),
            border: `1px solid ${hasSomeSelected ? 'var(--zkad-info)' : (T.brd || '#E5E0D8')}`,
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

            <span style={{ fontSize: 13, fontWeight: 700, color: hasSomeSelected ? 'var(--zkad-tag-info-tx)' : T.mut }}>
              {hasSomeSelected ? (
                <>
                  <b style={{ color: 'var(--zkad-tag-info-tx)', fontSize: 14 }}>{selectedIds.length}</b> نظر از{' '}
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
                  background: '#047857',
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
                  background: 'var(--zkad-warn)',
                  color: 'var(--zkad-warn-contrast)',
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
                  background: '#0369A1',
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
                  background: 'var(--zkad-tag-err-bg)',
                  color: 'var(--zkad-tag-err-tx)',
                  border: '1px solid var(--zkad-err)',
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
                placements: r.placements && r.placements.length > 0 ? r.placements : ['course_detail'],
                courseIds: Array.isArray(r.course_ids) ? r.course_ids : [],
                phone: r.phone || '',
                phoneCountry: r.phone_country || '+98',
                createdAt: formatPersianReviewDate(r.created_at, false),
              };

              return (
                <div
                  key={r.id}
                  style={{
                    background: isSelected ? 'var(--zkad-selected)' : (T.card || '#fff'),
                    borderRadius: T.cardRadius || 14,
                    border: isSelected
                      ? '2px solid var(--zkad-info)'
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
                    className="zkad-rev-card-top"
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
                          background: isSelected ? 'var(--zkad-tag-info-bg)' : (T.soft || '#F4F1EA'),
                          padding: '5px 10px',
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? 'var(--zkad-info)' : (T.brd || '#E5E0D8')}`,
                          fontWeight: 800,
                          fontSize: 12,
                          color: isSelected ? 'var(--zkad-tag-info-tx)' : (T.txt || '#1F2937'),
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
                      {r.phone && <span dir="ltr" style={{ fontSize: 11.5, color: T.mut, fontFamily: 'monospace' }} title="شماره کامل فقط در پنل مدیریت قابل مشاهده است">{reviewCountryFlag(r.phone_country, countries)} 📞 {r.phone}</span>}
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
                              color: star <= currentEdit.rating ? 'var(--zkad-warn)' : 'var(--zkad-brd-strong)',
                              fontSize: 18,
                              lineHeight: 1,
                              transition: 'color .15s ease',
                            }}
                          >
                            ★
                          </button>
                        ))}
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--zkad-warn)', marginInlineStart: 4 }}>
                          ({currentEdit.rating} از ۵)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* بخش‌های ویرایشی — در تب باز/بسته (کم‌استفاده‌تر) تا کارت کوتاه بماند */}
                  <details className="zkad-rev-collapse">
                    <summary>✏️ ویرایش نام، مقصد، شماره، تاریخ و متن نظر</summary>
                    <div>
                  {/* Inline Editable Fields: Name & Course */}
                  <div
                    className="zkad-rev-editgrid"
                    style={{ display: 'grid', gap: 10, marginBottom: 10 }}
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
                        دوره یا محصول مربوطه:
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
                        {targetOptions.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.type === 'product' ? 'محصول' : target.type === 'course' ? 'دوره' : 'عمومی'} — {target.title}
                          </option>
                        ))}
                        {!targetOptions.some((target) => target.id === currentEdit.courseId) && currentEdit.courseId && (
                          <option value={currentEdit.courseId}>{targetTitle(currentEdit.courseId)}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, .7fr) minmax(0, 1.3fr)', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, color: T.mut, marginBottom: 4, fontWeight: 700 }}>کشور شماره:</label>
                      <select style={S.inp} value={currentEdit.phoneCountry} onChange={(e) => { const pc = e.target.value; setEditMap({ ...editMap, [r.id]: { ...currentEdit, phoneCountry: pc, phone: manualMaskedPhoneTemplate(pc) } }); }}>
                        {countries.map((country: any) => <option key={country.id || country.code} value={country.code}>{reviewCountryFlag(country.code, countries)} {country.name} ({country.code})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, color: T.mut, marginBottom: 4, fontWeight: 700 }}>شماره کامل کاربر / شماره ماسک‌شده دستی:</label>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input key={`review-phone-${r.id}-${r.phone || ''}`} dir="ltr" style={{ ...S.inp, textAlign: 'left', flex: 1 }} defaultValue={currentEdit.phone} onBlur={(e) => setEditMap((previous) => ({ ...previous, [r.id]: { ...previous[r.id], phone: e.target.value } }))} placeholder="09193123469 یا 09193xxxx69" />
                        <button
                          type="button"
                          title="شماره رندوم همان کشور"
                          aria-label="شماره رندوم"
                          onClick={() => setEditMap((previous) => ({ ...previous, [r.id]: { ...previous[r.id], phone: manualMaskedPhoneTemplate(currentEdit.phoneCountry) } }))}
                          style={{ flexShrink: 0, minHeight: 36, padding: '0 11px', borderRadius: 8, border: `1px solid ${T.brd}`, background: T.soft, color: T.acc, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 800 }}
                        >
                          🎲
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 11.5, color: T.mut, marginBottom: 4, fontWeight: 700 }}>تاریخ ثبت هجری شمسی:</label>
                    <input key={`review-date-${r.id}-${r.created_at || ''}`} dir="ltr" inputMode="numeric" style={{ ...S.inp, textAlign: 'left' }} defaultValue={currentEdit.createdAt} onBlur={(e) => setEditMap((previous) => ({ ...previous, [r.id]: { ...previous[r.id], createdAt: e.target.value } }))} placeholder="1404/05/23" />
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
                    </div>
                  </details>

                    {/* محل‌های نمایش در سایت — تب باز/بسته */}
                  <details className="zkad-rev-collapse">
                    <summary>📍 محل‌های نمایش این نظر در سایت</summary>
                    <div>
{/* بخش دسترسی جداگانه برای هر نظر: انتخاب محل‌های نمایش در سایت */}
                  <div
                    className="zkad-rev-place-box"
                    style={{
                      marginBottom: 12,
                      background: T.soft || '#F4F1EA',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1px solid ${T.brd || '#E5E0D8'}`,
                    }}
                  >
                    <div
                      className="zkad-rev-place-head"
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

                    <div className="zkad-rev-place-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {REVIEW_PLACEMENT_OPTIONS.map((opt) => {
                        const isPlaced = (currentEdit.placements || []).includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleTogglePlacement(r.id, opt.id)}
                            title={opt.desc}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 20,
                              border: `1px solid ${isPlaced ? placementColor(opt.id) : (T.brd || '#E5E0D8')}`,
                              background: isPlaced ? placementSoft(opt.id) : (T.card || '#fff'),
                              color: isPlaced ? placementColor(opt.id) : (T.mut || '#6B7280'),
                              fontWeight: isPlaced ? 800 : 500,
                              fontSize: 11.5,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all .15s ease',
                              boxShadow: isPlaced ? `0 1px 4px ${placementColor(opt.id)}` : 'none',
                            }}
                          >
                            <span>{isPlaced ? '✓' : '+'}</span>
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* انتخاب چندمقصدی: دوره‌ها و محصولات واقعی */}
                    <div style={{ marginTop: 10, borderTop: `1px dashed ${T.brd || '#E5E0D8'}`, paddingTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                        <label style={{ fontSize: 12, color: T.ttl || '#0F766E', fontWeight: 800, margin: 0 }}>🎯 نمایش در دوره‌ها یا محصولات خاص:</label>
                        <span style={{ fontSize: 10.5, color: T.mut }}>(چند انتخابی — فقط جزئیات موارد انتخاب‌شده)</span>
                      </div>
                      <div className="zkad-rev-course-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {targetOptions.filter((target) => target.id !== 'عمومی').map((c) => {
                          const on = Array.isArray(currentEdit.courseIds) && currentEdit.courseIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleToggleCourse(r.id, c.id)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 20,
                                border: `1px solid ${on ? 'var(--zkad-placement-product)' : (T.brd || '#E5E0D8')}`,
                                background: on ? 'var(--zkad-placement-product-soft)' : (T.card || '#fff'),
                                color: on ? 'var(--zkad-placement-product)' : (T.mut || '#6B7280'),
                                fontWeight: on ? 800 : 500,
                                fontSize: 11.5,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                transition: 'all .15s ease',
                              }}
                            >
                              <span>{on ? '✓' : '+'}</span>
                              <span>{c.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                    </div>
                  </details>

                  {/* Action Buttons — فقط: ذخیره، پخش در سایت، حذف (آیکون) */}
                  <div className="zkad-rev-cardbtns" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* دکمه ذخیره تغییرات */}
                    <button
                      type="button"
                      style={{
                        ...AdminBtn(),
                        background: '#0369A1',
                        color: '#fff',
                        border: 0,
                        fontWeight: 700,
                        minWidth: 88,
                        justifyContent: 'center',
                      }}
                      onClick={() => handleSaveEdit(r)}
                      title="ذخیره ویرایش‌های نام، امتیاز، دوره، محل‌های نمایش و متن نظر"
                    >
                      ذخیره تغییرات
                    </button>

                    {/* دکمه پخش در سایت */}
                    {r.status !== 'approved' && (
                      <button
                        type="button"
                        style={{
                          ...AdminBtn(),
                          background: '#047857',
                          color: '#fff',
                          border: 0,
                          fontWeight: 700,
                          minWidth: 88,
                          justifyContent: 'center',
                        }}
                        onClick={() => handleApprove(r.id)}
                        title="تایید برای نمایش زنده در سایت و بخش‌های انتخاب‌شده"
                      >
                        پخش در سایت
                      </button>
                    )}

                    {/* دکمه حذف — فقط آیکون */}
                    <button
                      type="button"
                      aria-label="حذف نظر"
                      title="حذف دائمی نظر از دیتابیس"
                      style={{
                        ...AdminBtn(),
                        color: T.err || '#DC2626',
                        border: `1px solid ${(T.err || '#DC2626')}33`,
                        background: `${(T.err || '#DC2626')}10`,
                        width: 44,
                        minWidth: 44,
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => handleDelete(r.id)}
                    >
                      <ZkTrashIcon size={15} />
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
                  data-testid="manual-review-name"
                  style={S.inp}
                  value={newReview.name}
                  onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                  placeholder="مثال: مریم احمدی (مادر کیان ۵ ساله)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, .75fr) minmax(0, 1.25fr)', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>کشور شماره تماس</label>
                  <select
                    style={S.inp}
                    value={newReview.phoneCountry}
                    onChange={(e) => {
                      const phoneCountry = e.target.value;
                      setNewReview({ ...newReview, phoneCountry, phone: manualMaskedPhoneTemplate(phoneCountry) });
                    }}
                  >
                    {countries.map((country: any) => <option key={country.id || country.code} value={country.code}>{reviewCountryFlag(country.code, countries)} {country.name} ({country.code})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>شماره نمایشی دستی</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      dir="ltr"
                      inputMode="numeric"
                      data-testid="manual-review-phone"
                      style={{ ...S.inp, textAlign: 'left', fontFamily: 'monospace', flex: 1 }}
                      value={newReview.phone}
                      onChange={(e) => setNewReview({ ...newReview, phone: sanitizeManualMaskedPhone(e.target.value) })}
                      placeholder={manualMaskedPhoneTemplate(newReview.phoneCountry)}
                    />
                    <button
                      type="button"
                      title="شماره رندوم همان کشور"
                      aria-label="شماره رندوم"
                      onClick={() => setNewReview({ ...newReview, phone: manualMaskedPhoneTemplate(newReview.phoneCountry) })}
                      style={{ flexShrink: 0, minHeight: 38, padding: '0 12px', borderRadius: 9, border: `1px solid ${T.brd}`, background: T.soft, color: T.acc, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 800 }}
                    >
                      🎲 رندوم
                    </button>
                  </div>
                  <small style={{ display: 'block', color: T.mut, fontSize: 10.5, marginTop: 4 }}>برای ساخت شمارهٔ رندوم همان کشور، دکمهٔ «رندوم» را بزنید؛ هر بار متفاوت ساخته می‌شود.</small>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>تاریخ ثبت نظر (هجری شمسی)</label>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  data-testid="manual-review-date"
                  style={{ ...S.inp, textAlign: 'left' }}
                  value={newReview.createdAt}
                  onChange={(e) => setNewReview({ ...newReview, createdAt: e.target.value })}
                  placeholder="1404/05/23"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  دوره یا محصول مربوطه
                </label>
                <select
                  style={S.inp}
                  value={newReview.courseId}
                  onChange={(e) => setNewReview({ ...newReview, courseId: e.target.value })}
                >
                  {targetOptions.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.type === 'product' ? 'محصول' : target.type === 'course' ? 'دوره' : 'عمومی'} — {target.title}
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
                        onClick={() => setNewReview({
                          ...newReview,
                          placements: isSelected
                            ? newReview.placements.filter((place) => place !== opt.id)
                            : [...newReview.placements, opt.id],
                        })}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          border: `1px solid ${isSelected ? placementColor(opt.id) : (T.brd || '#E5E0D8')}`,
                          background: isSelected ? placementSoft(opt.id) : (T.card || '#fff'),
                          color: isSelected ? placementColor(opt.id) : (T.mut || '#6B7280'),
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

              {/* انتخاب مقصدهای واقعی جزئیات */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.ttl || '#0F766E', marginBottom: 6 }}>
                  🎯 نمایش در دوره‌ها یا محصولات خاص (چند انتخابی):
                </label>
                <div className="zkad-rev-course-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {targetOptions.filter((target) => target.id !== 'عمومی').map((c) => {
                    const on = newReview.courseIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setNewReview({
                            ...newReview,
                            courseIds: on
                              ? newReview.courseIds.filter((x) => x !== c.id)
                              : [...newReview.courseIds, c.id],
                          });
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          border: `1px solid ${on ? 'var(--zkad-placement-product)' : (T.brd || '#E5E0D8')}`,
                          background: on ? 'var(--zkad-placement-product-soft)' : (T.card || '#fff'),
                          color: on ? 'var(--zkad-placement-product)' : (T.mut || '#6B7280'),
                          fontWeight: on ? 800 : 500,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>{on ? '✓' : '+'}</span>
                        <span>{c.title}</span>
                      </button>
                    );
                  })}
                </div>
                <small style={{ display: 'block', fontSize: 10.5, color: T.mut, marginTop: 4 }}>
                  اگر موردی انتخاب نشود، فقط «دوره یا محصول مربوطه» بالایی اعمال می‌شود.
                </small>
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
                        color: star <= newReview.rating ? 'var(--zkad-warn)' : 'var(--zkad-brd-strong)',
                        fontSize: 24,
                        lineHeight: 1,
                      }}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--zkad-warn)', marginInlineStart: 6 }}>
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
                  data-testid="manual-review-comment"
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
                  data-testid="manual-review-submit"
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
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--zkad-placement-course)' }}>
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
                        border: `1px solid ${isChecked ? placementColor(opt.id) : (T.brd || '#E5E0D8')}`,
                        background: isChecked ? placementSoft(opt.id) : (T.soft || '#F4F1EA'),
                        cursor: 'pointer',
                        transition: 'all .15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setBulkTargetPlacements(isChecked
                            ? bulkTargetPlacements.filter((place) => place !== opt.id)
                            : [...bulkTargetPlacements, opt.id]
                          )}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: isChecked ? 800 : 600, color: isChecked ? placementColor(opt.id) : T.txt }}>
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
