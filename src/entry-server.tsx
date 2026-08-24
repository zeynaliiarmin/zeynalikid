import { renderToReadableStream } from 'react-dom/server';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import AppLaunchSplash from './components/AppLaunchSplash';
import ErrorBoundary from './components/ErrorBoundary';

interface HelmetContext { helmet?: HelmetServerState; }

export async function render(url:string,settings:unknown){
 (globalThis as typeof globalThis & {__APP_SSG_SETTINGS__?:unknown}).__APP_SSG_SETTINGS__=settings;
 const context:HelmetContext={};
 const stream=await renderToReadableStream(
  <HelmetProvider context={context}><AppLaunchSplash><MemoryRouter initialEntries={[url]}><ErrorBoundary><App/></ErrorBoundary></MemoryRouter></AppLaunchSplash></HelmetProvider>,
  {onError(error){console.error('[ssg render]',url,error);}},
 );
 await stream.allReady;
 const body=await new Response(stream).text();
 const helmet=context.helmet;
 return {
  body,
  head:[helmet?.title?.toString(),helmet?.meta?.toString(),helmet?.link?.toString(),helmet?.script?.toString()].filter(Boolean).join('\n'),
 };
}
