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
let showOwnerLocation = true;

let googlePassword = '';
let stageData = {};

let minimalRequestTimeInterval = 60;
let lastSharedLocation = null;
let nextRequestAfter = null;

let credentials = {
    email: '',
    authenticated: false,
    ownerId: '',
    ownerName: '',
    ownerShortname: '',
    ownerPhotoUrl: '',
    cookies: {}
};

module.exports = {
    /**
     * Authentication status (true if authentication completed successfully).
     */
    get authenticated() {
        return credentials['authenticated'];
    },
    /**
     * Set authentication status to true to skip first verification step (stage 1) after set new cookies.
     * This can speed up data acquisition, but the credentials will not be checked.
     */
    set authenticated(value) {
        credentials['authenticated'] = value === true;
    },
    /**
     * Credentials status. True if 'login and password' or credentials are set.
     */
    get credentialsSpecified() {
        return credentials['email'] !== '' && (googlePassword !== '' || credentials['cookies']);
    },
    /**
     * Set Google account email.
     */
    set googleEmail(value) {
        credentials['email'] = value;
    },
    get googleEmail() {
        throw (new Error('Unauthorized'));
    },
    /**
     * Set Google account password.
     */
    set googlePassword(value) {
        googlePassword = value;
    },
    get googlePassword() {
        throw (new Error('Unauthorized'));
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
        return credentials['cookies'];
    },
    /**
     * Set cookies for google.com domain. Authentication status is set to false (if you change cookies).
     */
    set cookies(value) {
        credentials['cookies'] = value;
        credentials['authenticated'] = false;
    },
    /**
     * Get owner id
     */
    get ownerId() {
        return credentials['ownerId'];
    },
    /**
     * Set owner Id (it is not possible to detect it form location file)
     */
    set ownerId(value) {
        credentials['ownerId'] = value;
    },
    /**
     * Get owner name
     */
    get ownerName() {
        return credentials['ownerName'];
    },
    /**
     * Set owner name (it is not possible to detect it form location file)
     */
    set ownerName(value) {
        credentials['ownerName'] = value;
    },
    /**
     * Get owner shortname
     */
    get ownerShortname() {
        return credentials['ownerShortname'];
    },
    /**
     * Set owner shortname (it is not possible to detect it form location file)
     */
    set ownerShortname(value) {
        credentials['ownerShortname'] = value;
    },
    /**
     * Get owner photo url
     */
    get ownerPhotoUrl() {
        return credentials['ownerPhotoUrl'];
    },
    /**
     * Set owner photo url (it is not possible to detect it form location file)
     */
    set ownerPhotoUrl(value) {
        credentials['ownerPhotoUrl'] = value;
    },
    /**
     * Get credentials for active user.
     * Credentials contains email, username, lint to picture and cookies.
     * You can save this data to authenticate on google without password next time (using cookies).
     */
    get credentials() {
        return credentials;
    },
    /**
     * If you set credentials before call authentication, you can skip most of authentication steps.
     * Cookies from credentials data will be used to verify user identity on google servers.
     */
    set credentials(value) {
        credentials = value;
    },
    /**
     * Requests should not be too frequent.
     * The time interval between each request are set to this minimum value in seconds (default 60).
     * If the request for location is call in shortest time, then the last stored location data is returned.
     */
    get minimalRequestTimeInterval() {
        return minimalRequestTimeInterval;
    },
    /**
     * Set minimal interval for location request to google maps.
     */
    set minimalRequestTimeInterval(value) {
        minimalRequestTimeInterval = value;
    },
    /**
     * The earliest time when a new value can be requested from google maps and returned as new result.
     */
    get nextRequestAfter() {
        return nextRequestAfter || new Date();
    },
    /**
     * Load location data for authenticated user (not only for other users).
     */
    get showOwnerLocation() {
        return showOwnerLocation;
    },
    /**
     * If true (default), first item in location data will be active user location (if it is known to google).
     * If false, only shared location data for other users will be returned.
     */
    set showOwnerLocation(value) {
        showOwnerLocation = value;
    },
    /**
     * Reset account data.
     */
    resetAccount() {
        credentials['email'] = '';
        credentials['ownerId'] = '';
        credentials['ownerName'] = '';
        credentials['ownerShortname'] = '';
        credentials['ownerPhotoUrl'] = '';
    },
    /**
     * Reset authentication status (clear cookies and set authenticated to false).
     * If you need cancel second step from 2FA, you can call this method to clear authentication data.
     */
    resetAuthentication() {
        credentials['authenticated'] = false;
        credentials['cookies'] = {};
    },
    /**
     * Reset last location data.
     */
    resetLocationData() {
        lastSharedLocation = null;
    },
    /**
     * Reset credentials (login and password), authentication (cookies) and last location data.
     */
    reset() {
        this.resetAccount();
        this.resetAuthentication();
        this.resetLocationData();
    },

    /**
     * Authenticate on google accounts service.
     */
    async authenticate() {
        return new Promise((resolve, reject) => {
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
                if (data['authenticated']) {
                    googlePassword = '';
                }
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
        if (lastSharedLocation && nextRequestAfter && nextRequestAfter > new Date()) {
            return Promise.resolve(lastSharedLocation);
        }
        return new Promise((resolve, reject) => {
            this.authenticate().then(loggedIn => {
                    if (!loggedIn) {
                        reject('Not authenticated');
                        return Promise.reject();
                    }
                    return getSharedLocations();
                })
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
function getCookies() {
    if (!credentials['cookies']) {
        return {};
    }
    let cookieStr = '';
    for (var cookie in credentials['cookies']) {
        cookieStr += cookie + '=' + credentials['cookies'][cookie] + ';'
    }
    return {
        "Cookie": cookieStr.slice(0, -1)
    };
}

/**
 * Save cookies as key value.
 */
function setCookies(cookies, clearFirst = false) {
    if (clearFirst) {
        credentials['cookies'] = {};
    }
    if (!cookies) {
        return;
    }
    cookies.forEach(cookie => {
        const [
            key,
            value,
        ] = cookie.split(';')[0].split('=');
        credentials['cookies'][key] = value;
    });
}

/**
 * Check if cookie is defined.
 */
function checkCookie(cookieKey) {
    return credentials['cookies'][cookieKey] !== undefined;
}

/**
 * Open intial page and get GAPS cookie.
 * Extract login form.
 */
function connectStage1() {
    const stage = 'stage 1';
    if (credentials['authenticated'] || stageData['twoFactorConfirmation']) {
        return Promise.resolve(credentials);
    }
    return new Promise((resolve, reject) => {
        request({
            url: "https://accounts.google.com/ServiceLogin",
            headers: {
                ...getCookies(),
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
                credentials['authenticated'] = true;
                return resolve(credentials);
            }
            if (response.statusCode !== 200) {
                if (showStage) {
                    console.warn(response, stage + ' status code ' + response.statusCode);
                }
                return reject(new Error('Response not OK'));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookies(response.headers['set-cookie'], true);
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
            return resolve(credentials);
        });
    });
}

/**
 * Get GAPS and GALX cookies. Now we have the Google login form for set user name.
 * Check for signin form with password input box.
 */
function connectStage2() {
    const stage = 'stage 2';
    if (credentials['authenticated'] || stageData['twoFactorConfirmation']) {
        return Promise.resolve(credentials);
    }
    if (!stageData['form']) {
        if (showStage) {
            console.warn(stageData, stage + ' missing form');
        }
        return Promise.reject(new Error('Missing form'));
    }
    stageData['form']['Email'] = credentials['email'];
    return new Promise((resolve, reject) => {
        request({
            url: "https://accounts.google.com/signin/v1/lookup",
            headers: {
                ...getCookies(),
                "Referer": "https://accounts.google.com/ServiceLogin?rip=1&nojavascript=1",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: stageData['form']
        }, function (err, response, body) {
            delete stageData['form'];
            if (err || !response) {
                if (showStage) {
                    console.warn(err, stage + ' request/response error');
                }
                return reject(new Error('Request error'));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookies(response.headers['set-cookie']);
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
            return resolve(credentials);
        });
    });
}

/**
 * We have the GAPS cookie and the GALX identifier.
 * Start username and password challenge now.
 */
function connectStage3() {
    const stage = 'stage 3';
    if (credentials['authenticated'] || stageData['twoFactorConfirmation']) {
        return Promise.resolve(credentials);
    }
    if (!stageData['form']) {
        if (showStage) {
            console.warn(stageData, stage + ' missing form');
        }
        return Promise.reject(new Error('Missing form'));
    }
    stageData['form']['Passwd'] = googlePassword;
    return new Promise((resolve, reject) => {
        request({
            url: "https://accounts.google.com/signin/challenge/sl/password",
            headers: {
                ...getCookies(),
                "Referer": "https://accounts.google.com/signin/v1/lookup",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: stageData['form']
        }, function (err, response, body) {
            delete stageData['form'];
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
                setCookies(response.headers['set-cookie']);
                if (checkCookie('SID')) {
                    credentials['authenticated'] = true;
                    return resolve(credentials);
                }
            }
            if (response.headers['location']) {
                if (showStage) {
                    console.warn('Possible 2FA. Try to call again with twoFactorConfirmation = true, after confirmation on mobile phone.');
                }
                stageData['url'] = response.headers['location'];
                stageData['referer'] = response.request.href;
                return resolve(credentials);
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
    if (credentials['authenticated'] || stageData['twoFactorConfirmation']) {
        return Promise.resolve(credentials);
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
                ...getCookies(),
                "Referer": stageData['referer'],
                "Origin": "https://accounts.google.com"
            },
            method: "GET"
        }, function (err, response, body) {
            delete stageData['url'];
            delete stageData['referer'];
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
                setCookies(response.headers['set-cookie']);
                if (checkCookie('SID')) {
                    credentials['authenticated'] = true;
                    return resolve(credentials);
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
                    stageData['action'] = (challenge.form['attribs']['action'] || '').startsWith('http') ?
                        challenge.form['attribs']['action'] :
                        'https://accounts.google.com' + (challenge.form['attribs']['action'] || '');
                    stageData['form'] = $(challenge.form).serializeArray()
                        .reduce((r, x) => Object.assign({}, r, {
                            [x.name]: x.value,
                        }), {});
                    stageData['twoFactorConfirmation'] = true;
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
        return Promise.resolve(credentials);
    }
    if (!stageData['action'] || !stageData['form']) {
        if (showStage) {
            console.warn(stageData, stage + ' missing form');
        }
        credentials['authenticated'] = false;
        return Promise.reject(new Error('Nothing to follow'));
    }
    return new Promise((resolve, reject) => {
        request({
            url: stageData['action'],
            headers: {
                ...getCookies(),
                "Referer": "https://accounts.google.com/signin/challenge/sl/password",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: stageData['form']
        }, function (err, response, body) {
            delete stageData['action'];
            delete stageData['form'];
            if (err || !response) {
                if (showStage) {
                    console.warn(err, stage + ' request/response error');
                }
                credentials['authenticated'] = false;
                return reject(new Error('Request error'));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                if (showStage) {
                    console.warn(error, stage + ' error message on webpage');
                }
                credentials['authenticated'] = false;
                return reject(new Error('Error on webpage'));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookies(response.headers['set-cookie']);
            } else {
                if (showStage) {
                    console.warn(response.headers, stage + ' missing set-cookie header');
                }
                credentials['authenticated'] = false;
                return reject(new Error('No cookies'));
            }
            credentials['authenticated'] = checkCookie('SID');
            return resolve(credentials);
        });
    })
}

/**
 * Return shared location from google map for authenticated user.
 */
function getSharedLocations() {
    const requestTime = new Date();
    nextRequestAfter = new Date(requestTime.getTime() + minimalRequestTimeInterval * 1000)
    return new Promise((resolve, reject) => {
        request({
            url: "https://www.google.com/maps/preview/locationsharing/read",
            headers: {
                ...getCookies()
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
                "battery": data[13] && data[13][1] || null,
                "lastupdateepoch": data[1] && data[1][2]
            }));
            // google account owner location data
            if (showOwnerLocation) {
                const activeUserData = locationData[9] && {
                    "id": credentials['ownerId'] || '0',
                    "name": credentials['ownerName'],
                    "shortname": credentials['ownerShortname'],
                    "visible": locationData[8] != null,
                    "lat": locationData[9] && locationData[9][1] && locationData[9][1][1] && locationData[9][1][1][2],
                    "lng": locationData[9] && locationData[9][1] && locationData[9][1][1] && locationData[9][1][1][1],
                    "locationname": locationData[9] && locationData[9][1] && locationData[9][1][4],
                    "photoURL": credentials['ownerPhotoUrl'],
                    "battery": undefined,
                    "lastupdateepoch": locationData[8]
                };
                if (activeUserData) {
                    users.push(activeUserData);
                }
            }

            if (users.length > 0)
                return resolve(users);
            else
                return resolve([]);
        });
    })
}