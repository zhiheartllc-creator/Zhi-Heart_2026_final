import PatientProfilePage from './PatientContent';



export function generateStaticParams() {
  return [{ id: 'init' }];
}

export default function Page() {
  return <PatientProfilePage />;
}
