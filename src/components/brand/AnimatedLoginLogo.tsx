import { useEffect, useState } from 'react';

const SUN_CENTER_X = 1066.5;
const SUN_CENTER_Y = 1887.7;

const SUN_CORE_PATH =
  'M1202.57 1479.48C1420.08 1556.18 1535.49 1801.15 1460.36 2026.62C1385.22 2252.1 1147.99 2372.7 930.481 2295.99C712.973 2219.28 597.557 1974.32 672.692 1748.84C747.827 1523.37 985.063 1402.77 1202.57 1479.48Z';

const SUN_RAYS_PATH =
  'M922.126 2317.62C954.961 2329.2 972.403 2366.12 961.084 2400.09L909.849 2553.84C898.53 2587.81 862.737 2605.96 829.902 2594.38C797.067 2582.8 779.625 2545.88 790.943 2511.91L842.179 2358.16C853.498 2324.19 889.291 2306.04 922.126 2317.62Z M590.148 2056.82C621.304 2040.98 658.849 2054.22 674.007 2086.39C689.164 2118.56 676.195 2157.48 645.039 2173.32L504.005 2245.02C472.849 2260.85 435.304 2247.61 420.146 2215.44C404.989 2183.27 417.958 2144.35 449.114 2128.51L590.148 2056.82Z M1256.19 2291.7C1287.34 2275.86 1324.89 2289.1 1340.04 2321.27L1408.66 2466.9C1423.82 2499.07 1410.85 2537.99 1379.69 2553.83C1348.53 2569.67 1310.99 2556.43 1295.83 2524.26L1227.22 2378.63C1212.06 2346.46 1225.03 2307.54 1256.19 2291.7Z M611.658 1658.45C644.424 1670 661.792 1706.96 650.45 1741C639.107 1775.04 603.35 1793.26 570.584 1781.71L422.263 1729.4C389.496 1717.85 372.129 1680.89 383.471 1646.85C394.814 1612.81 430.571 1594.59 463.337 1606.14L611.658 1658.45Z M1708.74 2045.34C1741.5 2056.9 1758.87 2093.86 1747.53 2127.89C1736.19 2161.93 1700.43 2180.16 1667.66 2168.6L1519.34 2116.3C1486.58 2104.74 1469.21 2067.78 1480.55 2033.74C1491.89 1999.71 1527.65 1981.48 1560.42 1993.04L1708.74 2045.34Z M1627.29 1529.57C1658.45 1513.74 1696 1526.98 1711.15 1559.15C1726.31 1591.32 1713.34 1630.24 1682.19 1646.08L1541.15 1717.77C1510 1733.61 1472.45 1720.37 1457.29 1688.2C1442.14 1656.03 1455.11 1617.11 1486.26 1601.27L1627.29 1529.57Z M751.608 1220.76C782.764 1204.92 820.309 1218.16 835.467 1250.33L904.081 1395.96C919.238 1428.13 906.269 1467.05 875.113 1482.89C843.956 1498.73 806.411 1485.49 791.254 1453.32L722.64 1307.69C707.483 1275.51 720.452 1236.59 751.608 1220.76Z M1301.1 1180.36C1333.93 1191.94 1351.38 1228.87 1340.06 1262.83L1288.82 1416.59C1277.5 1450.55 1241.71 1468.7 1208.87 1457.12C1176.04 1445.54 1158.6 1408.62 1169.92 1374.65L1221.15 1220.9C1232.47 1186.93 1268.26 1168.79 1301.1 1180.36Z';

async function loadBaseLogo() {
  const response = await fetch('/brand/sa-logo-base.svg.gz.b64');
  if (!response.ok) throw new Error('Não foi possível carregar o logo da página de login.');

  const base64 = (await response.text()).replace(/\s+/g, '');
  const compressedBytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const decompressionStream = new DecompressionStream('gzip');
  const decompressedStream = new Blob([compressedBytes]).stream().pipeThrough(decompressionStream);
  const svgText = await new Response(decompressedStream).text();

  return URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
}

type AnimatedLoginLogoProps = {
  className?: string;
};

export function AnimatedLoginLogo({ className = '' }: AnimatedLoginLogoProps) {
  const [baseLogoUrl, setBaseLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    void loadBaseLogo()
      .then((url) => {
        objectUrl = url;
        if (active) setBaseLogoUrl(url);
      })
      .catch((error) => {
        console.error('Erro ao carregar logo animado:', error);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <div
      className={`relative aspect-[8122/2963] w-full overflow-visible ${className}`}
      role="img"
      aria-label="Propostas solares by SolAmigo"
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full overflow-visible"
        viewBox="0 0 8122 2963"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="loginSunGlow" x="-75%" y="-75%" width="250%" height="250%">
            <feGaussianBlur stdDeviation="34" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0.984  0 0.78 0 0 0.796  0 0 0.35 0 0.361  0 0 0 0.78 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <style>{`
            .login-sun-rays-orbit {
              transform-box: view-box;
              transform-origin: ${SUN_CENTER_X}px ${SUN_CENTER_Y}px;
              animation: login-rays-orbit 13s linear infinite;
            }
            .login-sun-rays-pulse {
              transform-box: view-box;
              transform-origin: ${SUN_CENTER_X}px ${SUN_CENTER_Y}px;
              animation: login-rays-pulse 2.8s ease-in-out infinite;
            }
            .login-sun-aura {
              transform-box: view-box;
              transform-origin: ${SUN_CENTER_X}px ${SUN_CENTER_Y}px;
              animation: login-sun-aura 2.4s ease-in-out infinite;
              filter: url(#loginSunGlow);
            }
            .login-sun-core {
              transform-box: view-box;
              transform-origin: ${SUN_CENTER_X}px ${SUN_CENTER_Y}px;
              animation: login-sun-core 2.4s ease-in-out infinite;
            }
            @keyframes login-rays-orbit {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes login-rays-pulse {
              0%, 100% { transform: scale(.985); }
              50% { transform: scale(1.045); }
            }
            @keyframes login-sun-aura {
              0%, 100% { opacity: .25; transform: scale(.99); }
              50% { opacity: .7; transform: scale(1.085); }
            }
            @keyframes login-sun-core {
              0%, 100% { filter: brightness(1) drop-shadow(0 0 0 rgba(250, 203, 92, 0)); }
              50% { filter: brightness(1.13) drop-shadow(0 0 26px rgba(250, 203, 92, .82)); }
            }
            @media (prefers-reduced-motion: reduce) {
              .login-sun-rays-orbit,
              .login-sun-rays-pulse,
              .login-sun-aura,
              .login-sun-core { animation: none; }
            }
          `}</style>
        </defs>

        <path className="login-sun-aura" d={SUN_CORE_PATH} fill="#FACB5C" opacity="0.25" />
        <g className="login-sun-rays-orbit">
          <g className="login-sun-rays-pulse">
            <path d={SUN_RAYS_PATH} fill="#FACB5C" />
          </g>
        </g>
        <path className="login-sun-core" d={SUN_CORE_PATH} fill="#FACB5C" />
      </svg>

      {baseLogoUrl && (
        <img
          src={baseLogoUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-10 h-full w-full object-contain"
          draggable={false}
        />
      )}
    </div>
  );
}
