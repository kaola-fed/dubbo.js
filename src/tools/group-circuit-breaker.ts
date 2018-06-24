export function groupCircuitBreaker(list) {
  return list.reduce((meta, item) => {
    if (item.isHalfOpened()) {
      meta.halfOpened.push(item);
    } else if (item.isClosed()) {
      meta.closed.push(item);
    } else {
      meta.opened.push(item);
    }
    return meta;
  }, {
    halfOpened: [],
    closed: [],
    opened: []
  });
}