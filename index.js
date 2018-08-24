const request = require('request');
const cheerio = require('cheerio');

const savedCookies = {
    'google.com': {}
}
/**
 * Challenges supported by this script sort by priority.
 * Known methods:
 * az/4 - verification by phone
 * totp/2 - Google Authenticator
 */
const supportedChallenges = ['az/4'];
let nextSubmitForm = null;
let showStage = false;

module.exports = {

    /**
     * Authentication status
     */
    authenticated: false,
    /**
     * Credetntials for login process to google account
     */
    credentials: {
        username: '',
        password: ''
    },
    /**
     * Last detected shared location from google map
     */
    lastSharedLocation: null,
    /**
     * Stage number is visible in console before any error, if debuging is enabled.
     */
    set debuging(state) {
        showStage = state;
    },

    /**
     * Authenticate on google accounts service.
     */
    async authenticate(twoFactorConfirmation = false) {
        return new Promise((resolve, reject) => {
            if (this.authenticated) {
                return resolve(true);
            }
            if (!twoFactorConfirmation) {
                connectStage1(savedCookies).then(googleEmailForm => {
                    googleEmailForm['Email'] = this.credentials.username;
                    return connectStage2(savedCookies, googleEmailForm);
                }, reject1 => {
                    console.info('If logins are being blocked, try to allow it here: https://accounts.google.com/b/0/DisplayUnlockCaptcha');
                    reject(reject1);
                    return Promise.reject();
                }).then(googlePasswordForm => {
                    googlePasswordForm['Passwd'] = this.credentials.password;
                    return connectStage3(savedCookies, googlePasswordForm);
                }, reject2 => {
                    reject(reject2);
                    return Promise.reject();
                }).then(redirect => {
                    return connectStage4(redirect);
                }, reject3 => {
                    reject(reject3);
                    return Promise.reject();
                }).then(() => {
                    this.authenticated = true;
                    return resolve(true);
                }, reject4 => {
                    reject(reject4);
                });
            } else {
                connectFourthStage(nextSubmitForm).then(authenticated => {
                    if (authenticated) {
                        this.authenticated = true;
                        return resolve(true);
                    }
                    return reject(new Error('Verification unsuccessful'));
                });
            }
        });
    },

    /**
     * Get shared location from google map.
     * Try to authenicate if is not authenticated already.
     */
    async getLocations(twoFactorConfirmation = false) {
        return new Promise((resolve, reject) => {
            this.authenticate(twoFactorConfirmation).then(
                    authenticateResult => {
                        if (!authenticateResult) {
                            reject('Not authenticated');
                            return Promise.reject();
                        }
                        return getSharedLocations(savedCookies);
                    }
                )
                .then(data => {
                    this.lastSharedLocation = data;
                    return resolve(data);
                })
                .catch(failure => {
                    this.authenticated = false;
                    this.lastSharedLocation = null;
                    return reject(failure);
                });
        });
    }
}

/**
 * Compose the header cookie data.
 */
function getCookie(savedCookies, domain) {
    let cookieStr = '';
    for (var curcookie in savedCookies[domain]) {
        cookieStr = cookieStr + curcookie + '=' + savedCookies[domain][curcookie] + ';'
    }
    return cookieStr.slice(0, -1);
}

/**
 * Save cookies from Google.
 */
function setCookie(savedCookies, cookies, domain) {
    cookies.forEach(cookie => {
        const [
            key,
            value,
        ] = cookie.split(';')[0].split('=');
        savedCookies[domain][key] = value;
    });
}

/**
 * Open intial page and get GAPS cookie.
 * Extract login form.
 */
function connectStage1(savedCookies) {
    const stage = 'stage 1';
    return new Promise((resolve, reject) => {
        // first get GAPS cookie
        request({
            url: "https://accounts.google.com/ServiceLogin",
            headers: {
                "Upgrade-Insecure-Requeste": "1",
                "Connection": "keep-alive"
            },
            method: "GET",
            qs: {
                "rip": "1",
                "nojavascript": "1",
                "flowName": "GlifWebSignIn",
                "flowEntry": "ServiceLogin"
            }
        }, function (err, response, body) {
            if (err || !response) {
                if (showStage) {
                    console.warn(err, stage + ' request/response error');
                }
                return reject(new Error('Request error'));
            }
            if (response.statusCode !== 200) {
                if (showStage) {
                    console.warn(response, stage + ' status code ' + response.statusCode);
                }
                return reject(new Error('Response not OK'));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
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
            return resolve(googleEmailForm);
        });
    });
}

/**
 * Get GAPS and GALX cookies. Now we have the Google login form for set user name.
 * Check for signin form with password input box.
 */
function connectStage2(savedCookies, googleEmailForm) {
    const stage = 'stage 2';
    return new Promise((resolve, reject) => {
        request({
            url: "https://accounts.google.com/signin/v1/lookup",
            headers: {
                "Cookie": getCookie(savedCookies, 'google.com'),
                "Referer": "https://accounts.google.com/ServiceLogin?rip=1&nojavascript=1",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: googleEmailForm
        }, function (err, response, body) {
            if (err || !response) {
                if (showStage) {
                    console.warn(err, stage + ' request/response error');
                }
                return reject(new Error('Request error'));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
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
            return resolve(googlePasswordForm);
        });
    });
}

/**
 * We have the GAPS cookie and the GALX identifier.
 * Start username and password challenge now.
 */
function connectStage3(savedCookies, googlePasswordForm) {
    const stage = 'stage 3';
    return new Promise((resolve, reject) => {
        request({
            url: "https://accounts.google.com/signin/challenge/sl/password",
            headers: {
                "Cookie": getCookie(savedCookies, 'google.com'),
                "Referer": "https://accounts.google.com/signin/v1/lookup",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: googlePasswordForm
            // followAllRedirects: true
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
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
                if (savedCookies['google.com']['SID'] !== undefined) {
                    return resolve({
                        url: '',
                        referer: ''
                    });
                }
            }
            if (response.headers['location']) {
                if (showStage) {
                    console.warn('Possible 2FA. Try to call again with twoFactorConfirmation = true, after confirmation on mobile phone.');
                }
                return resolve({
                    url: response.headers['location'],
                    referer: response.request.href
                });
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
 * @param {{url: string, referer: string}} urlData 
 */
function connectStage4(urlData) {
    const stage = 'stage 4';
    if (!urlData || (urlData.url || '') === '') {
        return Promise.resolve(true);
    }
    return new Promise((resolve, reject) => {
        request({
            url: urlData.url,
            headers: {
                "Cookie": getCookie(savedCookies, 'google.com'),
                "Referer": "https://accounts.google.com/signin/challenge/sl/password",
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
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
                if (savedCookies['google.com']['SID'] !== undefined) {
                    return resolve(true);
                }
            }
            var challenge = null;
            var forms = $('form');
            // TODO:
            // takze tuto najprv skontrolovat ci ide o rozhodovaciu stranku, alebo len potvrdzovaciu formu.
            // ak je forma typu potvrdenie na telefone, tak skoncim a cakam na opatovne zavolanie
            // autentifikacie bez akejkolvek hodnoty .. potvrdte Yes na telefone a skuste znova
            // (ako vstup by som mal chciet string)
            // ak je to google autentifikator, tak cakam na opatovne zavolanie s autentifikacnym kodom
            // ak je to hocico ine, koncim ako neznamy druh autentifikacie
            if (forms.length > 0) {
                const challenges = supportedChallenges.map(s => {
                    const form = forms.toArray().find(f => (f['attribs'] && f['attribs']['action'] || '').endsWith(s));
                    return {
                        exists: form != null,
                        challengeSuffix: s,
                        challengeType: getChallengeType(s),
                        form: form
                    };
                });
                // tu je potrebne vybrat prvy zaznam kde challenge exists .. a podla typu bud potvrdit, alebo resolvnut
                // a na naslednej adrese zadat kod
                if (challenges) {
                    challenge = challenges
                }

                const forms = $("form").filter((i, f) => {
                    return supportedChallenges.some((s) => {
                        return (f['attribs'] && f['attribs']['action']).endsWith(s);
                    });
                });
                if (forms) {
                    challenge = supportedChallenges.map((s) => {
                        const form = forms.find((f) => (f['attribs'] && f['attribs']['action']).endsWith(s));
                        return {
                            exists: form != null,
                            challengeSuffix: s,
                            challengeType: getChallengeType(s),
                            form: form
                        };
                    }).find((c) => c.exists);
                }
                if (challenge == null) {
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

            switch (challenge.challengeSuffix) {
                case 'az/4':
                    if (showStage) {
                        console.warn(challenge, stage + ' waiting for verification by cell phone');
                    }
                    nextSubmitForm = {
                        form: form.serializeArray(),
                        action: form[0]['attribs']['action'] || '',
                        method: form[0]['attribs']['method'] || ''
                    };
                    return reject(new Error('Cell phone verification'));
                default:
                    break;
            }
        });
    });
}

/**
 * Map challenge to full description
 * @param {string} challengeSuffix 
 */
function getChallengeType(challengeSuffix) {
    switch (challengeSuffix) {
        case 'az/4':
            return 'Cell phone verification';
        case 'totp/2':
            return 'Google Authenticator';
        default:
            return '';
    }
}

/**
 * Submit form after cell phone verification is done
 */
function connectStage5() {
    const stage = 'stage 5';
    if (!nextSubmitForm || !nextSubmitForm.form) {
        if (showStage) {
            console.warn(nextSubmitForm, stage + ' nextSubmitForm is not set');
        }
        return Promise.reject(new Error('Nothing to follow'));
    }
    return new Promise((resolve, reject) => {
        request({
            url: nextSubmitForm.action,
            headers: {
                "Cookie": getCookie(savedCookies, 'google.com'),
                "Referer": "https://accounts.google.com/signin/challenge/sl/password",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: nextSubmitForm.form
        }, function (err, response, body) {
            if (err || !response) {
                return reject(new Error('Response error (5): ' + err));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                return reject(new Error('Data error (5): ' + error));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
            } else {
                return reject(new Error('No Set-Cookie header (5)'));
            }
            return resolve(savedCookies['google.com']['SID'] !== undefined);
        });
    })
}

function getSharedLocations(savedCookies) {
    return new Promise((resolve, reject) => {
        request({
            url: "https://www.google.com/maps/preview/locationsharing/read",
            headers: {
                "Cookie": getCookie(savedCookies, 'google.com')
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
            const locationdata = JSON.parse(body.split('\n').slice(1, -1).join(''));
            // Shared location data is contained in the first element
            const perlocarr = locationdata[0] || [];
            const users = perlocarr.map(data => ({
                "id": data[0][0],
                "photoURL": data[0][1],
                "name": data[0][3],
                "lat": data[1] && data[1][1][2],
                "lng": data[1] && data[1][1][1],
                "locationname": data[1] && data[1][4],
                "shortname": data[6] && data[6][3],
                "lastupdateepoch": data[1] && data[1][2],
                "lastupdate": data[1] && new Date(new Date(0).setUTCSeconds(data[1][2].toString().substring(0, 10)))
            }));
            if (users.length > 0)
                return resolve(users);
            else
                return resolve([]); // resolve empty array if no data

        });
    })
}