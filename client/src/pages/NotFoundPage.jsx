import { Link } from 'react-router-dom';
import Background from '../components/Background';
import Logo from '../components/Logo';

// Unknown URLs get a real "not found" page (marked noindex) instead of a silent redirect.
export default function NotFoundPage() {
  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10 text-center">
      <Background />
      <div className="relative">
        <Link to="/" className="inline-block" aria-label="Swipe Hire home">
          <Logo />
        </Link>
        <img
          src="/illustrations/not-found.webp"
          alt=""
          width={640}
          height={480}
          className="mx-auto mt-8 w-full max-w-sm rounded-3xl ring-1 ring-white/10"
          draggable={false}
        />
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight">This page swiped left</h1>
        <p className="mt-2 text-white/55">The link may be old or mistyped.</p>
        <Link to="/" className="btn-primary mt-6">
          Go to home
        </Link>
      </div>
    </div>
  );
}
