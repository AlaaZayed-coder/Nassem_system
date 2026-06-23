-- =====================================================
-- تصنيف تلقائي للأصناف بناءً على الاسم
-- شغّل هذا في Supabase SQL Editor
-- =====================================================

-- أولاً: تأكد من وجود التصنيفات العشرة
INSERT INTO erp_categories (name, type, is_active)
VALUES
  ('أبواب رول ومستلزماتها',          'main', true),
  ('أبواب ومستلزماتها',               'main', true),
  ('مواتير وماكينات وقطع كهربائية',  'main', true),
  ('صاج ومواد خام',                   'main', true),
  ('إكسسوارات أبواب وجرارات',        'main', true),
  ('مفصلات وأقفال وقطع تثبيت',       'main', true),
  ('زينة حديد وحدادة ديكورية',       'main', true),
  ('روزيت وغطاء وقطع تشطيب',         'main', true),
  ('شبك وسلك ومجاري',                 'main', true),
  ('خدمات وتصنيع وتشطيب',            'main', true)
ON CONFLICT (name) DO NOTHING;

-- ثانياً: تصنيف الأصناف تلقائياً (الأكثر تحديداً أولاً)
UPDATE erp_items
SET main_category = CASE

  /* ── أبواب رول ومستلزماتها (أولاً لأنها أكثر تحديداً) */
  WHEN original_name ILIKE '%باب رول%'       THEN 'أبواب رول ومستلزماتها'
  WHEN original_name ILIKE '%مجرى باب رول%'  THEN 'أبواب رول ومستلزماتها'
  WHEN original_name ILIKE '%جبهة باب%'      THEN 'أبواب رول ومستلزماتها'
  WHEN original_name ILIKE '%سوستة%'         THEN 'أبواب رول ومستلزماتها'
  WHEN original_name ILIKE '%سبرينج%'        THEN 'أبواب رول ومستلزماتها'
  WHEN original_name ILIKE '%جومي%'          THEN 'أبواب رول ومستلزماتها'
  WHEN original_name ILIKE '%رول%'           THEN 'أبواب رول ومستلزماتها'

  /* ── أبواب ومستلزماتها */
  WHEN original_name ILIKE '%باب حديد%'      THEN 'أبواب ومستلزماتها'
  WHEN original_name ILIKE '%باب جرار%'      THEN 'أبواب ومستلزماتها'
  WHEN original_name ILIKE '%باب جاهز%'      THEN 'أبواب ومستلزماتها'
  WHEN original_name ILIKE '%باب%'           THEN 'أبواب ومستلزماتها'

  /* ── مواتير وماكينات وقطع كهربائية */
  WHEN original_name ILIKE '%موتور%'         THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%ماكينة%'        THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%محرك%'          THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%كهرباء%'        THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%كهربائي%'       THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%ريموت%'         THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%رسيفر%'         THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%GSM%'           THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%تحكم%'          THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%بطارية%'        THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%سنسور%'         THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%لمبة%'          THEN 'مواتير وماكينات وقطع كهربائية'
  WHEN original_name ILIKE '%سنديان%'        THEN 'مواتير وماكينات وقطع كهربائية'

  /* ── صاج ومواد خام */
  WHEN original_name ILIKE '%ورق صاج%'       THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%ورق سكب%'       THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%ورق حديد%'      THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%مربع مضرب%'     THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%مقطع حديد%'     THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%حديد خام%'      THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%مواد خام%'      THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%صاج%'           THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%سكبة%'          THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%سكب%'           THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%اسة%'           THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%آسة%'           THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%شكلة%'          THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%مضرب%'          THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%قالب%'          THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%مظلة%'          THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%بروفيل%'        THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%انبوب%'         THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%أنبوب%'         THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '%ورق%'           THEN 'صاج ومواد خام'
  WHEN original_name ILIKE '% جل %'          THEN 'صاج ومواد خام'

  /* ── إكسسوارات أبواب وجرارات */
  WHEN original_name ILIKE '%جرار%'          THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%عجل%'           THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%مجرى%'          THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%ستوب%'          THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%تلسكوب%'        THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%بكرة%'          THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%ريل%'           THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%سكة%'           THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%هادي%'          THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%دليل%'          THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%يد باب%'        THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '% يد %'          THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%مسكة%'          THEN 'إكسسوارات أبواب وجرارات'
  WHEN original_name ILIKE '%هاندل%'         THEN 'إكسسوارات أبواب وجرارات'

  /* ── مفصلات وأقفال وقطع تثبيت */
  WHEN original_name ILIKE '%مفصلة%'         THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%مفصل%'          THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%قفل%'           THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%لقاطة%'         THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%لقاط%'          THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%أذن%'           THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%حمالة%'         THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%برغي%'          THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%براغي%'         THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%مسمار%'         THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%صامولة%'        THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%ربط%'           THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%تثبيت%'         THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%كلامبس%'        THEN 'مفصلات وأقفال وقطع تثبيت'
  WHEN original_name ILIKE '%ابزيم%'         THEN 'مفصلات وأقفال وقطع تثبيت'

  /* ── زينة حديد وحدادة ديكورية */
  WHEN original_name ILIKE '%زينة%'          THEN 'زينة حديد وحدادة ديكورية'
  WHEN original_name ILIKE '%مخروط%'         THEN 'زينة حديد وحدادة ديكورية'
  WHEN original_name ILIKE '%رمح%'           THEN 'زينة حديد وحدادة ديكورية'
  WHEN original_name ILIKE '%طابة%'          THEN 'زينة حديد وحدادة ديكورية'
  WHEN original_name ILIKE '%كرة%'           THEN 'زينة حديد وحدادة ديكورية'
  WHEN original_name ILIKE '%ديكور%'         THEN 'زينة حديد وحدادة ديكورية'
  WHEN original_name ILIKE '%زخرف%'          THEN 'زينة حديد وحدادة ديكورية'
  WHEN original_name ILIKE '%حدادة%'         THEN 'زينة حديد وحدادة ديكورية'
  WHEN original_name ILIKE '%ورد%'           THEN 'زينة حديد وحدادة ديكورية'
  WHEN original_name ILIKE '%نجمة%'          THEN 'زينة حديد وحدادة ديكورية'

  /* ── روزيت وغطاء وقطع تشطيب */
  WHEN original_name ILIKE '%روزيت%'         THEN 'روزيت وغطاء وقطع تشطيب'
  WHEN original_name ILIKE '%غطاء روزيت%'    THEN 'روزيت وغطاء وقطع تشطيب'
  WHEN original_name ILIKE '%غطاء%'          THEN 'روزيت وغطاء وقطع تشطيب'
  WHEN original_name ILIKE '%كوبر%'          THEN 'روزيت وغطاء وقطع تشطيب'
  WHEN original_name ILIKE '%تشطيب%'         THEN 'روزيت وغطاء وقطع تشطيب'
  WHEN original_name ILIKE '%بلاستيك%'       THEN 'روزيت وغطاء وقطع تشطيب'

  /* ── شبك وسلك ومجاري */
  WHEN original_name ILIKE '%شبكة%'          THEN 'شبك وسلك ومجاري'
  WHEN original_name ILIKE '%شبك%'           THEN 'شبك وسلك ومجاري'
  WHEN original_name ILIKE '%سلك%'           THEN 'شبك وسلك ومجاري'

  /* ── خدمات وتصنيع وتشطيب */
  WHEN original_name ILIKE '%تركيب%'         THEN 'خدمات وتصنيع وتشطيب'
  WHEN original_name ILIKE '%دهان%'          THEN 'خدمات وتصنيع وتشطيب'
  WHEN original_name ILIKE '%قص%'            THEN 'خدمات وتصنيع وتشطيب'
  WHEN original_name ILIKE '%ثني%'           THEN 'خدمات وتصنيع وتشطيب'
  WHEN original_name ILIKE '%لحام%'          THEN 'خدمات وتصنيع وتشطيب'
  WHEN original_name ILIKE '%صنع%'           THEN 'خدمات وتصنيع وتشطيب'
  WHEN original_name ILIKE '%تصنيع%'         THEN 'خدمات وتصنيع وتشطيب'
  WHEN original_name ILIKE '%خدمة%'          THEN 'خدمات وتصنيع وتشطيب'
  WHEN original_name ILIKE '%تلميع%'         THEN 'خدمات وتصنيع وتشطيب'
  WHEN original_name ILIKE '%طلاء%'          THEN 'خدمات وتصنيع وتشطيب'

  ELSE main_category
END
WHERE main_category IS NULL OR main_category = '';

-- تحقق من النتيجة
SELECT main_category, COUNT(*) as total
FROM erp_items
GROUP BY main_category
ORDER BY total DESC;
