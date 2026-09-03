export const PATH_TO_VIEW:Record<string,string>={
 '/':'home','/courses':'courses','/track':'track','/portal':'track','/experience':'experience','/licenses':'licenses','/education':'education','/about':'about','/faq':'faq','/contact':'contact','/products':'products','/profile':'profile','/growth':'growth','/settings':'settings','/privacy':'privacy','/desk':'admin-login','/desk/app':'admin','/child-info':'child-info','/course-shipping':'course-shipping','/course-payment':'course-payment','/course-payment/verify':'payment-verify','/course-confirm':'course-confirm','/course-done':'course-done','/form':'form','/consultation':'form',
};

export const VIEW_TO_PATH:Record<string,string>=Object.fromEntries(Object.entries(PATH_TO_VIEW).map(([path,view])=>[view,path]));

export const SYSTEM_REFERRAL_PATHS=new Set([
 'admin','admin-login','desk','desk/app','courses','experience','education','about','contact','faq','products','form','consultation','track','growth','settings','profile','privacy','licenses','child-info','course-shipping','course-payment','course-confirm','course-done','payment-verify',
]);
