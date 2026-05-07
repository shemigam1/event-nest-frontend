export default function QrPattern({ size = 200, seed = 'EVENTNEST' }) {
  const cells = 25;
  const px = size / cells;

  const hash = (s, salt) => {
    let h = 0;
    const str = s + salt;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  const isCorner = (x, y) =>
    (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);

  const finder = (x, y, ox, oy) => {
    const lx = x - ox, ly = y - oy;
    if (lx >= 0 && lx < 7 && ly >= 0 && ly < 7) {
      const onBorder = lx === 0 || lx === 6 || ly === 0 || ly === 6;
      const inMid = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
      return onBorder || inMid;
    }
    return false;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" />
      {Array.from({ length: cells }).map((_, y) =>
        Array.from({ length: cells }).map((_, x) => {
          let on = false;
          if (
            finder(x, y, 0, 0) ||
            finder(x, y, cells - 7, 0) ||
            finder(x, y, 0, cells - 7)
          ) {
            on = true;
          } else if (!isCorner(x, y)) {
            on = (hash(seed, `${x},${y}`) % 100) > 55;
          }
          return on
            ? <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill="#02102D" />
            : null;
        })
      )}
    </svg>
  );
}
