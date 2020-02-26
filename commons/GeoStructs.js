/** 地理坐标结构 */
class Geo {
  /**
   * 地理坐标结构
   * @param {number} latitude 维度
   * @param {number} longitude 经度
   * @param {number} altitude 海拔
   * @param {number} elevation 海拔
   * @param {number} lat 维度
   * @param {number} lon 经度
   * @param {number} elv 海拔
   */
  constructor(latitude, longitude, altitude, elevation, lat, lon, elv) {
    /** 维度 */
    this.latitude = latitude
    /** 经度 */
    this.longitude = longitude
    /** 海拔 */
    this.altitude = altitude
    /** 海拔 */
    this.elevation = elevation
    /** 维度 */
    this.lat = lat
    /** 经度 */
    this.lon = lon
    /** 海拔 */
    this.elv = elv
  }
}

/** 空间直角坐标结构 */
class Point {
  /**
   * 空间直角坐标结构
   * @param {number} x x
   * @param {number} y y
   * @param {number} z z
   */
  constructor(x, y, z) {
    /** x */
    this.x = x
    /** y */
    this.y = y
    /** z */
    this.z = z
  }
}

module.exports = {
  /** 地理坐标结构 */
  Geo: Geo,
  /** 空间直角坐标结构 */
  Point: Point
}
