export default function Loader({ full = false }) {
  return (
    <div className={`flex items-center justify-center ${full ? 'min-h-[60vh]' : 'py-10'}`}>
      <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
