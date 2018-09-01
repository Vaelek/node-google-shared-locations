const request = require('request');
const cheerio = require('cheerio');

/**
 * Challenges map with challenges details.
 */
const challengesMap = [{
    fragment: '/signin/challenge/az/',
    code: 'p',
    description: 'Cell phone verification',
    implementation: true
}, {
    fragment: '/signin/challenge/totp/',
    code: 'a',
    description: 'Google Authenticator',
    implementation: false
}, {
    fragment: '/signin/challenge/ipp/',
    code: 's',
    description: 'SMS or Voice call',
    implementation: false
}, {
    fragment: '/signin/challenge/iap/',
    code: 's',
    description: 'SMS or Voice call',
    implementation: false
}, {
    fragment: '/signin/challenge/sk/',
    code: 'k',
    description: 'Security key',
    implementation: false
}];
let showStage = false;
let ownerLocationData = true;
let googleAccountEmail = '';
let googleAccountPassword = '';
let lastSharedLocation = null;
let stageData = {
    authenticated: false,
    cookies: {}
};

module.exports = {
    /**
     * Authentication status (true if authentication completed successfully).
     */
    get authenticated() {
        return stageData['authenticated'];
    },
    /**
     * Set authentication status to true to skip first verification step (stage 1) after set new cookies.
     * This can speed up data acquisition, but the credentials will not be checked.
     */
    set authenticated(value) {
        stageData['authenticated'] = value === true;
    },
    /**
     * Credentials status (true if googleEmail and googlePassword are set).
     */
    get credentials() {
        return googleAccountEmail !== '' && googleAccountPassword !== '';
    },
    /**
     * Set Google account email.
     */
    set googleEmail(value) {
        googleAccountEmail = value;
    },
    /**
     * Set Google account password.
     */
    set googlePassword(value) {
        googleAccountPassword = value;
    },
    /**
     * Get last detected shared location from google map.
     */
    get lastSharedLocation() {
        return lastSharedLocation;
    },
    /**
     * Set debugging mode (stage number is visible in console before any error).
     */
    set debug(state) {
        showStage = state;
    },
    /**
     * Get actual cookies for google.com domain.
     */
    get cookies() {
        return stageData['cookies'];
    },
    /**
     * Set cookies for google.com domain. Authentication status is set to false (for new cookies).
     */
    set cookies(value) {
        stageData['cookies'] = value;
        stageData['authenticated'] = false;
    },
    /**
     * Load location data for authenticated user (not only for other users).
     */
    get ownerLocationData() {
        return ownerLocationData;
    },
    /**
     * If true (default), last item in shared location data will be active user location (if it is known to google).
     * If false, only shared location data for other users will be returned.
     */
    set ownerLocationData(value) {
        ownerLocationData = value;
    },
    /**
     * Reset credentials (login and password).
     */
    resetCredentials() {
        googleAccountEmail = '';
        googleAccountPassword = '';
    },
    /**
     * Reset authentication status (clear cookies and set authenticated to false).
     */
    resetAuthentication() {
        stageData = {
            authenticated: false,
            cookies: {}
        };
    },
    /**
     * Reset location data.
     */
    resetLocationData() {
        lastSharedLocation = null;
    },
    /**
     * Reset credentials (login and password), authentication (cookies) and last location data.
     */
    reset() {
        this.resetCredentials();
        this.resetAuthentication();
        this.resetLocationData();
    },

    /**
     * Authenticate on google accounts service.
     */
    async authenticate() {
        return new Promise((resolve, reject) => {
            /* connectStage0().then(() => {
                return connectStage1();
            }, reject0 => {
                reject(reject0);
                return Promise.reject();
            })*/
            connectStage1().then(() => {
                return connectStage2();
            }, reject1 => {
                reject(reject1);
                return Promise.reject();
            }).then(() => {
                return connectStage3();
            }, reject2 => {
                reject(reject2);
                return Promise.reject();
            }).then(() => {
                return connectStage4();
            }, reject3 => {
                reject(reject3);
                return Promise.reject();
            }).then(() => {
                return connectStage5();
            }, reject4 => {
                reject(reject4);
                return Promise.reject();
            }).then((data) => {
                return resolve(data['authenticated']);
            }, reject5 => {
                reject(reject5);
            });
        });
    },

    /**
     * Get shared location from google map.
     * Try to authenicate if is not authenticated already.
     */
    async getLocations() {
        return new Promise((resolve, reject) => {
            this.authenticate().then(
                    loggedIn => {
                        if (!loggedIn) {
                            reject('Not authenticated');
                            return Promise.reject();
                        }
                        return getSharedLocations();
                    }
                )
                .then(data => {
                    lastSharedLocation = data;
                    return resolve(data);
                })
                .catch(failure => {
                    return reject(failure);
                });
        });
    }
}

/**
 * Compose cokies object for the header.
 */
function getCookie() {
    if (!stageData['cookies']) {
        return {};
    }
    let cookieStr = '';
    for (var cookie in stageData['cookies']) {
        cookieStr += cookie + '=' + stageData['cookies'][cookie] + ';'
    }
    return {
        "Cookie": cookieStr.slice(0, -1)
    };
}

/**
 * Save cookies as key value.
 */
function setCookie(cookies, clearFirst = false) {
    if (clearFirst) {
        stageData['cookies'] = {};
    }
    if (!cookies) {
        return;
    }
    cookies.forEach(cookie => {
        const [
            key,
            value,
        ] = cookie.split(';')[0].split('=');
        stageData['cookies'][key] = value;
    });
}

/**
 * Check if cookie is defined.
 */
function checkCookie(cookieKey) {
    return stageData['cookies'][cookieKey] !== undefined;
}

/**
 * Verification step.
 * If cookies on input are valid, no redirect will be in response
 */
/*
function connectStage0(skipIfAuthenticated = true) {
    const stage = 'stage 0';
    if (stageData['authenticated'] && skipIfAuthenticated) {
        return Promise.resolve(stageData);
    }
    if (Object.keys(stageData['cookies']).length === 0) {
        stageData['authenticated'] = false;
        return Promise.resolve(stageData);
    }
    return new Promise((resolve, reject) => {
        request({
            url: stageData['url'] || "https://myaccount.google.com/general-light",
            headers: {
                ...getCookie()
            },
            method: "GET",
            followRedirect: false
        }, function (err, response, body) {
            if (err) {
                if (showStage) {
                    console.warn(err, stage + ' request/response error');
                }
                return reject(new Error('Wrong check url'));
            }
            if (response.statusCode === 302) {
                stageData['url'] = response['headers']['location'];
                return connectStage0().then(data => resolve(data));
            }
            // If not redirect, user is authenticated
            stageData['authenticated'] = response.statusCode === 200;
            return resolve(stageData);
        });
    });
}
*/

/**
 * Open intial page and get GAPS cookie.
 * Extract login form.
 */
function connectStage1() {
    const stage = 'stage 1';
    if (stageData['authenticated']) {
        return Promise.resolve(stageData);
    }
    return new Promise((resolve, reject) => {
        // first get GAPS cookie
        request({
            url: "https://accounts.google.com/ServiceLogin",
            headers: {
                ...getCookie(),
                "Upgrade-Insecure-Requeste": "1",
                "Connection": "keep-alive"
            },
            method: "GET",
            qs: {
                "rip": "1",
                "nojavascript": "1",
                "flowName": "GlifWebSignIn",
                "flowEntry": "ServiceLogin"
            },
            followRedirect: false
        }, function (err, response, body) {
            if (err || !response) {
                if (showStage) {
                    console.warn(err, stage + ' request/response error');
                }
                return reject(new Error('Request error'));
            }
            if (response.statusCode === 302 && checkCookie('SID')) {
                stageData['authenticated'] = true;
                return resolve(stageData);
            }
            if (response.statusCode !== 200) {
                if (showStage) {
                    console.warn(response, stage + ' status code ' + response.statusCode);
                }
                return reject(new Error('Response not OK'));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(response.headers['set-cookie'], true);
            } else {
                if (showStage) {
                    console.warn(response.headers, stage + ' missing set-cookie header');
                }
                return reject(new Error('No cookies'));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                if (showStage) {
                    console.warn(error, stage + ' error message on webpage');
                }
                return reject(new Error('Error on webpage'));
            }
            const googleEmailForm = $("form").serializeArray()
                .reduce((r, x) => Object.assign({}, r, {
                    [x.name]: x.value,
                }), {});
            if (!googleEmailForm) {
                console.info('If logins are being blocked, try to allow it here: https://accounts.google.com/b/0/DisplayUnlockCaptcha');
                return reject(new Error('Missing login form'));
            }
            stageData['form'] = googleEmailForm;
            return resolve(stageData);
        });
    });
}

/**
 * Get GAPS and GALX cookies. Now we have the Google login form for set user name.
 * Check for signin form with password input box.
 */
function connectStage2() {
    const stage = 'stage 2';
    if (stageData['authenticated']) {
        return Promise.resolve(stageData);
    }
    if (!stageData['form']) {
        if (showStage) {
            console.warn(stageData, stage + ' missing form');
        }
        return Promise.reject(new Error('Missing form'));
    }
    stageData['form']['Email'] = googleAccountEmail;
    return new Promise((resolve, reject) => {
        request({
            url: "https://accounts.google.com/signin/v1/lookup",
            headers: {
                ...getCookie(),
                "Referer": "https://accounts.google.com/ServiceLogin?rip=1&nojavascript=1",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: stageData['form']
        }, function (err, response, body) {
            if (err || !response) {
                if (showStage) {
                    console.warn(err, stage + ' request/response error');
                }
                return reject(new Error('Request error'));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(response.headers['set-cookie']);
            } else {
                if (showStage) {
                    console.warn(response.headers, stage + ' missing set-cookie header');
                }
                return reject(new Error('No cookies'));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                if (showStage) {
                    console.warn(error, stage + ' error message on webpage');
                }
                return reject(new Error('Error on webpage'));
            }
            const googlePasswordForm = $("form").serializeArray()
                .reduce((r, x) => Object.assign({}, r, {
                    [x.name]: x.value,
                }), {});
            stageData['form'] = googlePasswordForm;
            return resolve(stageData);
        });
    });
}

/**
 * We have the GAPS cookie and the GALX identifier.
 * Start username and password challenge now.
 */
function connectStage3() {
    const stage = 'stage 3';
    if (stageData['authenticated']) {
        return Promise.resolve(stageData);
    }
    if (!stageData['form']) {
        if (showStage) {
            console.warn(stageData, stage + ' missing form');
        }
        return Promise.reject(new Error('Missing form'));
    }
    stageData['form']['Passwd'] = googleAccountPassword;
    return new Promise((resolve, reject) => {
        request({
            url: "https://accounts.google.com/signin/challenge/sl/password",
            headers: {
                ...getCookie(),
                "Referer": "https://accounts.google.com/signin/v1/lookup",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: stageData['form']
        }, function (err, response, body) {
            if (err || !response) {
                if (showStage) {
                    console.warn(err, stage + ' request/response error');
                }
                return reject(new Error('Request error'));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                if (showStage) {
                    console.warn(error, stage + ' error message on webpage');
                }
                return reject(new Error('Error on webpage'));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(response.headers['set-cookie']);
                if (checkCookie('SID')) {
                    stageData['authenticated'] = true;
                    return resolve(stageData);
                }
            }
            if (response.headers['location']) {
                if (showStage) {
                    console.warn('Possible 2FA. Try to call again with twoFactorConfirmation = true, after confirmation on mobile phone.');
                }
                stageData['url'] = response.headers['location'];
                stageData['referer'] = response.request.href;
                return resolve(stageData);
            }
            if (showStage) {
                console.warn(response.headers, stage + ' missing set-cookie header or redirection');
            }
            return reject(new Error('Nothing to follow'));
        });
    });
}

/**
 * Check if we need to redirect for 2FA confirmation.
 * If there is only one form after redirect, user need to click "Yes" confirmation on phone.
 * If there is multiple forms, google asks for exact confirmation type.
 * This script can only continue with authentication via phone confirmation.
 */
function connectStage4() {
    const stage = 'stage 4';
    if (stageData['authenticated']) {
        return Promise.resolve(stageData);
    }
    if (!stageData['url'] || !stageData['referer']) {
        if (showStage) {
            console.warn(stageData, stage + ' missing url');
        }
        return Promise.reject(new Error('Missing url'));
    }
    return new Promise((resolve, reject) => {
        request({
            url: stageData['url'],
            headers: {
                ...getCookie(),
                "Referer": stageData['referer'],
                "Origin": "https://accounts.google.com"
            },
            method: "GET"
        }, function (err, response, body) {
            if (err || !response) {
                if (showStage) {
                    console.warn(err, stage + ' request/response error');
                }
                return reject(new Error('Request error'));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                if (showStage) {
                    console.warn(error, stage + ' error message on webpage');
                }
                return reject(new Error('Error on webpage'));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(response.headers['set-cookie']);
                if (checkCookie('SID')) {
                    return resolve(true);
                }
            }
            var challenge = undefined;
            var forms = $('form');

            if (forms.length > 0) {
                const challenges = challengesMap
                    .filter(c => c.implementation)
                    .map(c => {
                        const form = forms.toArray().find(f => (f['attribs'] && f['attribs']['action'] || '').indexOf(c.fragment) >= 0);
                        return {
                            exists: form != null,
                            challengeFragment: c.fragment,
                            challengeCode: c.code,
                            challengeDescription: c.description,
                            form: form
                        };
                    });

                if (challenges) {
                    challenge = challenges.find(c => c.exists);
                }
                if (challenge === undefined) {
                    if (showStage) {
                        console.warn(forms, stage + ' unsupported challenge forms');
                    }
                    return reject(new Error('Unsupported challenge'));
                }
            } else {
                if (showStage) {
                    console.warn(response.body, stage + ' no challenge forms found');
                }
                return reject(new Error('Nothing to follow'));
            }

            switch (challenge.challengeCode) {
                case 'p':
                    if (showStage) {
                        console.warn(challenge, stage + ' waiting for verification by cell phone');
                    }
                    stageData['form'] = $(challenge.form).serializeArray()
                        .reduce((r, x) => Object.assign({}, r, {
                            [x.name]: x.value,
                        }), {});
                    stageData['action'] = (challenge.form['attribs']['action'] || '').startsWith('http') ?
                    challenge.form['attribs']['action'] :
                    'https://accounts.google.com' + (challenge.form['attribs']['action'] || '');
                    stageData['twoFactorConfirmation'] = true;
                    stageData['authenticated'] = true;
                    return reject(new Error('Cell phone verification'));
                default:
                    return reject(new Error('Unsupported challenge'));
            }
        });
    });
}

/**
 * Submit form after cell phone verification is done
 */
function connectStage5() {
    const stage = 'stage 5';
    if (stageData['twoFactorConfirmation']) {
        delete stageData['twoFactorConfirmation'];
    } else {
        return Promise.resolve(stageData);
    }

    if (!stageData['action'] || !stageData['form']) {
        if (showStage) {
            console.warn(nextSubmitForm, stage + ' missing form');
        }
        stageData['authenticated'] = false;
        return Promise.reject(new Error('Nothing to follow'));
    }
    return new Promise((resolve, reject) => {
        request({
            url: stageData['action'],
            headers: {
                ...getCookie(),
                "Referer": "https://accounts.google.com/signin/challenge/sl/password",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: stageData['form']
        }, function (err, response, body) {
            if (err || !response) {
                if (showStage) {
                    console.warn(err, stage + ' request/response error');
                }
                stageData['authenticated'] = false;
                return reject(new Error('Request error'));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                if (showStage) {
                    console.warn(error, stage + ' error message on webpage');
                }
                stageData['authenticated'] = false;
                return reject(new Error('Error on webpage'));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(response.headers['set-cookie']);
            } else {
                if (showStage) {
                    console.warn(response.headers, stage + ' missing set-cookie header');
                }
                stageData['authenticated'] = false;
                return reject(new Error('No cookies'));
            }
            stageData['authenticated'] = checkCookie('SID');
            return resolve(stageData);
        });
    })
}

function getSharedLocations() {
    return new Promise((resolve, reject) => {
        request({
            url: "https://www.google.com/maps/preview/locationsharing/read",
            headers: {
                ...getCookie()
            },
            method: "GET",
            qs: {
                "authuser": 0,
                "pb": ""
            }
        }, function (err, response, body) {
            if (err || !response) {
                return reject(new Error('Locationsharing response error: ' + err));
            }
            if (response.statusCode !== 200) {
                // connection established but auth failure
                return reject(new Error('Locationsharing response status error: HTTP Status ' + response.statusCode));
            }
            // Parse and save user locations
            const locationData = JSON.parse(body.split('\n').slice(1, -1).join(''));
            // Shared location data is contained in the first element
            const otherUsersData = locationData[0] || [];
            const users = otherUsersData.map(data => ({
                "id": data[0][0],
                "name": data[0][3],
                "shortname": data[6] && data[6][3],
                "visible": (data[1] && data[1][2]) != null,
                "lat": data[1] && data[1][1][2],
                "lng": data[1] && data[1][1][1],
                "locationname": data[1] && data[1][4],
                "photoURL": data[0][1],
                "lastupdateepoch": data[1] && data[1][2],
                "lastupdate": data[1] && new Date(new Date(0).setUTCSeconds(data[1][2].toString().substring(0, 10)))
            }));
            // main user location data
            const activeUserData = locationData[9] && {
                "id": 0,
                "name": '',
                "shortname": '',
                "visible": locationData[8] != null,
                "lat": locationData[9] && locationData[9][1] && locationData[9][1][1] && locationData[9][1][1][2],
                "lng": locationData[9] && locationData[9][1] && locationData[9][1][1] && locationData[9][1][1][1],
                "locationname": locationData[9] && locationData[9][1] && locationData[9][1][4],
                "photoURL": '',
                "lastupdateepoch": locationData[8],
                "lastupdate": locationData[8] && new Date(new Date(0).setUTCSeconds(locationData[8].toString().substring(0, 10)))
            };
            if (activeUserData) {
                users.push(activeUserData);
            }

            if (users.length > 0)
                return resolve(users);
            else
                return resolve([]);
        });
    })
}