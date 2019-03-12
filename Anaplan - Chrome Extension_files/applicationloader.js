/**
 * @module anaplan/applicationloader
 */
define("anaplan/applicationloader", [
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/window',
    'dojo/Deferred',
    'anaplan/format/patch'
], function (declare, lang, baseWindow, Deferred) {

    return declare(null, /** @lends anaplan.applicationloader.prototype */ {

        /**
         * @classdesc Provisions and passes flow of control to appropriate loader based on takeAction querystring parameter
         *
         * Default {@link anaplan.coreloader}
         *
         * It would make sense to create layout pieces here, as part of drive towards 'conformance', but at moment
         * - {@link anaplan.managementloader} pieces are not 'conformant' e.g. no Banner and
         * - {@link anaplan.layout.Banner} not sufficiently 'generic' anyway (issues with menus and core specific functionality)
         *
         * No big deal to do just not on any road map!
         * @constructs
         * @param {Object} args
         * @param {string} [args.takeAction]
         */
        constructor: function (args) {
            this._takeAction = args.takeAction;
            this._applicationArgs = args;
        },
        /**
         * Entry point from {@link anaplan.main}
         *
         * Provisions and passes control to either
         * - {@link anaplan.coreloader}
         * - {@link anaplan.managementloader}
         * @function
         * @returns {dojo.promise.Promise}
         */
        load: function () {
            var takeAction = this._takeAction;
            var deferred = new Deferred();
            try {
                lang.mixin(this._applicationArgs, {takeAction: takeAction});
                if (takeAction === 'createWorkspace' || takeAction === 'installApp' || takeAction === 'publishApp') {
                    require(['anaplan/managementloader'], lang.hitch(this, function (Managementloader) {
                        new Managementloader(this._applicationArgs).load(baseWindow.body()).then(function () {
                            deferred.resolve();
                        }, function (error) {
                            deferred.reject(error);
                        });
                    }));
                }
                else {
                    require(['anaplan/coreloader'], lang.hitch(this, function (Coreloader) {
                        new Coreloader(this._applicationArgs).load().then(function () {
                            deferred.resolve();
                        }, function (error) {
                            deferred.reject(error);
                        });
                    }));
                }
            }
            catch (error) {
                deferred.reject(error);
            }
            return deferred.promise;
        }
    });
});