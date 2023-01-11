// ==UserScript==
// @author         modos189
// @name           IITC plugin: Fix maps offsets in China
// @category       Tweaks
// @version        0.3.1.20230111.122637
// @description    Show correct maps for China user by applying offset tweaks.
// @id             fix-china-map-offset
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR616/plugins/fix-china-map-offset.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR616/plugins/fix-china-map-offset.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2023-01-11-122637';
plugin_info.pluginId = 'fix-china-map-offset';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
var fixChinaMapOffset = {};
window.plugin.fixChinaMapOffset = fixChinaMapOffset;

// This plugin is intended to fix offset problem of Google maps in China.
//
// When the plugin is active then the same correction method is applying
// to any map that has custom TileLayer option `needFixChinaOffset: true`.
//
// Example: basemap-gaode.user.js


// Before understanding how this plugin works, you should know 3 points:
//
//   Point1.
//     The coordinate system of Ingress is WGS-84.
//     However, the tiles of Google maps (except satellite map) and some other maps
//     in China have offsets (base on GCJ-02 coordinate system) by China policy.
//     That means, if you request map tiles by giving GCJ-02 position, you
//     will get the correct map.
//
//   Point2.
//     Currently there are no easy algorithm to transform from GCJ-02 to WGS-84,
//     but we can easily transform data from WGS-84 to GCJ-02.
//
//   Point3.
//     When using, for example, Google maps in IITC, the layer structure looks like this:
//      --------------------------
//     |    Other Leaflet layers  |  (Including portals, links, fields, and so on)
//      --------------------------
//     | L.GridLayer.GoogleMutant |  (Only for controling)
//      --------------------------
//     |      Google Map layer    |  (Generated by Google Map APIs, for rendering maps)
//      --------------------------
//
//     When users are interacting with L.GridLayer.GoogleMutant (for example, dragging, zooming),
//     L.GridLayer.GoogleMutant will perform the same action on the Google Map layer using Google
//     Map APIs.
//
// So, here is the internal of the plugin:
//
// The plugin overwrites behaviours of L.GridLayer.GoogleMutant. When users are dragging the map,
// L.GridLayer.GoogleMutant will pass offseted positions to Google Map APIs (WGS-84 to GCJ-02).
// So Google Map APIs will render a correct map.
//
// The offset between Google maps and Ingress objects can also be fixed by applying
// WGS-84 to GCJ-02 transformation on Ingress objects. However we cannot simply know
// the requesting bounds of Ingress objects because we cannot transform GCJ-02 to
// WGS-84. As a result, the Ingress objects on maps would be incomplete.
//
// The algorithm of transforming WGS-84 to GCJ-02 comes from:
// https://on4wp7.codeplex.com/SourceControl/changeset/view/21483#353936
// There is no official algorithm because it is classified information.
//
// Here we use the PRCoords implementation of this algorithm, which contains
// a more careful yet still rough "China area" check in "insane_is_in_china.js".
// Comments and code style have been adapted, mainly to remove profanity.
// https://github.com/Artoria2e5/PRCoords
// (more info: https://github.com/iitc-project/ingress-intel-total-conversion/pull/1188)

var insane_is_in_china = (function () { // adapted from https://github.com/Artoria2e5/PRCoords/blob/master/js/misc/insane_is_in_china.js
/* eslint-disable */
  'use strict';

  // This set of points roughly illustrates the scope of Google's
  // distortion. It has nothing to do with national borders etc.
  // Points around Hong Kong/Shenzhen are mapped with a little more precision,
  // in hope that it will make agents work a bit more smoothly there.
  //
  // Edits around these points are welcome.

  // lon, lat
  var POINTS = [
    // start hkmo
    114.433722, 22.064310,
    114.009458, 22.182105,
    113.599275, 22.121763,
    113.583463, 22.176002,
    113.530900, 22.175318,
    113.529542, 22.210608,
    113.613377, 22.227435,
    113.938514, 22.483714,
    114.043449, 22.500274,
    114.138506, 22.550640,
    114.222984, 22.550960,
    114.366803, 22.524255,
    // end hkmo
    115.254019, 20.235733,
    121.456316, 26.504442,
    123.417261, 30.355685,
    124.289197, 39.761103,
    126.880509, 41.774504,
    127.887261, 41.370015,
    128.214602, 41.965359,
    129.698745, 42.452788,
    130.766139, 42.668534,
    131.282487, 45.037051,
    133.142361, 44.842986,
    134.882453, 48.370596,
    132.235531, 47.785403,
    130.980075, 47.804860,
    130.659026, 48.968383,
    127.860252, 50.043973,
    125.284310, 53.667091,
    120.619316, 53.100485,
    119.403751, 50.105903,
    117.070862, 49.690388,
    115.586019, 47.995542,
    118.599613, 47.927785,
    118.260771, 46.707335,
    113.534759, 44.735134,
    112.093739, 45.001999,
    111.431259, 43.489381,
    105.206324, 41.809510,
    96.485703, 42.778692,
    94.167961, 44.991668,
    91.130430, 45.192938,
    90.694601, 47.754437,
    87.356293, 49.232005,
    85.375791, 48.263928,
    85.876055, 47.109272,
    82.935423, 47.285727,
    81.929808, 45.506317,
    79.919457, 45.108122,
    79.841455, 42.178752,
    73.334917, 40.076332,
    73.241805, 39.062331,
    79.031902, 34.206413,
    78.738395, 31.578004,
    80.715812, 30.453822,
    81.821692, 30.585965,
    85.501663, 28.208463,
    92.096061, 27.754241,
    94.699781, 29.357171,
    96.079442, 29.429559,
    98.910308, 27.140660,
    97.404057, 24.494701,
    99.400021, 23.168966,
    100.697449, 21.475914,
    102.976870, 22.616482,
    105.476997, 23.244292,
    108.565621, 20.907735,
    107.730505, 18.193406,
    110.669856, 17.754550,
  ];

  var lats = POINTS.filter(function (_, idx) { return idx % 2 === 1; });
  var lons = POINTS.filter(function (_, idx) { return idx % 2 === 0; });
  var XYs = lats.map(function (_, i) { return { x: lats[i], y: lons[i]}; });

  function isInChina (lat, lon) {
    // Yank out South China Sea as it's not distorted.
    if (lat >= 17.754 && lat <= 55.8271 &&
        lon >= 72.004 && lon <= 137.8347) {
      return window.pnpoly(XYs, {x: lat, y: lon});
    }
  }

  return { isInChina: isInChina };
/* eslint-enable */
})();

fixChinaMapOffset.isInChina = insane_is_in_china.isInChina;

var PRCoords = (function () { // adapted from https://github.com/Artoria2e5/PRCoords/blob/master/js/PRCoords.js
/* eslint-disable */
  'use strict';

  /// Krasovsky 1940 ellipsoid
  /// @const
  var GCJ_A = 6378245;
  var GCJ_EE = 0.00669342162296594323; // f = 1/298.3; e^2 = 2*f - f**2

  function wgs_gcj (wgs) {

    var x = wgs.lng - 105, // mod: lon->lng
        y = wgs.lat - 35;

    // These distortion functions accept (x = lon - 105, y = lat - 35).
    // They return distortions in terms of arc lengths, in meters.
    var dLat_m = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y +
      0.2 * Math.sqrt(Math.abs(x)) + (
        2 * Math.sin(x * 6 * Math.PI) + 2 * Math.sin(x * 2 * Math.PI) +
        2 * Math.sin(y * Math.PI) + 4 * Math.sin(y / 3 * Math.PI) +
        16 * Math.sin(y / 12 * Math.PI) + 32 * Math.sin(y / 30 * Math.PI)
      ) * 20 / 3;
    var dLon_m = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y +
      0.1 * Math.sqrt(Math.abs(x)) + (
        2 * Math.sin(x * 6 * Math.PI) + 2 * Math.sin(x * 2 * Math.PI) +
        2 * Math.sin(x * Math.PI) + 4 * Math.sin(x / 3 * Math.PI) +
        15 * Math.sin(x / 12 * Math.PI) + 30 * Math.sin(x / 30 * Math.PI)
      ) * 20 / 3;

    var radLat = wgs.lat / 180 * Math.PI;
    var magic = 1 - GCJ_EE * Math.pow(Math.sin(radLat), 2); // just a common expr

    // Arc lengths per degree, on the wrong ellipsoid
    var lat_deg_arclen = Math.PI / 180 * (GCJ_A * (1 - GCJ_EE)) / Math.pow(magic, 1.5);
    var lon_deg_arclen = Math.PI / 180 * (GCJ_A * Math.cos(radLat) / Math.sqrt(magic));

    return {
      lat: wgs.lat + dLat_m / lat_deg_arclen,
      lng: wgs.lng + dLon_m / lon_deg_arclen, // mod: lon->lng
    };
  }

  return { wgs_gcj: wgs_gcj };
/* eslint-enable */
})();

fixChinaMapOffset.wgs_gcj = PRCoords.wgs_gcj;

// redefine L.TileLayer methods
var fixChinaOffset = {
  _inChina: false,

  _inChinaLastChecked: [0,0],

  _inChinaValidRadius: 100000,

  _isInChina: function (latlng) {
    if (latlng._notChina) { return false; } // do not check twice same latlng

    if (latlng.distanceTo(this._inChinaLastChecked) > this._inChinaValidRadius) {
      // recheck only when beyond of specified radius, otherwise keep last known value
      this._inChina = fixChinaMapOffset.isInChina(latlng.lat, latlng.lng);
      this._inChinaLastChecked = latlng;
    }
    latlng._notChina = !this._inChina;
    return this._inChina;
  },

  _fixChinaOffset: function (latlng) {
    if (!this.options.needFixChinaOffset) { return latlng; }
    if (!latlng._gcj) { // do not calculate twice same latlng
      latlng._gcj = this._isInChina(latlng) &&
        fixChinaMapOffset.wgs_gcj(latlng);
    }
    return latlng._gcj || latlng;
  },

  _getTiledPixelBounds: function (center) {
    center = this._fixChinaOffset(center);
    return L.GridLayer.prototype._getTiledPixelBounds.call(this, center);
  },

  _setZoomTransform: function (level, center, zoom) {
    center = this._fixChinaOffset(center);
    return L.GridLayer.prototype._setZoomTransform.call(this, level, center, zoom);
  }
};

// redefine L.GridLayer.GoogleMutant methods
function fixGoogleMutant (_update, style) {
  return function (wgs) {
    wgs = wgs || this._map.getCenter();
    _update.call(this, wgs);
    var o = this.options;
    if (this._mutant && o.type !== 'satellite') {
      if (this._isInChina(wgs)) {
        wgs._gcj = wgs._gcj || fixChinaMapOffset.wgs_gcj(wgs);
        if (o.type === 'hybrid') {
          var zoom = this._map.getZoom();
          var offset = this._map.project(wgs, zoom)
            .subtract(this._map.project(wgs._gcj, zoom));
          style.transform = L.Util.template('translate3d({x}px, {y}px, 0px)', offset);
        } else {
          this._mutant.setCenter(wgs._gcj);
        }
      }
    }
  };
}

function setup () {
  // add support of `needFixChinaOffset` property to any TileLayer
  L.TileLayer.include(fixChinaOffset);

  // GoogleMutant needs additional support
  var styleEl = document.createElement('style');
  var css = document.body.appendChild(styleEl).sheet;
  var cssrule = css.cssRules[css.insertRule('.google-mutant .leaflet-tile img:nth-child(2) {}')];

  L.GridLayer.GoogleMutant
    .mergeOptions({className: 'google-mutant'})
    .include(fixChinaOffset)
    .include({
      _update: fixGoogleMutant(L.GridLayer.GoogleMutant.prototype._update, cssrule.style)
    })
    .addInitHook(function () {
      var o = this.options;
      o.needFixChinaOffset = o.type !== 'satellite' && o.type !== 'hybrid';
    });
}
setup.priority = 'boot';

setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

