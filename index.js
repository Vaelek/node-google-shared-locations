const request = require('request')
const cheerio = require('cheerio')

const savedCookies = {
    'google.com': {}
}

module.exports = {
    AUTHENTICATED: false,
    credentials : {
        username: 'someuser1234@gmail.com',
        password: 'somepassword'
    },

    async authenticate() {
        this.AUTHENTICATED = true;
        // console.log('Authenticating');
        // console.log('connectFirstStage');
        const googleEmailForm = await connectFirstStage(savedCookies);
        googleEmailForm['Email'] = this.credentials.username;
        // console.log('connectSecondStage')
        const googlePasswordForm = await connectSecondStage(savedCookies, googleEmailForm);
        googlePasswordForm['Passwd'] = this.credentials.password;
        // console.log('connectThirdStage')
        await connectThirdStage(savedCookies, googlePasswordForm);
        return 'ok';
    },

    async getLocations() {
        if (!this.AUTHENTICATED) {
            // console.log('Not authenticated yet');
            await this.authenticate();
        }

        // console.log('getting locations');
        const users = await getSharedLocations(savedCookies);
        return users;

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
 * 
 * If logins are being blocked, navigate to the following link and click allow
 * just before triggering the script.
 * 
 * https://accounts.google.com/b/0/DisplayUnlockCaptcha
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
                // no connection
                reject(err);
            } else {
                // connection successful
                // connection established but something went wrong
                if (response.statusCode !== 200) {
                    reject(err);
                } else {
                    // save cookies etc.
                    if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                        setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
                    } else {
                        reject(new Error('Google Authentication Stage 1 no Set-Cookie header'))
                    }
                    // first simply get all form fields
                    const $ = cheerio.load(response.body);
                    // console.log($.text().replace(/^\s+\n+/gm, '').replace(/Privacy[\w\W]+$/, ''));
                    const error = $('.error-msg').text().trim();
                    if (error) {
                        reject(new Error(error));
                    }
                    const googleEmailForm = $("form").serializeArray()
                        .reduce((r, x) => Object.assign({}, r, {
                            [x.name]: x.value,
                        }), {});
                    resolve(googleEmailForm);
                }
            }
        });
    });
}

/**
 * We have the GAPS cookie and the glx identifier,
 * Start username nad password challenge now.
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
                // no connection
                reject(err);
            } else {
                // connection successful
                // save cookies etc.
                if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                    setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
                } else {
                    reject(new Error('Google Authentication Stage 2 no Set-Cookie header'))
                }
                // first simply get all form fields
                const $ = cheerio.load(response.body);
                // console.log($.text().replace(/^\s+\n+/gm, '').replace(/Privacy[\w\W]+$/, ''));
                const error = $('.error-msg').text().trim();
                if (error) {
                    reject(new Error(error));
                }
                const googlePasswordForm = $("form").serializeArray()
                    .reduce((r, x) => Object.assign({}, r, {
                        [x.name]: x.value,
                    }), {});
                resolve(googlePasswordForm);
            }
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
                // no connection
                reject(err);
            } else {
                // connection successful
                // save cookies etc.
                const $ = cheerio.load(response.body);
                // console.log($.text().replace(/^\s+\n+/gm, '').replace(/Privacy[\w\W]+$/, ''));
                // console.log(response.headers);
                const error = $('.error-msg').text().trim();
                if (error) {
                    reject(new Error(error));
                }
                if (response.hasOwnProperty('headers') && response.headers.hasOwnProperty('set-cookie')) {
                    setCookie(savedCookies, response.headers['set-cookie'], 'google.com');
                } else {
                    reject(new Error('Google Authentication Stage 3 no Set-Cookie header'))
                }
                resolve();
            }
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
                reject(err);
            } else {
                // connection successful
                // connection established but auth failure
                if (response.statusCode !== 200) {
                    reject(new Error(`locationsharing responded with HTTP Status ${response.statusCode}`));
                } else {
                    // Parse and save user locations
                    const locationdata = JSON.parse(body.split('\n').slice(1, -1).join(''));
                    // debugger
                    // Shared location data is contained in the first element
                    const perlocarr = locationdata[0] || [];
                    const users = perlocarr.map(data => ({
                        "id": data[0][0],
                        "photoURL": data[0][1],
                        "name": data[0][3],
                        "lat": data[1] && data[1][1][2],
                        "latitude": data[1] && data[1][1][2],
                        "lng": data[1] && data[1][1][1],
                        "long": data[1] && data[1][1][1],
                        "longitude": data[1] && data[1][1][1],
                        "locationname": data[1] && data[1][4],
                        "shortname": data[6] && data[6][3],
                        "lastupdateepoch": data[1] && data[1][2],
                        "lastupdate": data[1] && new Date(new Date(0).setUTCSeconds(data[1][2].toString().substring(0,10)))
                    }));
                    // console.log(users)
                    if (users.length > 0)
                        resolve(users);
                    else 
                        reject('No results');
                }
            }
        });
    })
}
