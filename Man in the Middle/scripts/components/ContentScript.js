/**
 * Content script manager
 * */
class ContentScript extends Rule {
    /**
     * Initialize a content script
     * @param {ContentScriptDetails} details
     * */
    constructor({
                    code = '',
                    scriptType = 'JavaScript',
                    domEvent = 'completed',
                    urlFilters = [],
                    frameId = 0
                }) {
        super();

        this.injectDetails = {
            code: '',
            frameId: 0
        };

        this.setCode(code)
            .setScriptType(scriptType)
            .setDOMEvent(domEvent)
            .setUrlFilters(urlFilters)
            .setFrameId(frameId);
    }

    /**
     * @param {string} code
     * @return {ContentScript}
     * */
    setCode(code) {
        this.injectDetails.code = code;

        if (this.isActive()) {
            this.deactivate();
            this.activate();
        }

        return this;
    }

    /**
     * @param {ScriptTypeString} scriptType
     * @return {ContentScript}
     * */
    setScriptType(scriptType) {
        this.scriptType = scriptType;
        this.injector = this.constructor.getScriptInjector(scriptType);

        return this;
    }

    /**
     * @param {DOMEventString} domEvent
     * @return {ContentScript}
     * */
    setDOMEvent(domEvent) {
        const active = this.isActive();

        active && this.deactivate();

        this.domEvent = domEvent;
        this.navigationEvent = this.constructor.getNavigationEvent(
            domEvent
        );

        active && this.activate();

        return this;
    }

    /**
     * @param {[string]} urlFilters
     * @return {ContentScript}
     * */
    setUrlFilters(urlFilters) {
        this.urlFilters = [...new Set(urlFilters)];

        this.filterObject = this.constructor.createFilterRule(
            this.urlFilters
        );

        if (this.isActive()) {
            this.deactivate();
            this.activate();
        }

        return this;
    }

    /**
     * @param {number} frameId
     * @return {ContentScript}
     * @see {@link https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webNavigation/onDOMContentLoaded#details}
     * */
    setFrameId(frameId) {
        this.injectDetails.frameId = frameId;

        return this;
    }

    /**
     * @override
     * @return {ContentScript}
     * */
    activate() {
        if (!this.isActive()) {
            this.active = true;

            if (this.injectDetails.code) {
                this.navigationEvent.addListener(
                    this.onNavigateCallback,
                    this.filterObject
                );
            }
        }

        return this;
    }

    /**
     * @override
     * @return {ContentScript}
     * */
    deactivate() {
        if (this.isActive()) {
            this.active = false;

            this.navigationEvent.removeListener(
                this.onNavigateCallback
            );
        }

        return this;
    }

    /**
     * Inject content script if navigation's frame ID matched.
     * @private
     * @param {NavigationEventDetails}
     * */
    onNavigateCallback({frameId, tabId}) {
        if (frameId !== this.injectDetails.frameId) {
            return;
        }

        try {
            this.injector(tabId, this.injectDetails);
        } catch (error) {
            console.warn(error);
        }
    }

    /**
     * @inheritDoc
     */
    toDataObject() {
        return {
            code: this.injectDetails.code,
            scriptType: this.scriptType,
            domEvent: this.domEvent,
            urlFilters: this.urlFilters,
            frameId: this.injectDetails.frameId
        }
    }

    /**
     * @private
     * @param {DOMEventString} domEvent
     * @return {object}
     */
    static getNavigationEvent(domEvent) {
        return this.navigationEvents[domEvent];
    }

    /**
     * @private
     * @param {ScriptTypeString} scriptType
     * @return {function}
     */
    static getScriptInjector(scriptType) {
        return this.scriptInjectors[scriptType];
    }

    /**
     * Create navigation event listener's URL filter object from URL filters.
     * @param {array} urlFilters
     * @return {(NavigationEventUrlFilter|void)} URL filter object, or void if no filter is set.
     */
    static createFilterRule(urlFilters) {
        if (urlFilters.length === 0) {
            return;
        }

        return {url: this.createEventUrlFilters(urlFilters)};
    }
}

ContentScript.instances = [];

ContentScript.navigationEvents = {
    loading: browser.webNavigation.onCommitted,
    loaded: browser.webNavigation.onDOMContentLoaded,
    completed: browser.webNavigation.onCompleted
};

ContentScript.scriptInjectors = {
    JavaScript: browser.tabs.executeScript,
    CSS: browser.tabs.insertCSS
};

/**
 * @typedef {object} ContentScriptDetails
 * @property {string} [code = '']
 * @property {ScriptTypeString} [scriptType = 'JavaScript']
 * @property {DOMEventString} [domEvent = 'completed']
 * @property {[string]} [urlFilters = []]
 * @property {number} [frameId = 0]
 * */

/**
 * @typedef {string} ScriptTypeString
 * @value {'Javascript'}
 * @value {'CSS'}
 * */

/**
 * @typedef {string} DOMEventString
 * @value {'loading'}
 * @value {'loaded'}
 * @value {'completed'}
 * */

/**
 * @typedef {object} NavigationEventDetails
 * @property {number} tabId
 * @property {number} frameId
 *
 * @see {@link https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webNavigation/onDOMContentLoaded#details}
 * */

/**
 * @typedef {object} NavigationEventUrlFilter
 * @property {[browser.events.UrlFilter]} url
 * */