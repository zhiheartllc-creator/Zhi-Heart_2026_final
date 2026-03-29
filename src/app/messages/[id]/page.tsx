import DirectMessagePage from './MessageContent';

export function generateStaticParams() {
  return [{ id: 'init' }];
}

export default function Page() {
  return <DirectMessagePage />;
}
