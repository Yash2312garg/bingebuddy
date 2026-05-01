import React, { useEffect, useRef, useState } from "react";
import type { OtpResendTimerProps } from "../Types/OtpResendTimer";
const OtpResendTimer: React.FC<OtpResendTimerProps> = ({
  initialTime,
  onResend,
}) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [canResend, setCanResend] = useState<boolean>(false);
  const timeRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (timeLeft > 0) {
      timeRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else {
      if (timeRef.current) clearInterval(timeRef.current);
      setCanResend(true);
    }
    return () => {
      if (timeRef.current) {
        clearInterval(timeRef.current);
      }
    };
  }, [timeLeft]);

  const handleResendClick = () => {
    if (onResend) {
      onResend();
    }
    setTimeLeft(initialTime);
    setCanResend(false);
  };
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };
  return (
    <>
      {canResend ? (
        <button className="Resend-timer-btn" onClick={handleResendClick}>
          Resend OTP
        </button>
      ) : (
        <span className="Resend-timer">
          Resend OTP in {formatTime(timeLeft)}s..
        </span>
      )}
    </>
  );
};

export default OtpResendTimer;
