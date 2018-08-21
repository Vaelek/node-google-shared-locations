const request = require('request');
const cheerio = require('cheerio');

const savedCookies = {
    'google.com': {}
}

module.exports = {
    AUTHENTICATED: false,
    credentials: {
        username: '',
        password: ''
    },

    async authenticate() {
        return new Promise((resolve, reject) => {
            if (this.AUTHENTICATED) {
                return resolve(true); // return to skip connection stages
            }
            connectFirstStage(savedCookies).catch(firstStageError => {
                console.warn('If logins are being blocked, try to allow it here: https://accounts.google.com/b/0/DisplayUnlockCaptcha');
                reject(firstStageError);
                throw new Error(firstStageError); // throw to skip next stages
            }).then(googleEmailForm => {
                googleEmailForm['Email'] = this.credentials.username;
                return connectSecondStage(savedCookies, googleEmailForm);
            }).then(googlePasswordForm => {
                googlePasswordForm['Passwd'] = this.credentials.password;
                return connectThirdStage(savedCookies, googlePasswordForm);
            }).then(redirection => {
                return connectFourthStage(redirection);
            }).then(() => {
                this.AUTHENTICATED = true;
                resolve(true);
            }).catch(failure => {
                console.error('Authentification to Google failed.');
                reject(failure);
            });
        });
    },

    async getLocations() {
        return new Promise((resolve, reject) => {
            this.authenticate().then(() => {
                return getSharedLocations(savedCookies);
            }).then(data => {
                resolve(data);
            }).catch(failure => {
                reject(failure);
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
 * Connect to Google, call login page
 * What we get here:
 * - GAPS cookie
 * - glx form identifier
 */
function connectFirstStage(savedCookies) {
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
                return reject(new Error('Stage 1 response error: ' + err));
            }
            if (response.statusCode !== 200) {
                // connection established but something went wrong
                return reject(new Error('Stage 1 response status error: HTTP Status ' + response.statusCode));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
            } else {
                return reject(new Error('Stage 1 no Set-Cookie header'));
            }
            // get all form fields
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                return reject(new Error('Stage 1 data error: ' + error));
            }
            const googleEmailForm = $("form").serializeArray()
                .reduce((r, x) => Object.assign({}, r, {
                    [x.name]: x.value,
                }), {});
            resolve(googleEmailForm);
        });
    });
}

/**
 * We have the Google email form
 * Now check for signin form with password
 */
function connectSecondStage(savedCookies, googleEmailForm) {
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
                return reject(new Error('Stage 2 response error: ' + err));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
            } else {
                return reject(new Error('Stage 2 no Set-Cookie header'))
            }
            // get all form fields
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                return reject(new Error('Stage 2 data error: ' + error));
            }
            const googlePasswordForm = $("form").serializeArray()
                .reduce((r, x) => Object.assign({}, r, {
                    [x.name]: x.value,
                }), {});
            resolve(googlePasswordForm);
        });
    });
}

/**
 * We have the GAPS cookie and the glx identifier,
 * Start username and password challenge now.
 */
function connectThirdStage(savedCookies, googlePasswordForm) {
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
        }, function (err, response, body) {
            if (err || !response) {
                return reject(new Error('Stage 3 response error: ' + err));
            }
            const $ = cheerio.load(response.body);
            const error = $('.error-msg').text().trim();
            if (error) {
                return reject(new Error('Stage 3 data error: ' + error));
            }
            if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
            } else {
                // Possible 2FA
                // Wait for access and tray to continue?
                return reject(new Error('Stage 3 no Set-Cookie header'))
            }
            resolve('');
        });
    });
}


function connectFourthStage(redirection) {
    console.log(redirection, 'redirection');
    return new Promise((resolve, reject) => {
        if (redirection === '') {
            resolve();
        }
        request({
            url: redirection,
            headers: {
                "Cookie": getCookie(savedCookies, 'google.com'),
                "Referer": "https://accounts.google.com/signin/challenge/sl/password",
                "Origin": "https://accounts.google.com"
            },
            method: "GET"
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
            resolve();
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
                resolve(users);
            else
                resolve([]); // resolve empty array if no data

        });
    })
}