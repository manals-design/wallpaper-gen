import { useState, useCallback, useEffect, useRef } from "react";

const QUERIES = [
  "modern floral painting",
  "abstract colorful contemporary",
  "watercolor botanical illustration",
  "pattern textile design",
  "contemporary printmaking",
  "geometric abstract color",
  "Japanese woodblock print color",
  "Indian modern painting color",
  "folk art colorful painting",
  "graphic poster design color",
  "mixed media collage bright",
  "color field painting abstract",
  "modern tapestry textile",
  "contemporary illustration botanical",
  "pop art painting bright",
  "modern still life flowers",
  "art nouveau decorative color",
  "abstract landscape vivid",
  "contemporary African art",
  "modern ceramic art color",
];

const API = "https://api.artic.edu/api/v1/artworks/search";
const IIIF = "https://www.artic.edu/iiif/2";

// Shared icon button style
const iconBtnBase = {
  background: "rgba(255,255,255,0.15)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 50,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(255,255,255,0.9)",
  transition: "all 0.25s ease",
};

const iconBtnHover = (e) => {
  e.currentTarget.style.background = "rgba(255,255,255,0.28)";
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.45)";
  e.currentTarget.style.transform = "translateY(-1px)";
};

const iconBtnLeave = (e) => {
  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
  e.currentTarget.style.transform = "translateY(0)";
};

const iconBtnDisabled = {
  ...iconBtnBase,
  opacity: 0.25,
  cursor: "default",
};

// SVG Icons
const ChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default function WallpaperApp() {
  const [walls, setWalls] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [phase, setPhase] = useState("idle");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const usedQueries = useRef(new Set());
  const wallsRef = useRef([]);

  useEffect(() => { wallsRef.current = walls; }, [walls]);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const cur = idx >= 0 && idx < walls.length ? walls[idx] : null;

  const pickQuery = () => {
    const available = QUERIES.filter(q => !usedQueries.current.has(q));
    const pool = available.length > 0 ? available : QUERIES;
    if (available.length === 0) usedQueries.current.clear();
    const q = pool[Math.floor(Math.random() * pool.length)];
    usedQueries.current.add(q);
    return q;
  };

  const generate = useCallback(async () => {
    if (phase === "floating" || phase === "loading") return;
    setPhase("floating");
    setImgLoaded(false);
    setErrMsg("");

    const q = pickQuery();
    const pg = Math.floor(Math.random() * 5) + 1;
    const floatDone = new Promise(r => setTimeout(r, 2200));

    try {
      const res = await fetch(
        `${API}?q=${encodeURIComponent(q)}&fields=id,title,artist_title,image_id,date_display&limit=12&page=${pg}`
      );
      if (!res.ok) throw new Error("API returned " + res.status);
      const data = await res.json();
      const valid = (data.data || []).filter(a => a.image_id && a.artist_title);

      if (!valid.length) {
        await floatDone;
        setErrMsg("nothing found, try again");
        setPhase(wallsRef.current.length > 0 ? "ready" : "idle");
        return;
      }

      const art = valid[Math.floor(Math.random() * valid.length)];
      const wp = {
        url: `${IIIF}/${art.image_id}/full/1686,/0/default.jpg`,
        title: art.title || "Untitled",
        artist: art.artist_title || "Unknown",
        date: art.date_display || "",
      };

      await floatDone;
      setPhase("loading");

      await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = resolve;
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = wp.url;
      });

      const newWalls = [...wallsRef.current, wp];
      wallsRef.current = newWalls;
      setWalls(newWalls);
      setIdx(newWalls.length - 1);
      setImgLoaded(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setImgLoaded(true);
          setPhase("ready");
        });
      });
    } catch (e) {
      console.error("Generate error:", e);
      await floatDone;
      setErrMsg("couldn't fetch — try again");
      setPhase(wallsRef.current.length > 0 ? "ready" : "idle");
    }
  }, [phase]);

  const navigate = (dir) => {
    const next = idx + dir;
    if (next < 0 || next >= walls.length) return;
    setImgLoaded(false);
    setIdx(next);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setImgLoaded(true));
    });
  };

  const download = async () => {
    if (!cur) return;
    try {
      const res = await fetch(cur.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${cur.artist.replace(/[^a-zA-Z0-9]/g, "_")}_${cur.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(cur.url, "_blank");
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.code === "Space") { e.preventDefault(); generate(); }
      if (e.code === "ArrowLeft") navigate(-1);
      if (e.code === "ArrowRight") navigate(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [generate, idx, walls.length]);

  const canBack = idx > 0;
  const canNext = idx < walls.length - 1;
  const hasWallpaper = cur && phase === "ready";
  const isFloating = phase === "floating";

  const letters = "Generate".split("");
  const mono = "'IBM Plex Mono', monospace";

  return (
    <>
      <style>{`
        @keyframes drift0 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(1.2px, -3.5px) rotate(-0.7deg); }
          50% { transform: translate(-0.6px, -1.8px) rotate(0.4deg); }
          75% { transform: translate(1.4px, -3px) rotate(-0.2deg); }
        }
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-1px, -2.8px) rotate(0.5deg); }
          55% { transform: translate(1.6px, -4px) rotate(-0.6deg); }
          80% { transform: translate(-0.4px, -1.2px) rotate(0.3deg); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          30% { transform: translate(1.8px, -2.2px) rotate(-0.4deg); }
          60% { transform: translate(-1px, -4.2px) rotate(0.7deg); }
          85% { transform: translate(0.6px, -1.6px) rotate(-0.2deg); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          15% { transform: translate(-1.3px, -3.8px) rotate(0.6deg); }
          45% { transform: translate(0.8px, -1.2px) rotate(-0.3deg); }
          70% { transform: translate(-0.5px, -2.8px) rotate(0.5deg); }
        }
        @keyframes drift4 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          35% { transform: translate(1.6px, -3.2px) rotate(-0.5deg); }
          65% { transform: translate(-1.2px, -2.2px) rotate(0.4deg); }
          90% { transform: translate(0.4px, -4px) rotate(-0.15deg); }
        }
        @keyframes drift5 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          22% { transform: translate(-0.6px, -3px) rotate(0.35deg); }
          52% { transform: translate(1.8px, -2px) rotate(-0.7deg); }
          78% { transform: translate(-0.8px, -3.5px) rotate(0.25deg); }
        }
        @keyframes drift6 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          28% { transform: translate(1.3px, -4px) rotate(-0.45deg); }
          58% { transform: translate(-1.5px, -1.4px) rotate(0.6deg); }
          82% { transform: translate(0.5px, -2.8px) rotate(-0.3deg); }
        }
        @keyframes drift7 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          18% { transform: translate(-1px, -2.2px) rotate(0.25deg); }
          48% { transform: translate(1.3px, -3.8px) rotate(-0.5deg); }
          75% { transform: translate(-0.3px, -2px) rotate(0.4deg); }
        }

        @keyframes softPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.65; }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes gentleBreath {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2.5px); }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #root { height: 100%; width: 100%; overflow: hidden; }
      `}</style>

      <div style={{
        width: "100vw", height: "100vh", position: "relative", overflow: "hidden",
        backgroundColor: "#f8f8f6", fontFamily: mono, cursor: "default",
      }}>

        {/* Wallpaper background */}
        {cur && (
          <div key={`bg-${idx}`} style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${cur.url})`, backgroundSize: "cover", backgroundPosition: "center",
            opacity: imgLoaded ? 1 : 0,
            transition: "opacity 1.1s cubic-bezier(0.25, 0.1, 0.25, 1)",
            zIndex: 0,
          }} />
        )}

        {/* Vignette */}
        {hasWallpaper && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
            background: "radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.18) 100%)",
          }} />
        )}

        {/* Center content */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", zIndex: 10,
        }}>

          {/* Generate + nav row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
          }}>

            {/* Back arrow */}
            {walls.length > 1 && phase === "ready" && (
              <button
                onClick={e => { e.stopPropagation(); navigate(-1); }}
                disabled={!canBack}
                style={{
                  ...(canBack ? iconBtnBase : iconBtnDisabled),
                  width: 40, height: 40,
                  animation: "fadeIn 0.3s ease",
                }}
                onMouseEnter={canBack ? iconBtnHover : undefined}
                onMouseLeave={canBack ? iconBtnLeave : undefined}
              >
                <ChevronLeft />
              </button>
            )}

            {/* Generate text */}
            <div
              onClick={generate}
              role="button"
              tabIndex={0}
              style={{
                position: "relative", cursor: "pointer",
                display: "flex", alignItems: "baseline",
                animation: phase === "idle" ? "gentleBreath 5s ease-in-out infinite" : "none",
              }}
            >
              {letters.map((letter, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: mono,
                    fontSize: "clamp(40px, 7vw, 82px)",
                    fontWeight: 400,
                    letterSpacing: "-0.03em",
                    color: hasWallpaper ? "#fff" : "#1a1a1a",
                    textShadow: hasWallpaper
                      ? "0 2px 20px rgba(0,0,0,0.4), 0 0 50px rgba(0,0,0,0.12)"
                      : "none",
                    transition: "color 0.8s ease, text-shadow 0.8s ease",
                    userSelect: "none",
                    display: "inline-block",
                    animation: isFloating
                      ? `drift${i % 8} ${2 + (i % 4) * 0.35}s ease-in-out infinite`
                      : "none",
                    willChange: isFloating ? "transform" : "auto",
                  }}
                >
                  {letter}
                </span>
              ))}
            </div>

            {/* Next arrow */}
            {walls.length > 1 && phase === "ready" && (
              <button
                onClick={e => { e.stopPropagation(); navigate(1); }}
                disabled={!canNext}
                style={{
                  ...(canNext ? iconBtnBase : iconBtnDisabled),
                  width: 40, height: 40,
                  animation: "fadeIn 0.3s ease",
                }}
                onMouseEnter={canNext ? iconBtnHover : undefined}
                onMouseLeave={canNext ? iconBtnLeave : undefined}
              >
                <ChevronRight />
              </button>
            )}
          </div>

          {/* Loading dots */}
          {phase === "loading" && (
            <div style={{
              display: "flex", gap: 6, marginTop: 18,
              animation: "fadeIn 0.3s ease",
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 3, height: 3, borderRadius: "50%",
                  backgroundColor: wallsRef.current.length > 0 ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.18)",
                  animation: `softPulse 1.3s ${i * 0.25}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          )}

          {/* Floating hint */}
          {isFloating && (
            <div style={{
              marginTop: 20, fontSize: 11, fontWeight: 300, letterSpacing: "0.08em",
              color: hasWallpaper ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.18)",
              animation: "fadeIn 1s ease",
              textShadow: hasWallpaper ? "0 1px 6px rgba(0,0,0,0.2)" : "none",
              fontFamily: mono,
            }}>
              finding something nice...
            </div>
          )}

          {/* Error */}
          {errMsg && phase !== "floating" && phase !== "loading" && (
            <div style={{
              marginTop: 16, fontSize: 11, fontWeight: 300,
              color: hasWallpaper ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.25)",
              animation: "fadeInUp 0.3s ease", fontFamily: mono,
            }}>
              {errMsg}
            </div>
          )}
        </div>

        {/* Artist credit — bottom right */}
        {hasWallpaper && cur && (
          <div style={{
            position: "absolute", bottom: 22, right: 26, zIndex: 20,
            textAlign: "right", maxWidth: "42%",
            animation: "fadeInUp 0.5s ease 0.12s both",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.8)",
              letterSpacing: "0.03em", textShadow: "0 1px 8px rgba(0,0,0,0.45)",
              lineHeight: 1.6, fontFamily: mono,
            }}>
              {cur.artist}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 300, color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.02em", textShadow: "0 1px 6px rgba(0,0,0,0.3)",
              marginTop: 3, fontStyle: "italic", fontFamily: mono, lineHeight: 1.5,
            }}>
              {cur.title}{cur.date ? ` · ${cur.date}` : ""}
            </div>
          </div>
        )}

        {/* Download button — top right */}
        {hasWallpaper && (
          <button
            onClick={download}
            style={{
              ...iconBtnBase,
              position: "absolute", top: 20, right: 24, zIndex: 20,
              width: 42, height: 42,
              animation: "fadeInUp 0.4s ease 0.2s both",
            }}
            onMouseEnter={iconBtnHover}
            onMouseLeave={iconBtnLeave}
          >
            <DownloadIcon />
          </button>
        )}

        {/* Counter — bottom left */}
        {walls.length > 0 && phase === "ready" && (
          <div style={{
            position: "absolute", bottom: 22, left: 26, zIndex: 20,
            fontSize: 10, fontWeight: 300, fontVariantNumeric: "tabular-nums",
            color: hasWallpaper ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.18)",
            letterSpacing: "0.08em", fontFamily: mono,
            textShadow: hasWallpaper ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
          }}>
            {idx + 1} / {walls.length}
          </div>
        )}

        {/* Source */}
        {phase === "idle" && (
          <div style={{
            position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)",
            fontSize: 9, fontWeight: 300, color: "rgba(0,0,0,0.16)",
            letterSpacing: "0.12em", fontFamily: mono,
            textTransform: "lowercase", whiteSpace: "nowrap",
          }}>
            art institute of chicago · open access
          </div>
        )}

        {phase === "idle" && (
          <div style={{
            position: "absolute", bottom: 26, right: 26,
            fontSize: 9, fontWeight: 300, color: "rgba(0,0,0,0.13)",
            letterSpacing: "0.08em", fontFamily: mono, textTransform: "lowercase",
          }}>
            spacebar to generate
          </div>
        )}
      </div>
    </>
  );
}