Settings = {

  "_defaultSettings": {
    "connectionCheckUrl": "http://www.google.com",
  },

  "setup": function(forceReset) {
    // If there's no version, assume it's a new install (this also includes people in Beta 1, which didn't have settings)
    if( typeof Settings.get('version') == 'undefined' ) {
      window.__isNewInstall = true;
    }

    for( var key in Settings._defaultSettings ) {
        // Create new settings if necessary
        if( typeof Settings.get(key) == 'undefined' || (forceReset === true) ) {
            Settings.set(key, Settings._defaultSettings[key]);
        }
    }

    Settings.performUpgrade();
  },
  
  "performUpgrade": function() {
    gui = require('nw.gui');
    var currentVersion = gui.App.manifest.version;
    Settings.set('version', currentVersion);
  },
  
  "get": function(variable) {
    return localStorage['settings_'+variable];
  },

  "set": function(variable, newValue) {
    localStorage.setItem('settings_'+variable, newValue);
  }
    
};

Settings.setup();