/**
 * @module anaplan/format/patch
 */
define("anaplan/format/patch", [

], function () {

    (function () {

        //extend accuracy of Number.toFixed starts
        Number.prototype.oldToFixed = Number.prototype.toFixed;

        /**
         *    Find the position of the 'needle' (desired string) in the 'haystack' (source string).
         *    Optional 'start' parameter to begin search from the specifed position.
         *    Uses native 'indexOf' when available or inline version when native version doesnt exist ( < ie9 )
         *    @member #
         *    @name #_inlineIndexOf
         *    @function
         *    @param {string} haystack
         *    @param {string} needle
         *    @param {integer} start
         *    @returns {number}
         */
        function _inlineIndexOf(haystack, needle, start) {
            start = start || 0;
            //does the native version exist?
            if (Array.prototype.indexOf) {
                //yes, use that
                return haystack.indexOf(needle, start);
            }

            //no native version for ie 7,8. so we roll our own
            var i = start
                , n = haystack.length;

            for (; i < n; i++) {
                if (haystack[i] === needle) {
                    return i;
                }
            }
            return -1;
        }

        /**
         *  Returns true if num0 has more significat figures than num1
         *  @member #
         *  @name #_compareResults
         *  @function
         *  @param {object} num0
         *  @param {object} num1
         *  @returns {boolean}
         */
        function _compareResults(num0, num1) {
            var c = null
                , i = 0
                , j = 0
                , decimalPlaces = []
                , num = null
                , result = 0
                , pos = 0;

            for (; i < 2; i++) {
                num = !i ? num0 : num1;

                result = {};
                var tmp = num.result;
                pos = //tmp.indexOf('.');
                    _inlineIndexOf(tmp, '.');

                if (pos >= 0) {

                    j = tmp.length;
                    result = j;
                    while (j--) {
                        c = tmp.charAt(j);
                        if (c !== '0') {
                            if (c === '.') {
                                break;
                            }
                            result = j;
                            break;
                        }
                    }
                }
                decimalPlaces[i] = result;
            }

            return decimalPlaces[0] >= 0 && decimalPlaces[1] >= 0 ? decimalPlaces[0] >= decimalPlaces[1] :
                num0.actual > num1.actual;
        }

        /**
         *  Split the requested number into the required components for easy future processing
         *  @member #
         *  @name #
         *  @function
         *  @param {number} n
         *  @returns {object} {
     *      integer: ... ,
     *      decimal: ... ,
     *      exponent: ...
     *  }
         */
        function _getComponents(n) {
            var tmp = '';

            //ensure the input is in the correct format for processing

            if (typeof n !== 'string') {
                tmp = n.toString().toLowerCase();
                n = //tmp.indexOf('e') < 0
                        _inlineIndexOf(tmp, 'e') < 0 ? n.toExponential() : n;
            }

            //ensure input number is in the correct format
            var match = /([+\-]?\d)(?:\.(\d+))?(?:[eE]([+\-]?\d+))?$/.exec(n);

            //.toString() may convert to non-exponential format
            //so we use .toExponential() to ensure we are always using exponential format
            //then split the number into separate components

            //match[0]  complete number
            //match[1]  integer
            //match[2]  decimal
            //match[3]  exponent

            if (match.length !== 4) {
                throw new Error('_getCompnents unable to match 4 components for: ' + n);
            }

            tmp = parseInt(match[3], 10);

            return {
                actual: match[0], sign: match[1] < 0 ? -1 : 1, integer: match[1] * 1, decimal: match[2] ||
                    0, exponent: tmp, absExponent: Math.abs(tmp)
            };
        }

        /**
         *  Convert the requested 'number' to 'decimal' decimal places of accuracy
         *  This method chooses between extending the fixed20 version of the number or formating the input number itself
         *  @member #
         *  @name #_anaplanToFixed
         *  @function
         *  @param {number} number
         *  @param {integer} decimalPlaces Number of decimal places required
         *  @param {float} fixed20 Required number in 20 fixed point
         *  @returns {string}
         */
        function _anaplanToFixed(number, decimalPlaces, fixed20) {
            var tmp = ''
                , arr = []
                , nums = []
                , num = {}
                , len = 0
                , i = 0
                , j = 0
                , digit = ''
                , carry = 0
                , n = 0
                , test = false;

            //handle edge cases first
            if (!isFinite(number)) {
                return number < 0 ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
            }

            //break the 'number' and its closest fixed point version down into separate components for easier processing
            nums[0] = _getComponents(parseFloat(fixed20));
            nums[1] = _getComponents(number);

            for (; i < 2; i++) {
                num = nums[i];
                num.result = '';
                tmp = Math.abs(num.integer).toString() + num.decimal;
                len = tmp.length;

                if (num.exponent < 0) {
                    n = num.absExponent;
                    arr = tmp.split('');

                    //leading zeros required
                    for (j = 1; j < n; j++) {
                        arr.unshift(0);
                    }

                    //pad the output with plenty of trailing zeros
                    n = decimalPlaces;
                    while (n--) {
                        arr.push(0);
                    }

                    n = arr.length;
                    while (n--) {
                        arr[n] = parseInt(arr[n], 10);
                    }

                    //get the next least significant digit that is out of the requested range
                    digit = parseInt(arr[decimalPlaces], 10);

                    //is rounding required?
                    carry = digit >= 5 ? 1 : 0;

                    //add the carry to the least significant digit
                    j = decimalPlaces;
                    while (j--) {
                        digit = parseInt(arr[j], 10) + carry;
                        arr[j] = digit < 10 ? digit : 0;

                        carry = digit === 10 ? 1 : 0;
                        if (!carry) {
                            break;
                        }
                    }

                    arr.unshift(carry ? '1.' : '0.');

                    num.result = arr.join('');
                    n = //num.result.indexOf('.');
                        _inlineIndexOf(num.result, '.');
                    num.result = num.result.substring(0, n + decimalPlaces + 1);
                }
                else {
                    if (num.exponent > 0) {
                        tmp = num.decimal.toString();
                        n = Math.max(tmp.length, num.exponent);

                        for (arr = [], j = 0; j < n; j++) {
                            arr.push(j < tmp.length ? parseInt(tmp.charAt(j), 10) : 0);
                        }

                        //pad the output with plenty of trailing zeros
                        n = decimalPlaces;
                        while (n--) {
                            arr.push(0);
                        }

                        //do we need to round?

                        digit = parseInt(arr[decimalPlaces], 10);
                        carry = digit >= 5;

                        arr.unshift(Math.abs(num.integer));
                        n = arr.length;
                        while (n--) {
                            digit = parseInt(arr[n], 10) + carry;
                            arr[n] = digit < 10 ? digit : 0;
                            carry = digit === 10 ? 1 : 0;
                            if (!carry) {
                                break;
                            }
                        }

                        len = arr.length;
                        if (num.exponent - 1 < len) {
                            //inject the decimal place into the string
                            arr.splice(num.exponent + 1, 0, '.');
                        }

                        if (carry) {
                            arr.unshift(1);
                        }

                        num.result = arr.join('');
                        n = //num.result.indexOf('.');
                            _inlineIndexOf(num.result, '.');

                        if (n >= 0) {
                            num.result = num.result.substring(0, n + decimalPlaces + 1);
                        }
                    }
                    else {
                        //no change in size, pass through

                        arr = (Math.abs(num.integer).toString() + num.decimal).split('');
                        n = arr.length;

                        //copy over the digits that exist in the input
                        while (n--) {
                            arr[n] = parseInt(arr[n], 10);
                        }

                        //pad with plenty of trailing zeros
                        n = decimalPlaces;
                        while (n--) {
                            arr.push(0);
                        }

                        //get the next least significant digit that is out of the requested range
                        digit = parseInt(arr[decimalPlaces], 10);

                        //is rounding required?
                        carry = digit >= 5;

                        //remove the digits beyond the number of decimal places requested
                        arr.splice(decimalPlaces, arr.length - 1 - decimalPlaces);

                        //process round and carry
                        n = decimalPlaces;
                        while (n--) {
                            digit = parseInt(arr[n], 10) + carry;
                            arr[n] = digit < 10 ? digit : 0;
                            carry = digit === 10 ? 1 : 0;
                            if (!carry) {
                                break;
                            }
                        }

                        //carry from the most significant digit to next order of maginitude
                        if (carry) {
                            //arr[0] += 10;
                            arr.unshift(1);
                        }
                        //inject the decimal point
                        arr.splice(1, 0, '.');
                        num.result = arr.join('');
                    }
                }
            }

            test = _compareResults(nums[0], nums[1]);

            nums[0].result = (nums[0].sign < 0 ? '-' : '') + nums[0].result;
            nums[1].result = (nums[1].sign < 0 ? '-' : '') + nums[1].result;

            if (window.debug) {
                //debug output
                return {
                    r0: nums[0].result,
                    r1: nums[1].result,
                    c: test,
                    r: test ? nums[0].result : nums[1].result
                };
            }
            else {
                //production output
                return test ? nums[0].result : nums[1].result;
            }
        }

        /**
         *    Extend accuracy of Number.toFixed()
         *    Uses native .toFixed code for 0 - 20 digits and our implementation for above this range
         *    @member #
         *    @name #anplanToFixed
         *    @function
         *    @param {integer} digits
         *    @returns {string}
         */
        var anaplanToFixed = function (digits) {
            var minFixed = 20;

            digits = digits || 0;

            if (digits >= 0 && digits <= minFixed) {
                return this.oldToFixed(digits);
            }
            else {
                if (digits > minFixed) {
                    //jshint bitwise: false
                    return _anaplanToFixed(this, digits | 0, this.oldToFixed(20));
                    //jshint bitwise: true
                }
                else {
                    throw new Error('toFixed() digits argument must be >= 0');
                }
            }
        };

        //hook in the new anaplan version of 'toFixed'
        Number.prototype.toFixed = anaplanToFixed;
        //extend accuracy of Number.toFixed ends

        //console.log('.toFixed() patched');

    })();

});