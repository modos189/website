// ==UserScript==
// @author         ZasoGD
// @name           IITC plugin: Portal Names
// @category       Layer
// @version        0.2.1.20230321.151345
// @description    Show portal names on the map.
// @id             portal-names
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/portal-names.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/portal-names.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/portal-names.png
// @icon64         https://iitc.app/extras/plugin-icons/portal-names-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2023-03-21-151345';
plugin_info.pluginId = 'portal-names';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
window.plugin.portalNames = function() {};

window.plugin.portalNames.NAME_WIDTH = 80;
window.plugin.portalNames.NAME_HEIGHT = 23;

window.plugin.portalNames.labelLayers = {};
window.plugin.portalNames.labelLayerGroup = null;

window.plugin.portalNames.setupCSS = function() {
  $("<style>").prop("type", "text/css").html(''
  +'.plugin-portal-names{'
    +'color:#FFFFBB;'
    +'font-size:11px;line-height:12px;'
    +'text-align:center;padding: 2px;'  // padding needed so shadow doesn't clip
    +'overflow:hidden;'
// could try this if one-line names are used
//    +'white-space: nowrap;text-overflow:ellipsis;'

    // webkit-only multiline ellipsis
    +'display: -webkit-box;'
    +'-webkit-line-clamp: 2;'
    +'-webkit-box-orient: vertical;'

    +'text-shadow: 0 0 1px black, 0 0 1em black, 0 0 0.2em black;'
    +'pointer-events:none;'
  +'}'
  ).appendTo("head");
}


window.plugin.portalNames.removeLabel = function(guid) {
  var previousLayer = window.plugin.portalNames.labelLayers[guid];
  if(previousLayer) {
    window.plugin.portalNames.labelLayerGroup.removeLayer(previousLayer);
    delete plugin.portalNames.labelLayers[guid];
  }
}

window.plugin.portalNames.addLabel = function(guid, latLng) {
  var previousLayer = window.plugin.portalNames.labelLayers[guid];
  if (!previousLayer) {

    var d = window.portals[guid].options.data;
    var portalName = d.title;

    var label = L.marker(latLng, {
      icon: L.divIcon({
        className: 'plugin-portal-names',
        iconAnchor: [window.plugin.portalNames.NAME_WIDTH/2,0],
        iconSize: [window.plugin.portalNames.NAME_WIDTH,window.plugin.portalNames.NAME_HEIGHT],
        html: portalName
      }),
      guid: guid,
      interactive: false
    });
    window.plugin.portalNames.labelLayers[guid] = label;
    label.addTo(window.plugin.portalNames.labelLayerGroup);
  }
}

window.plugin.portalNames.clearAllPortalLabels = function() {
  for (var guid in window.plugin.portalNames.labelLayers) {
    window.plugin.portalNames.removeLabel(guid);
  }
}


window.plugin.portalNames.updatePortalLabels = function() {
  // as this is called every time layers are toggled, there's no point in doing it when the leyer is off
  if (!map.hasLayer(window.plugin.portalNames.labelLayerGroup)) {
    return;
  }

  var portalPoints = {};

  for (var guid in window.portals) {
    var p = window.portals[guid];
    if (p._map && p.options.data.title) {  // only consider portals added to the map and with a title
      var point = map.project(p.getLatLng());
      portalPoints[guid] = point;
    }
  }

  // for efficient testing of intersection, group portals into buckets based on the label size
  var buckets = {};
  for (var guid in portalPoints) {
    var point = portalPoints[guid];

    var bucketId = L.point([Math.floor(point.x/(window.plugin.portalNames.NAME_WIDTH*2)),Math.floor(point.y/window.plugin.portalNames.NAME_HEIGHT)]);
    // the guid is added to four buckets. this way, when testing for overlap we don't need to test
    // all 8 buckets surrounding the one around the particular portal, only the bucket it is in itself
    var bucketIds = [bucketId, bucketId.add([1,0]), bucketId.add([0,1]), bucketId.add([1,1])];
    for (var i in bucketIds) {
      var b = bucketIds[i].toString();
      if (!buckets[b]) buckets[b] = {};
      buckets[b][guid] = true;
    }
  }  

  var coveredPortals = {};

  for (var bucket in buckets) {
    var bucketGuids = buckets[bucket];
    for (var guid in bucketGuids) {
      var point = portalPoints[guid];
      // the bounds used for testing are twice as wide as the portal name marker. this is so that there's no left/right
      // overlap between two different portals text
      var largeBounds = L.bounds (
                point.subtract([window.plugin.portalNames.NAME_WIDTH,0]),
                point.add([window.plugin.portalNames.NAME_WIDTH,window.plugin.portalNames.NAME_HEIGHT])
      );
  
      for (var otherGuid in bucketGuids) {
        if (guid != otherGuid) {
          var otherPoint = portalPoints[otherGuid];
  
          if (largeBounds.contains(otherPoint)) {
            // another portal is within the rectangle for this one's name - so no name for this one
            coveredPortals[guid] = true;
            break;
          }
        }
      }
    }
  }

  for (var guid in coveredPortals) {
    delete portalPoints[guid];
  }

  // remove any not wanted
  for (var guid in window.plugin.portalNames.labelLayers) {
    if (!(guid in portalPoints)) {
      window.plugin.portalNames.removeLabel(guid);
    }
  }

  // and add those we do
  for (var guid in portalPoints) {
    window.plugin.portalNames.addLabel(guid, portals[guid].getLatLng());
  }
}

// ass calculating portal marker visibility can take some time when there's lots of portals shown, we'll do it on
// a short timer. this way it doesn't get repeated so much
window.plugin.portalNames.delayedUpdatePortalLabels = function(wait) {

  if (window.plugin.portalNames.timer === undefined) {
    window.plugin.portalNames.timer = setTimeout ( function() {
      window.plugin.portalNames.timer = undefined;
      window.plugin.portalNames.updatePortalLabels();
    }, wait*1000);

  }
}


var setup = function() {
  window.plugin.portalNames.setupCSS();

  window.plugin.portalNames.labelLayerGroup = new L.LayerGroup();
  window.layerChooser.addOverlay(window.plugin.portalNames.labelLayerGroup, 'Portal Names');

  window.addHook('requestFinished', function() { setTimeout(function(){window.plugin.portalNames.delayedUpdatePortalLabels(3.0);},1); });
  window.addHook('mapDataRefreshEnd', function() { window.plugin.portalNames.delayedUpdatePortalLabels(0.5); });
  window.map.on('overlayadd overlayremove', function() { setTimeout(function(){window.plugin.portalNames.delayedUpdatePortalLabels(1.0);},1); });
  window.map.on('zoomend', window.plugin.portalNames.clearAllPortalLabels );

}

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

