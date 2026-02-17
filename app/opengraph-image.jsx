import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export const alt = 'Connect Four — Online Multiplayer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Board: 1 = red, 2 = yellow, 0 = empty. Red wins diagonally.
const BOARD = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 0, 0],
  [0, 1, 2, 1, 2, 0, 0],
  [1, 2, 1, 2, 1, 2, 0],
];

// Winning diagonal positions to highlight
const WINNING = new Set(['2-3', '3-2', '4-1', '5-0']);

export default function Image() {
  const fontBuf = fs.readFileSync(
    path.join(process.cwd(), 'public/fonts/Silkscreen-Regular.ttf')
  );
  const fontData = fontBuf.buffer.slice(
    fontBuf.byteOffset,
    fontBuf.byteOffset + fontBuf.byteLength
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#0a0a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 72px',
          fontFamily: '"Silkscreen"',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top border accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #ff4757, #eccc68, #70a1ff)',
          }}
        />

        {/* Ambient glow top-left */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -80,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,204,104,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Ambient glow bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            right: -80,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,71,87,0.08) 0%, transparent 70%)',
          }}
        />

        {/* ── LEFT: text content ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            maxWidth: 540,
            position: 'relative',
          }}
        >
          {/* Arcade label */}
          <div
            style={{
              display: 'flex',
              color: '#70a1ff',
              fontSize: 13,
              letterSpacing: 4,
              opacity: 0.75,
            }}
          >
            ▶ INSERT COIN TO PLAY
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                color: '#eccc68',
                fontSize: 88,
                lineHeight: 1,
                textShadow: '0 0 40px rgba(236,204,104,0.55)',
              }}
            >
              CONNECT
            </div>
            <div
              style={{
                color: '#ff4757',
                fontSize: 88,
                lineHeight: 1,
                textShadow: '0 0 40px rgba(255,71,87,0.55)',
              }}
            >
              FOUR
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 220,
              height: 2,
              background: 'linear-gradient(90deg, rgba(112,161,255,0.7), transparent)',
            }}
          />

          {/* Description */}
          <div
            style={{
              color: '#8888bb',
              fontSize: 18,
              lineHeight: 1.7,
              letterSpacing: 0.5,
            }}
          >
            Challenge friends online or battle the AI — 3 difficulty levels, live scoreboard, no downloads.
          </div>

          {/* Feature badges */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['VS COMPUTER', 'ONLINE MULTIPLAYER', 'REMATCH SYSTEM'].map((label) => (
              <div
                key={label}
                style={{
                  background: 'rgba(112,161,255,0.08)',
                  border: '1px solid rgba(112,161,255,0.25)',
                  color: '#70a1ff',
                  fontSize: 11,
                  padding: '5px 14px',
                  letterSpacing: 1.5,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: game board ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            background: 'rgba(112,161,255,0.05)',
            border: '2px solid rgba(112,161,255,0.18)',
            padding: 20,
            boxShadow: '0 0 80px rgba(112,161,255,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
            position: 'relative',
          }}
        >
          {/* Board label */}
          <div
            style={{
              position: 'absolute',
              top: -22,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              color: 'rgba(112,161,255,0.4)',
              fontSize: 10,
              letterSpacing: 3,
            }}
          >
            LIVE GAME
          </div>

          {BOARD.map((row, r) => (
            <div key={r} style={{ display: 'flex', gap: 6 }}>
              {row.map((cell, c) => {
                const isWin = WINNING.has(`${r}-${c}`);
                return (
                  <div
                    key={c}
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: '50%',
                      background:
                        cell === 1
                          ? 'radial-gradient(circle at 35% 30%, #ff8fa3, #ff4757)'
                          : cell === 2
                          ? 'radial-gradient(circle at 35% 30%, #fff0a0, #eccc68)'
                          : '#070714',
                      border:
                        cell === 0
                          ? '1.5px solid rgba(112,161,255,0.12)'
                          : isWin
                          ? '2.5px solid rgba(255,255,255,0.6)'
                          : 'none',
                      boxShadow:
                        cell === 1 && isWin
                          ? '0 0 22px rgba(255,71,87,0.9), 0 0 8px rgba(255,71,87,0.6), inset 0 2px 5px rgba(255,255,255,0.25)'
                          : cell === 1
                          ? '0 0 10px rgba(255,71,87,0.45), inset 0 2px 4px rgba(255,255,255,0.2)'
                          : cell === 2
                          ? '0 0 10px rgba(236,204,104,0.45), inset 0 2px 4px rgba(255,255,255,0.2)'
                          : 'none',
                    }}
                  />
                );
              })}
            </div>
          ))}

          {/* Win label under board */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 6,
              color: '#ff4757',
              fontSize: 11,
              letterSpacing: 3,
              textShadow: '0 0 12px rgba(255,71,87,0.7)',
            }}
          >
            ★ RED WINS ★
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Silkscreen', data: fontData, style: 'normal', weight: 400 }],
    }
  );
}
