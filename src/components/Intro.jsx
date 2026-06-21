import React, { useEffect, useRef } from "react";

// Full-screen splash: title rises into view, a coral rule draws, the credit
// fades in, then the whole panel lifts away to reveal the app. Click to skip.
export default function Intro({ onDone }) {
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(finish, reduce ? 500 : 3400); // safety net
    return () => clearTimeout(t);
  }, []);

  const words = [
    { text: "Personal" },
    { text: "Budget" },
    { text: "Tracker", accent: true },
  ];

  return (
    <div
      className="intro"
      onClick={finish}
      onAnimationEnd={(e) => { if (e.animationName === "intro-lift") finish(); }}
      role="presentation"
    >
      <div className="intro__inner">
        <div className="intro__mark" aria-hidden="true">
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <rect width="100" height="100" rx="26" fill="#F5491F" />
            <g>
              <rect x="22" y="80" width="9" height="13" rx="4" fill="#E07FA6" />
              <rect x="34" y="80" width="9" height="13" rx="4" fill="#E07FA6" />
              <rect x="58" y="80" width="9" height="13" rx="4" fill="#E07FA6" />
              <rect x="70" y="80" width="9" height="13" rx="4" fill="#E07FA6" />
              <path d="M81 61 q10 -1 8 -9 q-2 -6 -8 -3" fill="none" stroke="#E07FA6" strokeWidth="4.5" strokeLinecap="round" />
              <ellipse cx="50" cy="66" rx="33" ry="22" fill="#F2A0C0" />
              <path d="M29 47 q-5 -14 8 -15 q5 7 1 16 z" fill="#E07FA6" />
              <ellipse cx="19" cy="66" rx="9" ry="10.5" fill="#E07FA6" />
              <circle cx="16" cy="66" r="1.9" fill="#3B2B33" />
              <circle cx="22" cy="66" r="1.9" fill="#3B2B33" />
              <circle cx="33" cy="61" r="3" fill="#3B2B33" />
              <rect x="46" y="49" width="22" height="5" rx="2.5" fill="#3B2B33" />
            </g>
            <g>
              <circle cx="54" cy="27" r="14" fill="#F6C544" />
              <circle cx="54" cy="27" r="10.5" fill="#FBD96B" />
              <text x="54" y="33" textAnchor="middle" fontFamily="'Space Grotesk Variable', system-ui, sans-serif" fontWeight="700" fontSize="15" fill="#C58A1E">$</text>
            </g>
          </svg>
        </div>
        <h1 className="intro__title">
          {words.map((w, i) => (
            <span key={w.text} className={`intro__word${w.accent ? " intro__word--accent" : ""}`}>
              <span style={{ animationDelay: `${0.15 + i * 0.13}s` }}>{w.text}</span>
            </span>
          ))}
        </h1>
        <div className="intro__rule" />
        <p className="intro__by">
          Made by <b>Aian Pavelescu</b> &amp; <b>Claude AI</b>
        </p>
        <p className="intro__skip">click to skip</p>
      </div>
    </div>
  );
}
