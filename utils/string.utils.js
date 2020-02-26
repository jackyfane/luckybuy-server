module.exports = {
  titleUpperCase: function (str) {
    return str.toLowerCase().replace(/( |^)[a-z]/g, (L) => L.toUpperCase());
  },

  /**
   * 对象是否为空
   * @param {any} object
   */
  isEmpty: function (object) {
    return object === undefined || object === '' || JSON.stringify(object) === '{}' || JSON.stringify(object) === '[]';
  },

  /**
   *
   * @param {*} str
   */
  hashCode: function hashcode(str) {
    let hash = 0,
        i, chr, len;
    if (str.length === 0) return hash;
    for (i = 0, len = str.length; i < len; i++) {
      chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
}