import { Link } from 'react-router-dom';
import Background from '../components/Background';
import Logo from '../components/Logo';
import ThemeArt from '../components/ThemeArt';

// Unknown URLs get a real "not found" page (marked noindex) instead of a silent redirect.
export default function NotFoundPage() {
  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10 text-center">
      <Background />
      <div className="relative">
        <Link to="/" className="inline-block" aria-label="Swipe Hire home">
          <Logo />
        </Link>
        <ThemeArt
          name="not-found"
          alt=""
          width={640}
          height={480}
          className="mx-auto mt-8 w-full max-w-sm"
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
