import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg glow-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
      aria-label="Maç Ekle"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
