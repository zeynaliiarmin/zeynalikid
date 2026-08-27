type KnowledgeScope='public'|'admin';
type KnowledgeRow=Record<string,unknown>;

const text=(value:unknown)=>String(value??'').replace(/\r\n?/g,'\n').trim();
const list=(value:unknown)=>Array.isArray(value)?value.map(item=>text(item)).filter(Boolean):[];
const bool=(value:unknown)=>value===true?'بله':'خیر';
const inline=(value:unknown)=>text(value).replace(/\n+/g,' ');
const line=(label:string,value:unknown)=>`- **${label}:** ${text(value)||'-'}`;
async function allKnowledgeRows(db:any,table:string){const rows:KnowledgeRow[]=[],pageSize=1000;for(let from=0;;from+=pageSize){const {data,error}=await db.from(table).select('*').order('updated_at',{ascending:false}).range(from,from+pageSize-1);if(error)throw error;const page=(data||[]) as KnowledgeRow[];rows.push(...page);if(page.length<pageSize)break}return rows}

function knowledgeEntry(row:KnowledgeRow,index:number,scope:KnowledgeScope):string{
  const aliases=list(row.aliases),keywords=list(row.keywords),actions=Array.isArray(row.actions)?row.actions:[];
  const common=[
    `\n### ${index+1}. ${inline(row.question)||'بدون سؤال'}`,
    line('شناسه',row.id),
    line('وضعیت',row.status),
    line('فعال',bool(row.is_active)),
    line('دسته‌بندی',row.category),
    line('شیوه پاسخ',row.response_mode),
    line('نوع تشخیص',row.match_mode),
    line('اولویت',row.priority),
    line('جمله‌های مشابه',aliases.join(' | ')),
    line('کلمات کلیدی',keywords.join(' | ')),
    '**پاسخ:**',
    text(row.answer)||'-',
  ];
  if(scope==='public')common.push(
    line('دکمه‌ها',actions.length?JSON.stringify(actions):''),
    line('لینک منبع',row.source_url),
  );
  else common.push(
    line('تب مقصد پنل',row.target_tab),
    line('بخش برجسته',row.target_focus),
    line('عنوان دکمه',row.action_label),
  );
  common.push(line('ایجادکننده',row.created_by),line('زمان ایجاد',row.created_at),line('آخرین ویرایش',row.updated_at),'\n---');
  return common.join('\n');
}

export async function buildAssistantKnowledgeBackup(db:any,brand:string){
  const [publicKnowledge,adminKnowledge,{data:settings,error:settingsError}]=await Promise.all([
    allKnowledgeRows(db,'assistant_knowledge'),
    allKnowledgeRows(db,'assistant_admin_knowledge'),
    db.from('assistant_settings').select('enabled,welcome_message,fallback_message,admin_block_message,disclaimer,suggested_questions,frequent_question_threshold,revision,updated_at').eq('key','default').maybeSingle(),
  ]);
  if(settingsError)throw settingsError;
  const createdAt=new Date().toISOString();
  const content=[
    `# بکاپ کامل دانش دستیار ${text(brand)}`,
    '',
    `- **زمان تهیه:** ${createdAt}`,
    `- **تعداد دانش عمومی سایت:** ${publicKnowledge.length}`,
    `- **تعداد دانش راهنمای پنل مدیریت:** ${adminKnowledge.length}`,
    '',
    '## تنظیمات دستیار',
    line('فعال بودن دستیار عمومی',bool(settings?.enabled)),
    line('آستانه اعلان سؤال پرتکرار',settings?.frequent_question_threshold),
    line('نسخه تنظیمات',settings?.revision),
    line('پیام خوش‌آمد',settings?.welcome_message),
    line('پاسخ نبود دانش',settings?.fallback_message),
    line('پاسخ درخواست مدیریتی در سایت',settings?.admin_block_message),
    line('متن محدودیت',settings?.disclaimer),
    line('سؤال‌های پیشنهادی',settings?.suggested_questions?JSON.stringify(settings.suggested_questions):''),
    line('آخرین ویرایش تنظیمات',settings?.updated_at),
    '',
    '## دانش عمومی کاربران سایت',
    publicKnowledge.length?publicKnowledge.map((row,index)=>knowledgeEntry(row,index,'public')).join('\n'):'موردی ثبت نشده است.',
    '',
    '## دانش راهنمای پنل مدیریت',
    adminKnowledge.length?adminKnowledge.map((row,index)=>knowledgeEntry(row,index,'admin')).join('\n'):'موردی ثبت نشده است.',
    '',
    '_پایان بکاپ_',
  ].join('\n');
  return {filename:`assistant-knowledge-backup-${createdAt.replace(/[:.]/g,'-')}.md`,content,createdAt,counts:{public:publicKnowledge.length,admin:adminKnowledge.length}};
}
