export function randomLoadBalance() {
  return function(list) {
    return list[Math.floor(Math.random() * list.length)];
  };
}

export function roundRoubinLoadBalance(l) {
  const lastItemMap = new Map();
  const list = l;

  return function(mode = 'defualt') {
    if (!list) return '';

    let last = lastItemMap.get(mode);

    if (!last && last != 0) {
      last = 0;
    } else {
      if (last < list.length - 1) {
        last++;
      } else {
        last = 0;
      }
    }

    lastItemMap.set(mode, last);

    return list[last];
  };
}