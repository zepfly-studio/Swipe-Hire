import { MessageCircle } from 'lucide-react';

// Floating "Chat on WhatsApp" button, switched on in Admin → Integrations.
export default function WhatsAppButton({ number, text }) {
  const href = `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      className="fixed bottom-24 left-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#25d366] text-[#fff] shadow-lg shadow-black/20 transition-transform hover:scale-105 sm:bottom-6 sm:left-6"
    >
      <MessageCircle size={24} />
    </a>
  );
}
