// ==UserScript==
// @author         vita10gy
// @name           IITC plugin: Highlight portals that need recharging
// @category       Highlighter
// @version        0.2.0.20221116.123402
// @description    Use the portal fill color to denote if the portal needs recharging and how much. Yellow: above 85%. Orange: above 70%. Red: above 15%. Magenta: below 15%.
// @id             highlight-needs-recharge
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR577/plugins/highlight-needs-recharge.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR577/plugins/highlight-needs-recharge.user.js
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
plugin_info.dateTimeVersion = '2022-11-16-123402';
plugin_info.pluginId = 'highlight-needs-recharge';
//END PLUGIN AUTHORS NOTE

/* exported setup --eslint */
/* global L, TEAM_NONE*/
// use own namespace for plugin
var highlightNeedsRecharge = {};
window.plugin.highlightNeedsRecharge = highlightNeedsRecharge;

highlightNeedsRecharge.conditions = [85, 70, 60, 45, 30, 15, 0];

highlightNeedsRecharge.styles = {
  common: {
  },
  cond85: {
    fillColor: 'yellow',
    fillOpacity: 0.5
  },
  cond70: {
    fillColor: 'orange',
    fillOpacity: 0.5
  },
  cond60: {
    fillColor: 'darkorange',
    fillOpacity: 0.5
  },
  cond45: {
    fillColor: 'red',
    fillOpacity: 0.4
  },
  cond30: {
    fillColor: 'red',
    fillOpacity: 0.6
  },
  cond15: {
    fillColor: 'red',
    fillOpacity: 0.8
  },
  cond0: {
    fillColor: 'magenta',
    fillOpacity: 1.0
  }
};

function needsRecharge(data) {
  var d = data.portal.options.data;
  var health = d.health;

  if (health !== undefined && data.portal.options.team !== TEAM_NONE && health < 100) {
    var params = L.extend ({},
      highlightNeedsRecharge.styles.common,
      highlightNeedsRecharge.styles[
        'cond'+ highlightNeedsRecharge.conditions.find(function (cond) {return cond < health;})
      ]
    );

    data.portal.setStyle(params);
  }
}

function setup () {
  window.addPortalHighlighter('Needs Recharge (Health)', needsRecharge);
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

