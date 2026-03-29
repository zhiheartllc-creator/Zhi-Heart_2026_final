import RequestDetailsPage from './RequestContent';



export function generateStaticParams() {
  return [{ id: 'init' }];
}

export default function Page() {
  return <RequestDetailsPage />;
}
