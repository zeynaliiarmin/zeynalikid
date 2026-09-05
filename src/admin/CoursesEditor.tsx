import React from 'react';
import { FrameControls, LibraryPicker } from './ImagesManager';
import { ZkPlusIcon, ZkUploadIcon } from './adminIcons';
import { zkAlert, zkConfirm } from '../components/ZkDialog';

type Props = {
  T: any;
  S: any;
  editCfg: any;
  setEditCfg: (cfg: any) => void;
  setSave: (cfg: any) => void;
  uid: () => string | number;
  p2e: (value: string) => string;
  fileToData: (file: File, oldUrl?: string, folder?: string) => Promise<string>;
  deleteStoredImage: (url?: string) => Promise<void>;
  AdminBtn: () => React.CSSProperties;
  Box: React.ComponentType<{ title: React.ReactNode; children: React.ReactNode }>;
};

const safePathSegment = (value: unknown) => String(value || 'item').replace(/[^a-zA-Z0-9_-]/g, '-');

function ImagePreview({ url, title, aspectRatio, objectPosition, T }: any) {
  if (!url) return null;
  return (
    <div style={{ marginTop: 8, width: 'min(100%, 360px)' }}>
      <img
        src={url}
        alt={title || 'تصویر دوره'}
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: aspectRatio || '16 / 9',
          objectFit: 'cover',
          objectPosition: objectPosition || 'center',
          borderRadius: 10,
          border: `1px solid ${T.brd}`,
        }}
      />
    </div>
  );
}

const COURSE_BADGES = [
  { key: 'active', label: 'فعال' },
  { key: 'popular', label: 'محبوب' },
  { key: 'bestseller', label: 'پرفروش' },
  { key: 'trending', label: 'پرطرفدار' },
  { key: 'ageBadge', label: 'نمایش بازه سنی' },
] as const;

function CourseImageEditor({
  course,
  editCfg,
  T,
  S,
  AdminBtn,
  uploading,
  onUpload,
  onClear,
  onLibrarySelect,
  onFrameChange,
}: any) {
  return (
    <section
      data-course-image-uploader={course.id}
      style={{
        margin: '10px 0',
        padding: 12,
        border: `2px solid ${course.image ? T.acc : T.brd}`,
        borderRadius: 14,
        background: T.badge,
        boxShadow: course.image ? `0 0 0 2px ${T.soft || 'transparent'}` : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <b style={{ fontSize: 13, color: T.ttl, flex: 1 }}>عکس اختصاصی همین دوره</b>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: course.image ? T.ok : T.mut }}>
          {course.image ? 'عکس ثبت شده' : 'بدون عکس'}
        </span>
      </div>
      <p style={{ margin: '0 0 8px', color: T.mut, fontSize: 11, lineHeight: 1.8 }}>
        این عکس فقط برای «{course.title}» ذخیره می‌شود و روی دوره‌های دیگر تأثیری ندارد.
      </p>

      <label
        className="zkad-drop"
        aria-label={`آپلود عکس اختصاصی دوره ${course.title}`}
        style={{ borderColor: T.acc, background: T.card }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) onUpload(file);
        }}
      >
        <ZkUploadIcon size={22} color={T.acc} />
        <span>{uploading ? 'در حال آپلود عکس این دوره…' : course.image ? 'تغییر عکس همین دوره' : 'آپلود عکس برای همین دوره'}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = '';
          }}
        />
      </label>

      <ImagePreview url={course.image} title={course.title} aspectRatio={course.aspectRatio} objectPosition={course.objectPosition} T={T} />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        <LibraryPicker
          T={T}
          S={S}
          editCfg={editCfg}
          section="courses"
          onSelect={onLibrarySelect}
          current={course.image}
          AdminBtn={AdminBtn}
          label="انتخاب عکس برای همین دوره از گالری"
        />
        {course.image && (
          <button type="button" style={{ ...AdminBtn(), color: T.err }} onClick={onClear}>
            حذف عکس همین دوره
          </button>
        )}
      </div>

      {course.image ? (
        <FrameControls
          T={T}
          S={S}
          value={{ aspectRatio: course.aspectRatio, objectPosition: course.objectPosition }}
          onChange={onFrameChange}
        />
      ) : (
        <small style={{ display: 'block', color: T.mut, marginTop: 8 }}>
          تا زمانی که عکسی انتخاب نشود، این دوره در سایت کاملاً بدون تصویر نمایش داده می‌شود.
        </small>
      )}
    </section>
  );
}

export default function CoursesEditor({
  T,
  S,
  editCfg,
  setEditCfg,
  setSave,
  uid,
  p2e,
  fileToData,
  deleteStoredImage,
  AdminBtn,
  Box,
}: Props) {
  const [uploadingImage, setUploadingImage] = React.useState<string | null>(null);
  const rawTabs = editCfg.courseTabs;
  const tabs: any[] = Array.isArray(rawTabs)
    ? rawTabs
    : rawTabs && typeof rawTabs === 'object'
      ? Object.values(rawTabs)
      : [];

  const libraryUrls = new Set(
    (Array.isArray(editCfg?.images?.library?.courses) ? editCfg.images.library.courses : [])
      .map((item: any) => String(item?.url || ''))
      .filter(Boolean),
  );
  const isLibraryImage = (url?: string) => !!url && libraryUrls.has(String(url));

  const updateTab = (tabIndex: number, key: string, value: any) => {
    const next = [...tabs];
    next[tabIndex] = { ...next[tabIndex], [key]: value };
    setEditCfg({ ...editCfg, courseTabs: next });
  };

  const updateTabFrame = (tabIndex: number, patch: any) => {
    const next = [...tabs];
    next[tabIndex] = { ...next[tabIndex], ...patch };
    setEditCfg({ ...editCfg, courseTabs: next });
  };

  const updateCourse = (tabIndex: number, courseIndex: number, key: string, value: any) => {
    const next = [...tabs];
    const tab = next[tabIndex] || {};
    const courses = [...(tab.courses || [])];
    courses[courseIndex] = { ...courses[courseIndex], [key]: value };
    next[tabIndex] = { ...tab, courses };
    setEditCfg({ ...editCfg, courseTabs: next });
  };

  const updateCourseFrame = (tabIndex: number, courseIndex: number, patch: any) => {
    const next = [...tabs];
    const tab = next[tabIndex] || {};
    const courses = [...(tab.courses || [])];
    courses[courseIndex] = { ...courses[courseIndex], ...patch };
    next[tabIndex] = { ...tab, courses };
    setEditCfg({ ...editCfg, courseTabs: next });
  };

  const replaceUploadedImage = async (
    file: File,
    currentUrl: string | undefined,
    folder: string,
    onReady: (url: string) => void,
  ) => {
    // عکس انتخاب‌شده از کتابخانه ممکن است جای دیگری هم استفاده شود؛ هنگام جایگزینی حذفش نکن.
    const ownedOldUrl = isLibraryImage(currentUrl) ? undefined : currentUrl;
    const url = await fileToData(file, ownedOldUrl, folder);
    onReady(url);
  };

  const clearImage = async (url: string | undefined, onClear: () => void) => {
    // حذف اتصال این دوره/تب به عکس کتابخانه نباید فایل مشترک کتابخانه را پاک کند.
    if (url && !isLibraryImage(url)) await deleteStoredImage(url);
    onClear();
  };

  const selectLibraryImage = async (
    selectedUrl: string,
    currentUrl: string | undefined,
    onSelect: (url: string) => void,
  ) => {
    if (currentUrl && currentUrl !== selectedUrl && !isLibraryImage(currentUrl)) {
      await deleteStoredImage(currentUrl);
    }
    onSelect(selectedUrl);
  };

  const uploadCourseImage = async (tabIndex: number, courseIndex: number, file: File) => {
    const tab = tabs[tabIndex];
    const course = tab?.courses?.[courseIndex];
    if (!tab || !course) return;
    const uploadKey = `${tab.id}:${course.id}`;
    setUploadingImage(uploadKey);
    try {
      await replaceUploadedImage(
        file,
        course.image,
        `courses/${safePathSegment(tab.id)}/${safePathSegment(course.id)}`,
        (url) => updateCourse(tabIndex, courseIndex, 'image', url),
      );
    } catch (error: any) {
      void zkAlert(error?.message || 'آپلود عکس دوره انجام نشد. دوباره تلاش کنید.');
    } finally {
      setUploadingImage(null);
    }
  };

  return (
    <>
      <Box title="واحد پول دوره‌ها">
        <label style={S.lbl}>واحد پول</label>
        <select
          style={S.inp}
          value={editCfg.currencyUnit || 'تومان'}
          onChange={(event) => setEditCfg({ ...editCfg, currencyUnit: event.target.value })}
        >
          <option value="تومان">تومان</option>
          <option value="ریال">ریال</option>
        </select>
      </Box>

      <Box title="مدیریت تب‌ها و دوره‌ها">
        <p style={{ margin: '0 0 12px', color: T.mut, fontSize: 11, lineHeight: 1.9 }}>
          عکس بالای هر تب و عکس هر دوره مستقل است. اگر برای یک دوره عکس انتخاب نشود، کارت و صفحه آن دوره بدون فضای تصویر نمایش داده می‌شود.
        </p>

        {tabs.map((tab: any, tabIndex: number) => (
          <details
            key={tab.id}
            data-detail-key={`course-tab-${tab.id}`}
            style={{ marginBottom: 10, background: T.badge, borderRadius: 12, padding: 10 }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>{tab.title}</summary>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <input style={S.inp} defaultValue={tab.title} onBlur={(event) => updateTab(tabIndex, 'title', event.target.value)} />
              <input style={S.inp} defaultValue={tab.inactiveMessage} onBlur={(event) => updateTab(tabIndex, 'inactiveMessage', event.target.value)} />
            </div>

            <label style={{ ...S.lbl, marginTop: 8 }}>خلاصه اطلاعات بیشتر</label>
            <input
              style={S.inp}
              defaultValue={tab.detailedInfo?.summary || ''}
              onBlur={(event) => updateTab(tabIndex, 'detailedInfo', { ...(tab.detailedInfo || {}), summary: event.target.value })}
            />

            <label style={{ ...S.lbl, marginTop: 8 }}>متن کامل اطلاعات بیشتر</label>
            <textarea
              style={S.ta}
              defaultValue={tab.detailedInfo?.fullText || ''}
              onBlur={(event) => updateTab(tabIndex, 'detailedInfo', { ...(tab.detailedInfo || {}), fullText: event.target.value })}
            />

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <label><input type="checkbox" checked={tab.active !== false} onChange={(event) => updateTab(tabIndex, 'active', event.target.checked)} /> فعال</label>
              <label><input type="checkbox" checked={tab.showImage !== false} onChange={(event) => updateTab(tabIndex, 'showImage', event.target.checked)} /> نمایش تصویر تب پیش از دوره‌ها</label>
            </div>

            <div style={{ margin: '10px 0', padding: 10, border: `1px solid ${T.brd}`, borderRadius: 12, background: T.card }}>
              <b style={{ display: 'block', marginBottom: 7, fontSize: 12, color: T.ttl }}>تصویر اختصاصی تب «{tab.title}»</b>
              <label
                className="zkad-drop"
                onDragOver={(event) => event.preventDefault()}
                onDrop={async (event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) {
                    await replaceUploadedImage(
                      file,
                      tab.image,
                      `course-tabs/${safePathSegment(tab.id)}`,
                      (url) => updateTab(tabIndex, 'image', url),
                    );
                  }
                }}
              >
                <ZkUploadIcon size={20} />
                <span>آپلود تصویر مخصوص همین تب</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      await replaceUploadedImage(
                        file,
                        tab.image,
                        `course-tabs/${safePathSegment(tab.id)}`,
                        (url) => updateTab(tabIndex, 'image', url),
                      );
                    }
                    event.target.value = '';
                  }}
                />
              </label>

              <ImagePreview url={tab.image} title={tab.title} aspectRatio={tab.aspectRatio} objectPosition={tab.objectPosition} T={T} />

              {tab.image && (
                <button
                  type="button"
                  style={{ ...AdminBtn(), marginTop: 6, color: T.err }}
                  onClick={() => clearImage(tab.image, () => updateTab(tabIndex, 'image', ''))}
                >
                  حذف تصویر این تب
                </button>
              )}

              <LibraryPicker
                T={T}
                S={S}
                editCfg={editCfg}
                section="courses"
                onSelect={(url: string) => selectLibraryImage(url, tab.image, (selected) => updateTab(tabIndex, 'image', selected))}
                current={tab.image}
                AdminBtn={AdminBtn}
              />

              {tab.image && (
                <FrameControls
                  T={T}
                  S={S}
                  value={{ aspectRatio: tab.aspectRatio, objectPosition: tab.objectPosition }}
                  onChange={(patch: any) => updateTabFrame(tabIndex, patch)}
                />
              )}
            </div>

            {!tab.base && (
              <button
                type="button"
                className="zkad-del"
                title="حذف تب"
                onClick={() => setEditCfg({ ...editCfg, courseTabs: tabs.filter((_: any, index: number) => index !== tabIndex) })}
              >
                حذف تب
              </button>
            )}

            {(tab.courses || []).map((course: any, courseIndex: number) => (
              <div key={course.id} style={{ border: `1px solid ${T.brd}`, borderRadius: 14, padding: 11, marginTop: 12, background: T.card }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <b style={{ color: T.ttl, fontSize: 12.5, flex: 1 }}>دوره {courseIndex + 1}: {course.title}</b>
                  <span style={{ color: T.mut, fontSize: 10, direction: 'ltr' }}>ID: {course.id}</span>
                </div>
                <label style={{ ...S.lbl, fontSize: 11 }}>عنوان دوره</label>
                <input style={S.inp} defaultValue={course.title} onBlur={(event) => updateCourse(tabIndex, courseIndex, 'title', event.target.value)} placeholder="عنوان" />

                <CourseImageEditor
                  course={course}
                  editCfg={editCfg}
                  T={T}
                  S={S}
                  AdminBtn={AdminBtn}
                  uploading={uploadingImage === `${tab.id}:${course.id}`}
                  onUpload={(file: File) => uploadCourseImage(tabIndex, courseIndex, file)}
                  onClear={() => clearImage(course.image, () => updateCourse(tabIndex, courseIndex, 'image', ''))}
                  onLibrarySelect={(url: string) => selectLibraryImage(url, course.image, (selected) => updateCourse(tabIndex, courseIndex, 'image', selected))}
                  onFrameChange={(patch: any) => updateCourseFrame(tabIndex, courseIndex, patch)}
                />

                <label style={{ ...S.lbl, fontSize: 11 }}>توضیحات دوره</label>
                <textarea style={{ ...S.ta, marginTop: 6 }} defaultValue={course.desc} onBlur={(event) => updateCourse(tabIndex, courseIndex, 'desc', event.target.value)} placeholder="توضیحات" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  <div>
                    <label style={{ ...S.lbl, fontSize: 11 }}>قیمت اصلی</label>
                    <input style={S.inp} inputMode="numeric" defaultValue={course.price} onBlur={(event) => updateCourse(tabIndex, courseIndex, 'price', p2e(event.target.value))} placeholder="قیمت" />
                  </div>
                  <div>
                    <label style={{ ...S.lbl, fontSize: 11 }}>قیمت تخفیف‌دار (اختیاری)</label>
                    <input
                      style={S.inp}
                      inputMode="numeric"
                      defaultValue={course.discountedPrice || ''}
                      onBlur={(event) => {
                        const value = Number(p2e(event.target.value).replace(/[^0-9]/g, '')) || 0;
                        updateCourse(tabIndex, courseIndex, 'discountedPrice', value);
                      }}
                      placeholder="بدون تخفیف"
                    />
                  </div>
                </div>

                <label style={{ ...S.lbl, marginTop: 6, fontSize: 11 }}>تاریخ پایان تخفیف (اختیاری)</label>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, flexWrap: 'wrap' }}>
                  <input
                    key={`${course.id}-${course.discountEnd || 'no-timer'}`}
                    type="datetime-local"
                    style={{ ...S.inp, flex: '1 1 220px' }}
                    defaultValue={course.discountEnd || ''}
                    onBlur={(event) => updateCourse(tabIndex, courseIndex, 'discountEnd', event.target.value)}
                  />
                  {course.discountEnd && (
                    <button
                      type="button"
                      style={{ ...AdminBtn(), color: T.err, flex: '0 0 auto' }}
                      onClick={() => updateCourse(tabIndex, courseIndex, 'discountEnd', '')}
                    >
                      لغو زمان‌سنج تخفیف
                    </button>
                  )}
                </div>
                {course.discountEnd && (
                  <small style={{ display: 'block', color: T.mut, marginTop: 4 }}>
                    لغو زمان‌سنج فقط تاریخ پایان را پاک می‌کند و قیمت تخفیف‌دار را نگه می‌دارد.
                  </small>
                )}

                <input
                  style={{ ...S.inp, marginTop: 6 }}
                  defaultValue={(course.features || []).join('|')}
                  onBlur={(event) => updateCourse(tabIndex, courseIndex, 'features', event.target.value.split('|').map((item) => item.trim()).filter(Boolean))}
                  placeholder="ویژگی‌ها با |"
                />

                <div style={{ marginTop: 10 }}>
                  <label style={{ ...S.lbl, fontSize: 11, marginBottom: 6 }}>وضعیت و نشان‌های دوره</label>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {COURSE_BADGES.map(({ key, label }) => (
                      <label
                        key={key}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          minHeight: 38,
                          padding: '6px 10px',
                          border: `1px solid ${course[key] ? T.acc : T.brd}`,
                          borderRadius: 999,
                          background: course[key] ? T.soft : T.card,
                          color: course[key] ? T.acc : T.mut,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!course[key]}
                          onChange={(event) => updateCourse(tabIndex, courseIndex, key, event.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="zkad-del"
                  title="حذف دوره"
                  onClick={() => {
                    const next = [...tabs];
                    const courses = (next[tabIndex].courses || []).filter((_: any, index: number) => index !== courseIndex);
                    next[tabIndex] = { ...next[tabIndex], courses };
                    setEditCfg({ ...editCfg, courseTabs: next });
                  }}
                >
                  حذف دوره
                </button>
              </div>
            ))}

            <button
              type="button"
              style={{ ...AdminBtn(), marginTop: 10 }}
              onClick={() => {
                const next = [...tabs];
                const courses = [...(next[tabIndex].courses || [])];
                courses.push({
                  id: `c${uid()}`,
                  title: 'دوره جدید',
                  desc: '',
                  features: [],
                  price: '',
                  discountedPrice: 0,
                  discountEnd: '',
                  image: '',
                  active: true,
                  ageBadge: true,
                  btnText: 'ثبت مستقیم این دوره',
                  order: courses.length + 1,
                });
                next[tabIndex] = { ...next[tabIndex], courses };
                setEditCfg({ ...editCfg, courseTabs: next });
              }}
            >
              <ZkPlusIcon size={13} /> افزودن دوره
            </button>
          </details>
        ))}

        <button
          type="button"
          style={AdminBtn()}
          onClick={() => setEditCfg({
            ...editCfg,
            courseTabs: [
              ...tabs,
              {
                id: `t${uid()}`,
                title: 'تب جدید',
                active: true,
                showImage: true,
                image: '',
                inactiveMessage: 'دوره‌های این تب به اتمام رسیده است.',
                courses: [],
              },
            ],
          })}
        >
          <ZkPlusIcon size={13} /> افزودن تب
        </button>
      </Box>

      <button type="button" style={S.btn} onClick={() => setSave(editCfg)}>ذخیره</button>
    </>
  );
}
