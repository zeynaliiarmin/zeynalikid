export const defaultCountries = [
 {id:'ir',name:'ایران',nameEn:'Iran',code:'+98',flag:'🇮🇷',regex:'^(0?9)\\d{9}$',required:true,locked:true},
 {id:'us',name:'آمریکا/کانادا',nameEn:'US/Canada',code:'+1',flag:'🇺🇸',regex:'^[2-9]\\d{9}$',required:true},
 {id:'uk',name:'انگلیس',nameEn:'United Kingdom',code:'+44',flag:'🇬🇧',regex:'^0\\d{9,10}$'},
 {id:'de',name:'آلمان',nameEn:'Germany',code:'+49',flag:'🇩🇪',regex:'^0\\d{9,10}$'},
 {id:'se',name:'سوئد',nameEn:'Sweden',code:'+46',flag:'🇸🇪',regex:'^0\\d{8,9}$'},
 {id:'ch',name:'سوئیس',nameEn:'Switzerland',code:'+41',flag:'🇨🇭',regex:'^0\\d{8,9}$'},
 {id:'no',name:'نروژ',nameEn:'Norway',code:'+47',flag:'🇳🇴',regex:'^[49]\\d{7}$'},
 {id:'fr',name:'فرانسه',nameEn:'France',code:'+33',flag:'🇫🇷',regex:'^0\\d{9}$'},
 {id:'au',name:'استرالیا',nameEn:'Australia',code:'+61',flag:'🇦🇺',regex:'^0\\d{8,9}$'},
 {id:'ae',name:'امارات',nameEn:'UAE',code:'+971',flag:'🇦🇪',regex:'^0\\d{8}$'},
 {id:'tr',name:'ترکیه',nameEn:'Turkey',code:'+90',flag:'🇹🇷',regex:'^0\\d{9}$'},
 {id:'nl',name:'هلند',nameEn:'Netherlands',code:'+31',flag:'🇳🇱',regex:'^0\\d{8,9}$'},
 {id:'in',name:'هند',nameEn:'India',code:'+91',flag:'🇮🇳',regex:'^[6-9]\\d{9}$'},
 {id:'af',name:'افغانستان',nameEn:'Afghanistan',code:'+93',flag:'🇦🇫',regex:'^0?\\d{9}$'},
 {id:'other',name:'سایر',nameEn:'Other',code:'+',flag:'🌍',regex:'^\\d{7,}$'}
] as Array<Record<string, unknown>>;

export const defaultSettings = {} as Record<string, unknown>;
