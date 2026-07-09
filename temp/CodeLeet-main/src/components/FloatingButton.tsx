import detectiveLogo from '../../assets/logo.png';

interface Props {
  onClick: () => void;
}

export default function FloatingButton({ onClick }: Props) {
  return (
    <button 
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 bg-gray-900 hover:bg-gray-800 text-white p-0 w-16 h-16 rounded-full shadow-2xl border-2 border-green-500 transition-transform hover:scale-110 flex items-center justify-center group overflow-hidden cursor-pointer"
      title="Open LeetCode Detective"
    >
      <img src={detectiveLogo} alt="Logo" className="w-full h-full object-cover" />
    </button>
  );
}