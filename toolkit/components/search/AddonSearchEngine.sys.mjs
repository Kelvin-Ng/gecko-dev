/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint no-shadow: error, mozilla/no-aArgs: error */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

import { SearchEngine } from "resource://gre/modules/SearchEngine.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SearchUtils: "resource://gre/modules/SearchUtils.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  AddonManager: "resource://gre/modules/AddonManager.jsm",
  ExtensionParent: "resource://gre/modules/ExtensionParent.jsm",
});

XPCOMUtils.defineLazyGetter(lazy, "logConsole", () => {
  return console.createInstance({
    prefix: "AddonSearchEngine",
    maxLogLevel: lazy.SearchUtils.loggingEnabled ? "Debug" : "Warn",
  });
});

/**
 * AddonSearchEngine represents a search engine defined by an add-on.
 */
export class AddonSearchEngine extends SearchEngine {
  // Whether the engine is provided by the application.
  #isAppProvided = false;

  /**
   * Creates a AddonSearchEngine.
   *
   * @param {object} options
   *   The options object
   * @param {boolean} options.isAppProvided
   *   Indicates whether the engine is provided by Firefox, either
   *   shipped in omni.ja or via Normandy. If it is, it will
   *   be treated as read-only.
   * @param {object} [options.details]
   *   An object that simulates the manifest object from a WebExtension.
   * @param {object} [options.json]
   *   An object that represents the saved JSON settings for the engine.
   */
  constructor({ isAppProvided, details, json } = {}) {
    let extensionId =
      details?.extensionID ?? json.extensionID ?? json._extensionID;
    let id = extensionId + (details?.locale ?? json._locale);

    super({
      loadPath: "[addon]" + extensionId,
      isAppProvided,
      id,
    });

    this._extensionID = extensionId;
    this.#isAppProvided = isAppProvided;

    if (details) {
      if (!details.extensionID) {
        throw Components.Exception(
          "Empty extensionID passed to _createAndAddEngine!",
          Cr.NS_ERROR_INVALID_ARG
        );
      }

      this.#initFromManifest(
        details.extensionBaseURI,
        details.manifest,
        details.locale,
        details.config
      );
    } else {
      this._initWithJSON(json);
    }
  }

  /**
   * Update this engine based on new manifest, used during
   * webextension upgrades.
   *
   * @param {string} extensionBaseURI
   *   The Base URI of the WebExtension.
   * @param {object} manifest
   *   An object representing the WebExtensions' manifest.
   * @param {string} locale
   *   The locale that is being used for the WebExtension.
   * @param {object} [configuration]
   *   The search engine configuration for application provided engines, that
   *   may be overriding some of the WebExtension's settings.
   */
  updateFromManifest(extensionBaseURI, manifest, locale, configuration = {}) {
    this._urls = [];
    this._iconMapObj = null;
    this.#initFromManifest(extensionBaseURI, manifest, locale, configuration);
    lazy.SearchUtils.notifyAction(this, lazy.SearchUtils.MODIFIED_TYPE.CHANGED);
  }

  /**
   * Whether or not this engine is provided by the application, e.g. it is
   * in the list of configured search engines. Overrides the definition in
   * `SearchEngine`.
   *
   * @returns {boolean}
   */
  get isAppProvided() {
    return this.#isAppProvided;
  }

  /**
   * Whether or not this engine is an in-memory only search engine.
   * These engines are typically application provided or policy engines,
   * where they are loaded every time on SearchService initialization
   * using the policy JSON or the extension manifest. Minimal details of the
   * in-memory engines are saved to disk, but they are never loaded
   * from the user's saved settings file.
   *
   * @returns {boolean}
   *   Only returns true for application provided engines.
   */
  get inMemory() {
    return this.#isAppProvided;
  }

  /**
   * Creates a JavaScript object that represents this engine.
   *
   * @returns {object}
   *   An object suitable for serialization as JSON.
   */
  toJSON() {
    // For built-in engines we don't want to store all their data in the settings
    // file so just store the relevant metadata.
    if (this.#isAppProvided) {
      return {
        id: this.id,
        _name: this.name,
        _isAppProvided: true,
        _metaData: this._metaData,
      };
    }
    return super.toJSON();
  }

  /**
   * Checks to see if this engine's settings are in sync with what the add-on
   * manager has, and reports the results to telemetry.
   */
  async checkAndReportIfSettingsValid() {
    let addon = await lazy.AddonManager.getAddonByID(this._extensionID);

    if (!addon) {
      lazy.logConsole.debug(
        `Add-on ${this._extensionID} for search engine ${this.name} is not installed!`
      );
      Services.telemetry.keyedScalarSet(
        "browser.searchinit.engine_invalid_webextension",
        this._extensionID,
        1
      );
    } else if (!addon.isActive) {
      lazy.logConsole.debug(
        `Add-on ${this._extensionID} for search engine ${this.name} is not active!`
      );
      Services.telemetry.keyedScalarSet(
        "browser.searchinit.engine_invalid_webextension",
        this._extensionID,
        2
      );
    } else {
      let policy = await AddonSearchEngine.getExtensionPolicy(
        this._extensionID
      );
      let providerSettings =
        policy.extension.manifest?.chrome_settings_overrides?.search_provider;

      if (!providerSettings) {
        lazy.logConsole.debug(
          `Add-on ${this._extensionID} for search engine ${this.name} no longer has an engine defined`
        );
        Services.telemetry.keyedScalarSet(
          "browser.searchinit.engine_invalid_webextension",
          this._extensionID,
          4
        );
      } else if (this.name != providerSettings.name) {
        lazy.logConsole.debug(
          `Add-on ${this._extensionID} for search engine ${this.name} has a different name!`
        );
        Services.telemetry.keyedScalarSet(
          "browser.searchinit.engine_invalid_webextension",
          this._extensionID,
          5
        );
      } else if (!this.checkSearchUrlMatchesManifest(providerSettings)) {
        lazy.logConsole.debug(
          `Add-on ${this._extensionID} for search engine ${this.name} has out-of-date manifest!`
        );
        Services.telemetry.keyedScalarSet(
          "browser.searchinit.engine_invalid_webextension",
          this._extensionID,
          6
        );
      }
    }
  }

  /**
   * Initializes the engine based on the manifest and other values.
   *
   * @param {string} extensionBaseURI
   *   The Base URI of the WebExtension.
   * @param {object} manifest
   *   An object representing the WebExtensions' manifest.
   * @param {string} locale
   *   The locale that is being used for the WebExtension.
   * @param {object} [configuration]
   *   The search engine configuration for application provided engines, that
   *   may be overriding some of the WebExtension's settings.
   */
  #initFromManifest(extensionBaseURI, manifest, locale, configuration = {}) {
    let searchProvider = manifest.chrome_settings_overrides.search_provider;

    this._locale = locale;

    // We only set _telemetryId for app-provided engines. See also telemetryId
    // getter.
    if (this.#isAppProvided) {
      if (configuration.telemetryId) {
        this._telemetryId = configuration.telemetryId;
      } else {
        let telemetryId = this._extensionID.split("@")[0];
        if (locale != lazy.SearchUtils.DEFAULT_TAG) {
          telemetryId += "-" + locale;
        }
        this._telemetryId = telemetryId;
      }
    }

    // Set the main icon URL for the engine.
    let iconURL = searchProvider.favicon_url;

    if (!iconURL) {
      iconURL =
        manifest.icons &&
        extensionBaseURI.resolve(
          lazy.ExtensionParent.IconDetails.getPreferredIcon(manifest.icons).icon
        );
    }

    // Record other icons that the WebExtension has.
    if (manifest.icons) {
      let iconList = Object.entries(manifest.icons).map(icon => {
        return {
          width: icon[0],
          height: icon[0],
          url: extensionBaseURI.resolve(icon[1]),
        };
      });
      for (let icon of iconList) {
        this._addIconToMap(icon.size, icon.size, icon.url);
      }
    }

    // Filter out any untranslated parameters, the extension has to list all
    // possible mozParams for each engine where a 'locale' may only provide
    // actual values for some (or none).
    if (searchProvider.params) {
      searchProvider.params = searchProvider.params.filter(param => {
        return !(param.value && param.value.startsWith("__MSG_"));
      });
    }

    this._initWithDetails(
      { ...searchProvider, iconURL, description: manifest.description },
      configuration
    );
  }

  /**
   * Gets the WebExtensionPolicy for an add-on.
   *
   * @param {string} id
   *   The WebExtension id.
   * @returns {WebExtensionPolicy}
   */
  static async getExtensionPolicy(id) {
    let policy = WebExtensionPolicy.getByID(id);
    if (!policy) {
      let idPrefix = id.split("@")[0];
      let path = `resource://search-extensions/${idPrefix}/`;
      await lazy.AddonManager.installBuiltinAddon(path);
      policy = WebExtensionPolicy.getByID(id);
    }
    // On startup the extension may have not finished parsing the
    // manifest, wait for that here.
    await policy.readyPromise;
    return policy;
  }
}
