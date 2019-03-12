define("anaplan/patches/dojo/promise/instrumentation", [
	'dojo/promise/tracer',
	'dojo/has',
	'dojo/_base/lang',
	'dojo/_base/array'
], function(tracer, has, lang, baseArray){
	has.add('config-useDeferredInstrumentation', 'report-unhandled-rejections');

	// This file is taken directly from Dojo. The only modifications apart from this comment are:
	// - Double-quotes have been replaced with single quotes for JsHint
	// - Location-relative paths have been changed to base-relative so it works from the patches directory
	// - The console.error on the last line of the logError function has been replaced with showErrorReporter call
	// If the Dojo version is upgraded in the future, it should be easy to replay these modification onto the new version.

	function logError(error, rejection, deferred){
		var stack = '';
		if(error && error.stack){
			stack += error.stack;
		}
		if(rejection && rejection.stack){
			stack += '\n    ----------------------------------------\n    rejected' + rejection.stack.split('\n').slice(1).join('\n').replace(/^\s+/, ' ');
		}
		if(deferred && deferred.stack){
			stack += '\n    ----------------------------------------\n' + deferred.stack;
		}
		// Cannot put this in the define() because it breaks the Dojo bootstrap!
		require(['anaplan/Exceptions', 'dojo/errors/CancelError', 'anaplan/utils/UIHelper'], function (Exceptions, CancelError, UIHelper) {

			// Only display the error dialog if the reason for rejection was actually an error object.
			// Legacy code tends to open the error dialog itself, then reject with an untyped object.
			// Such code should be updated to reject with a strictly typed error and should not open the error dialog itself.

			if (typeof error === 'object' ) {
				if( error instanceof CancelError ) {
					// Not really an error, but the Dojo CancelError object inherits Error, so must be special-cased
					return console.error('Cancelled promise', error, stack);
				}
				else if( error instanceof Exceptions.BaseException || error instanceof Error ) {
					UIHelper.reportUnhandledPromiseRejection(new Exceptions.PromiseException(null, error, deferred, stack));
				}
			}

			console.error('Unhandled promise rejection', error, stack);
		});
	}

	function reportRejections(error, handled, rejection, deferred){
		if(!handled){
			logError(error, rejection, deferred);
		}
	}

	var errors = [];
	var activeTimeout = false;
	var unhandledWait = 1000;
	function trackUnhandledRejections(error, handled, rejection, deferred){
		if(handled){
			baseArray.some(errors, function(obj, ix){
				if(obj.error === error){
					errors.splice(ix, 1);
					return true;
				}
			});
		}else if(!baseArray.some(errors, function(obj){ return obj.error === error; })){
			errors.push({
				error: error,
				rejection: rejection,
				deferred: deferred,
				timestamp: new Date().getTime()
			});
		}

		if(!activeTimeout){
			activeTimeout = setTimeout(logRejected, unhandledWait);
		}
	}

	function logRejected(){
		var now = new Date().getTime();
		var reportBefore = now - unhandledWait;
		errors = baseArray.filter(errors, function(obj){
			if(obj.timestamp < reportBefore){
				logError(obj.error, obj.rejection, obj.deferred);
				return false;
			}
			return true;
		});

		if(errors.length){
			activeTimeout = setTimeout(logRejected, errors[0].timestamp + unhandledWait - now);
		}else{
			activeTimeout = false;
		}
	}

	return function(Deferred){
		// summary:
		//		Initialize instrumentation for the Deferred class.
		// description:
		//		Initialize instrumentation for the Deferred class.
		//		Done automatically by `dojo/Deferred` if the
		//		`deferredInstrumentation` and `useDeferredInstrumentation`
		//		config options are set.
		//
		//		Sets up `dojo/promise/tracer` to log to the console.
		//
		//		Sets up instrumentation of rejected deferreds so unhandled
		//		errors are logged to the console.

		var usage = has('config-useDeferredInstrumentation');
		if(usage){
			tracer.on('resolved', lang.hitch(console, 'log', 'resolved'));
			tracer.on('rejected', lang.hitch(console, 'log', 'rejected'));
			tracer.on('progress', lang.hitch(console, 'log', 'progress'));

			var args = [];
			if(typeof usage === 'string'){
				args = usage.split(',');
				usage = args.shift();
			}
			if(usage === 'report-rejections'){
				Deferred.instrumentRejected = reportRejections;
			}else if(usage === 'report-unhandled-rejections' || usage === true || usage === 1){
				Deferred.instrumentRejected = trackUnhandledRejections;
				unhandledWait = parseInt(args[0], 10) || unhandledWait;
			}else{
				throw new Error('Unsupported instrumentation usage <' + usage + '>');
			}
		}
	};
});
