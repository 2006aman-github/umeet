import { useState, useEffect } from "react";

function Clock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setTime(formatted);
    };

    updateTime(); // Initial call
    const interval = setInterval(updateTime, 1000 * 60);

    return () => clearInterval(interval); // Cleanup
  }, []);

  return <div className=" font-bold">{time}</div>;
}

export default Clock;
