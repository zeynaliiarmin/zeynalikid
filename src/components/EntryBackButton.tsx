import PublicBackButton from './PublicBackButton';

type EntryBackButtonProps = {
  lang: 'fa' | 'en';
};

/** Option-2 return control used by the public tracking, sign-in and registration flows. */
export default function EntryBackButton({ lang }: EntryBackButtonProps) {
  return <PublicBackButton lang={lang} testId="public-entry-back" />;
}
