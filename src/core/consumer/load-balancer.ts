export function randomLoadBalance() {
  return function(list) {
    return list[Math.floor(Math.random() * list.length)];
  };
}

export function roundRoubinLoadBalance() {
  const lastItemMap = new Map();

  return function(list, mode) {
    let last = lastItemMap.get(mode);
    let current;

    if (!last) {
      current = list[0];
    } else {
      let index = list.indexOf(last);

      if (index < list.length) {
        index++;
      } else {
        index = 0;
      }

      current = list[current];
    }

    lastItemMap.set(mode, current);

    return current;
  };
}