const request = require('request');
const cheerio = require('cheerio');

const savedCookies = {
    'google.com': {}
}
let lastUrl = null;
let nextSubmitForm = null;

module.exports = {
    AUTHENTICATED: false,
    credentials: {
        username: '',
        password: ''
    },
    lastSharedLocation: null,

    /**
     * Authenticate on google.
     */
    async authenticate(twoFactorConfirmation = false) {
        return new Promise((resolve, reject) => {
            if (this.AUTHENTICATED) {
                return resolve(true);
            }
            if (!twoFactorConfirmation) {
                connectStage1(savedCookies).then(googleEmailForm => {
                    googleEmailForm['Email'] = this.credentials.username;
                    return connectStage2(savedCookies, googleEmailForm);
                }, reject1 => {
                    console.warn('If logins are being blocked, try to allow it here: https://accounts.google.com/b/0/DisplayUnlockCaptcha');
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
                }).then(redirect => {
                    return connectStage5(redirect);
                }, reject4 => {
                    reject(reject4);
                    return Promise.reject();
                }).then(authenticated => {
                    this.AUTHENTICATED = true;
                    return resolve(authenticated);
                }, reject5 => {
                    reject(reject5);
                });
            } else {
                connectFourthStage(nextSubmitForm).then(authenticated => {
                    if (authenticated) {
                        this.AUTHENTICATED = true;
                        return resolve(true);
                    }
                    return reject(new Error('2FA unsuccessful'));
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
                    this.AUTHENTICATED = false;
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
                return reject(new Error('Response error (1): ' + err));
            }
            if (response.statusCode !== 200) {
                // connection established but something went wrong
                return reject(new Error('Response status code ' + response.statusCode));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
            } else {
                return reject(new Error('No Set-Cookie header (1)'));
            }
            // get all form fields
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                return reject(new Error('Data error (1): ' + error));
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
                return reject(new Error('Response error (2): ' + err));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
            } else {
                return reject(new Error('No Set-Cookie header (2)'))
            }
            // get all form fields
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                return reject(new Error('Data error (2): ' + error));
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
                return reject(new Error('Response error (3): ' + err));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                return reject(new Error('Data error (3): ' + error));
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
                // console.warn('Possible 2FA. Try to call again with twoFactorConfirmation = true, after confirmation on mobile phone.');
                return resolve({
                    url: response.headers['location'],
                    referer: response.request.href
                });
            }
            return reject(new Error('No Set-Cookie header (3)'));
        });
    });
}

/**
 * Check if we need to redirect for 2FA confirmation.
 * If there is only one form after redirect, user need to click "Yes" confirmation on phone.
 * If there is multiple forms, google asks for exact confirmation type (this script try to call first)
 * @param {{url: string, referer: string}} urlData 
 */
function connectStage4(urlData) {
    if (!urlData || (urlData.url || '') === '') {
        return Promise.resolve({
            url: '',
            referer: urlData.url
        });
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
                return reject(new Error('Response error (4): ' + err));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                return reject(new Error('Data error (4): ' + error));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
            }
            if ($('form').length === 1) {
                nextSubmitForm = $("form").serializeArray();
                return reject(new Error('Waiting for 2FA confirmation'));
            }
            if ($('form[method=POST]').length > 1) {
                let formsArray = $("form[method=POST]");
                formsArray.splice(1);
                nextSubmitForm = formsArray.serializeArray();
                return resolve({
                    url: "https://accounts.google.com" + formsArray[0]['attribs']['action'],
                    referer: response.request.href
                });
            }
            return reject(new Error('Unknown page'));
        });
    });
}

// TODO: neviem sa prihlasit ak sa to neda potvrdit pomocou mobilu

/**
 * Post form if url is set.
 * Return true if target cookie is found
 * @param {{url: string, referer: string}} urlData 
 */
function connectStage5(urlData) {
    if (!urlData || (urlData.url || '') === '') {
        return Promise.resolve(savedCookies['google.com']['SID'] !== undefined);
    }
    return new Promise((resolve, reject) => {
        request({
            url: urlData.url,
            headers: {
                "Cookie": getCookie(savedCookies, 'google.com'),
                "Referer": "https://accounts.google.com/signin/challenge/sl/password",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: nextSubmitForm
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


function connectFourthStage(nextSubmitForm) {
    return new Promise((resolve, reject) => {
        request({
            url: "https://accounts.google.com/signin/challenge/az/5",
            headers: {
                "Cookie": getCookie(savedCookies, 'google.com'),
                "Referer": "https://accounts.google.com/signin/challenge/sl/password",
                "Origin": "https://accounts.google.com"
            },
            method: "POST",
            form: nextSubmitForm
        }, function (err, response, body) {
            if (err || !response) {
                return reject(new Error('Stage 4 response error: ' + err));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                return reject(new Error('Stage 4 data error: ' + error));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
            } else {
                return reject(new Error('Stage 4 no Set-Cookie header'))
            }
            return resolve(true);
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