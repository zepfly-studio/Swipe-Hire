import { Link } from 'react-router-dom';
import Background from '../components/Background';
import Logo from '../components/Logo';
import Illustration from '../components/Illustration';

// Unknown URLs get a real "not found" page (marked noindex) instead of a silent redirect.
export default function NotFoundPage() {
  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10 text-center">
      <Background />
      <div className="relative">
        <Link to="/" className="inline-block" aria-label="Glide Recruit home">
          <Logo />
        </Link>
        <p className="mt-10 text-7xl font-extrabold tracking-tight text-brand-500">404</p>
        <Illustration name="not-found" className="mt-6" />
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight">This page swiped left</h1>
        <p className="mt-2 text-white/55">The link may be old or mistyped.</p>
        <Link to="/" className="btn-primary mt-6">
          Go to home
        </Link>
      </div>
    </div>
  );
}
