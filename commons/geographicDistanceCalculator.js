// 参考: http://cosinekitty.com/compass.html

/** 地球半径(m) */
const earth_radius = { // radius in meters https://en.wikipedia.org/wiki/Earth_radius
  equator: 6378137.0, // 赤道半径, equatorial radius
  polar: 6356752.3, // 极地半径, polar radius
  // 平均半径, Global average radii
  mean: 6371008.8, // 均值半径, Mean radius
  // authalic: 6371007.2, // 等积投影半径, Authalic radius
  // volumetric: 6371000.8, // 测定体积半径, Volumetric radius
  // rectifying: 6367445, // 曲线矫正半径, Rectifying radius
  // average: 6371230 // 地心地表平均距离, Average distance from center to surface
}
// const earth_radius = { // https://baike.baidu.com/item/地球半径
//   equator: 6377830, // 赤道半径
//   polar: 6356908.8, // 极地半径
//   mean: 6370856 // 均值半径
// }

/**
 * 根据地理纬度获取地球半径
 * @param {number} lat 地理纬度 latitude is geodetic, i.e. that reported by GPS
 */
const earthRadiusInMeters = lat => {
  let a = earth_radius.equator
  let b = earth_radius.polar
  let cos = Math.cos(lat)
  let sin = Math.sin(lat)
  let t1 = a * a * cos
  let t2 = b * b * sin
  let t3 = a * cos
  let t4 = b * sin
  return Math.sqrt((t1 * t1 + t2 * t2) / (t3 * t3 + t4 * t4))
}

/**
 * 地理纬度转地心纬度, Convert geodetic latitude 'lat' to a geocentric latitude 'clat'.
 * https://en.wikipedia.org/wiki/Latitude#Geocentric_latitude
 * @param {number} lat 地理纬度, Geodetic latitude is the latitude as given by GPS
 */
const geocentricLatitude = lat => {
  const e2 = 0.00669437999014
  const clat = Math.atan((1.0 - e2) * Math.tan(lat))
  return clat // 地心纬度, Geocentric latitude is the angle measured from center of Earth between a point and the equator.
}

const {Geo, Point} = require("./commons/GeoStructs")

/**
 * 将地理坐标(lat,lon,elv)标转直角坐标(x,y,z), Convert (lat, lon, elv) to (x, y, z).
 * lat: Latitude (°N) 纬度,    lon: Longitude (°E) 经度,    elv: Elevation 海拔
 * @param {Geo} g 地理坐标点,{lat:纬度,lon:经度,elv:海拔高度}
 * @param {boolean} oblate 是扁圆或球形,{true:扁圆,false:球形}
 */
const location2point = (g, oblate) => {
  const lat = g.lat * Math.PI / 180.0
  const lon = g.lon * Math.PI / 180.0
  const radius = oblate ? earthRadiusInMeters(lat) : earth_radius.mean
  const clat = oblate ? geocentricLatitude(lat) : lat

  const cosLon = Math.cos(lon)
  const sinLon = Math.sin(lon)
  const cosLat = Math.cos(clat)
  const sinLat = Math.sin(clat)
  let x = radius * cosLon * cosLat
  let y = radius * sinLon * cosLat
  let z = radius * sinLat

  // We used geocentric latitude to calculate (x,y,z) on the Earth's ellipsoid.
  // Now we use geodetic latitude to calculate normal vector from the surface, to correct for elevation.
  const cosGlat = Math.cos(lat)
  const sinGlat = Math.sin(lat)

  const nx = cosGlat * cosLon
  const ny = cosGlat * sinLon
  const nz = sinGlat

  x += g.elv * nx
  y += g.elv * ny
  z += g.elv * nz

  return {'x': x, 'y': y, 'z': z, 'radius': radius, 'nx': nx, 'ny': ny, 'nz': nz}
}

/**
 * 直角坐标系的两个点之间的直线距离
 * @param {Point} p0
 * @param {Point} p1
 */
const distance = (p0, p1) => {
  const dx = p0.x - p1.x
  const dy = p0.y - p1.y
  const dz = p0.z - p1.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * 地理坐标格式化, (latitude,longitude,altitude|elevation)->(...,lat,lon,elv)
 * @param {Geo|number[]} g 地理坐标点
 */
const fix_location = g => {
  if (g instanceof Array) {
    return {lat: g[0], lon: g[1], elv: (typeof g[2] == "undefined") ? 0 : g[2]}
  }
  if (typeof g == "object") {
    if (typeof g.lat == "undefined" && typeof g.latitude == "number") g.lat = g.latitude
    if (typeof g.lon == "undefined" && typeof g.longitude == "number") g.lon = g.longitude
    if (typeof g.elv == "undefined") g.elv = (typeof g.altitude == "number") ? g.altitude : ((typeof g.elevation == "number") ? g.elevation : 0)
  }
  return g
}

/**
 * 将地理坐标(latitude,longitude,altitude|elevation)标转直角坐标(x,y,z)
 * @param {Point} g 地理坐标点,{longitude:经度,latitude:纬度,altitude|elevation:海拔高度}
 */
const geo2point = g => location2point(fix_location(g), oblate)

/**
 * 计算地理坐标点到指定的直角坐标点的间距
 * @param {Geo} g 起点地理坐标点, Object{longitude:经度,latitude:纬度,altitude|elevation:海拔高度}|Array[Object{...}]
 * @param {Point} p 终点直角坐标点, Object{x:?,y:?,z:?}
 */
const geoDistTo = (g, p) => {
  if (g instanceof Array) { // 计算多个间距
    let a = []
    for (const g0 of g) {
      a.push(distance(location2point(fix_location(g0), oblate), p))
    }
    return a
  } else { // 计算单个间距
    return distance(location2point(fix_location(g), oblate), p)
  }
  // return (g instanceof Array) ? g.map(g0 => distance(location2point(fix_location(g0), oblate), p)) // 计算多个间距
  //   : distance(location2point(fix_location(g), oblate), p) // 计算单个间距
}

/** 设定地球模型,是扁圆或球形,{true:扁圆,false:球形} */
const oblate = true

module.exports = {

  /**
   * 将地理坐标(latitude,longitude,altitude|elevation)标转直角坐标(x,y,z)
   * @param {Geo} g 地理坐标点,{longitude:经度,latitude:纬度,altitude|elevation:海拔高度}
   */
  geo2point: geo2point,

  /**
   * 计算地理坐标点到指定的直角坐标点的间距
   * @param {Geo} g 起点地理坐标点, Object{longitude:经度,latitude:纬度,altitude|elevation:海拔高度}|Array[Object{...}]
   * @param {Point} p 终点直角坐标点, Object{x:?,y:?,z:?}
   */
  geoDistTo: geoDistTo,

  /**
   * 计算地理坐标点的间距间距
   * @param {Geo} g0 起点地理坐标点, Object{longitude:经度,latitude:纬度,altitude|elevation:海拔高度}
   * @param {Geo} g1 终点地理坐标点, Object-单个|Array-多个
   */
  geoDistCalc: (g0, g1) => geoDistTo(g1, location2point(fix_location(g0), oblate))

}
