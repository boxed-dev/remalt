'use client';

export function TallyWidget() {
  const handleFeedbackClick = () => {
    window.open('https://remaltx.featurebase.app/', '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleFeedbackClick}
      className="fixed bottom-6 right-6 bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-full shadow-lg transition-all hover:shadow-xl text-sm font-medium z-50"
    >
      Feedback
    </button>
  );
}
