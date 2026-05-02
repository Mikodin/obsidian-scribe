import { useEffect, useState } from 'react';

export function ModalRecordingTimer({
  elapsedTimeMs,
}: {
  elapsedTimeMs: number;
}) {
  const [duration, setDuration] = useState({
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });

  useEffect(() => {
    const { minutes, seconds, milliseconds } = calculateDuration(elapsedTimeMs);
    setDuration({ minutes, seconds, milliseconds });
  }, [elapsedTimeMs]);

  return (
    <div className="scribe-timer">
      <span className="scribe-timer-digits">
        {padWithZeros(duration.minutes, 2)}:
      </span>
      <span className="scribe-timer-digits scribe-timer-millis">
        {padWithZeros(duration.seconds, 2)}.
      </span>
      <span className="scribe-timer-digits scribe-timer-millis">
        {padWithZeros(duration.milliseconds, 2)}
      </span>
    </div>
  );
}

function calculateDuration(durationInMs: number) {
  let remainingTime = durationInMs;
  const hours = Math.floor(remainingTime / (1000 * 60 * 60));
  remainingTime -= hours * (1000 * 60 * 60);
  const minutes = Math.floor(remainingTime / (1000 * 60));
  remainingTime -= minutes * (1000 * 60);
  const seconds = Math.floor(remainingTime / 1000);
  remainingTime -= seconds * 1000;
  let milliseconds = remainingTime;
  if (milliseconds >= 100) {
    milliseconds = Math.floor(milliseconds / 10);
  }

  return {
    hours,
    minutes,
    seconds,
    milliseconds,
  };
}

const padWithZeros = (num: number, length: number): string => {
  let numStr = num.toString();
  while (numStr.length < length) {
    numStr = `0${numStr}`;
  }
  return numStr;
};
