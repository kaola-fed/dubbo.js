export function delegate(wrapper, key, methods) {
  methods.forEach(method => {
    wrapper.prototype[method] = function (...args) {
      // this._socket
      const origin = this[key];
      const result = origin[method](...args);

      return result === origin
      // If the original method returns this, then returns this of the wrapper
        ? this
      // else returns
        : result;
    };
  });
}
