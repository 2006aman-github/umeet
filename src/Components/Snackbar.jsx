import { useEffect, useState } from "react";

function Snackbar({ message = "kya re!!", visible, onClose }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md bg-red-500 text-white shadow-lg transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {"bsd wala " + message}
    </div>
  );
}

export default Snackbar;
