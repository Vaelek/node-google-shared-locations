# Google Shared Locations

Google Shared Locations provides a NodeJS interface to reading location information from people that share theirs with you. It is a workaround for official Google maps API for Shared Locations that does not exist.

_Warning: As there is no official API, you can not use the API key. You must enter your main Google Account login, so be careful._

## Installation

`npm install google-location-sharing`  
or  
`yarn add google-location-sharing`

## Sample Usage

Minimal example of usage (_asynchronous call using Promise_):

```js
const gls = require('google-location-sharing');

gls.googleEmail = 'googleAccountEmail@gmail.com';
gls.googlePassword = 'googleAccountPassword';

gls.getLocations()
    .then(result => {
        console.log(result);
    })
    .catch(err => {
        console.log(`There was an error! ${err}`);
    });
```

Usage in a synchronous process: `locations = await gls.getLocations();`

_For a complete example of how to use this library, save and re-load cookies, see file `check.js` in the `tests` directory._

### Return data

Array of objects with localization data.

```javascript
[{
  id: "5481211564887755445",
  name: "Bob Jones",
  shortname: "Bob",
  visible: true,                 // whether this user is displayed on google maps
  lat: 40.682825,                // latitude: north–south position
  lng: -73.93883,                // longitude: east–west position
  locationname: "Brooklyn, NY 11206, USA",
  photoURL: "https://lh5.googleusercontent.com/-vEAEVdfwF/BBAACEE/EEASEASERR/6484EWAF/photo.jpg",
  battery: 25,                   // shared device battery status
  lastupdateepoch: 1531057287792 // last detection timestamp
}, {
  id: "456458852120012354697",
  name: "Eric Draven",
  shortname: "Eric",
  visible: true,
  lat: 47.657484,
  lng: -122.329041,
  locationname: "4100-4198 Eastern Ave, Seattle, WA 98103, USA",
  photoURL: "https://lh3.googleusercontent.com/-eafwef-F4/EWEFAF/VVVVVVAWE/fewa_3482f/photo.jpg",
  battery: 78,
  lastupdateepoch: 1531054742192
}]
```

### 2FA

**Supported only with 'Cell phone verification'** (not google authenticator).

If 2FA is detected, this code return error `'Cell phone verification'`.  
Then you get confirmation on your phone. After google ask you if you want to allow a new account login and you agree with that, you can call `gls.getLocations()` again and the code will continue running with the original credentials set in previous step. For full example see `check.js` file in `tests\` directory.

### Owner location

Google default returns the location of the people who share it with the account owner. Location of **account owner** is not set in the same part of location file. Extract from this file **does not contain information about the account owner**. You can customize this owner informations and set it to output array before call `gls.getLocations()` like this:

```javascript
gls.ownerId = '0123456789';
gls.ownerName = 'John Doe';
gls.ownerShortname = 'John';
gls.ownerPhotoUrl = 'http://images-for-google-users.com/0123456789.jpg';
```

These data become part of credentials, so if you store credentials from `gls.credentials` like (see example in `check.js` file) `storage.setItem('credentials_storage_key', gls.credentials)` you can load it by `gls.credentials = credentials;` then with all data for account owner.

### Notes

On first run, a full login will be performed to establish the cookie.  
After this, subsequent calls to `getLocations()` (within the same run - so, this is not persistent) will use the cookie.  
You can save and load cookies in your own code to be persistent, an example of how to do it is in the `check.js` file.

#### Links

Based on [ioBroker.google-sharedlocation](<https://github.com/t4qjXH8N/ioBroker.google-sharedlocation>) | [Your location sharing](<https://myaccount.google.com/locationsharing>) for Google maps

## Testing

### Unit and integration testing

`npm run test`

### Functional test for real use case

`node ./tests/check.js`

To test this library with real account you need to call this script from project root directory: `node ./tests/check.js <googleAccountEmail> [googleAccountPassword] [--options]`

This command runs authentication, to obtain shared location. It returns time logs, cookies and shared locations for user on input. If you use `--save` parameter, you can next time use `--load` and reduce time for get location data (skip authentication).

## Versions

### 2.0 breaking changes

- Code is full async.
- Output attributes clean up. New `battery` (battery status of device which share location) and `visible` (if user shared location is not too old and it should be displayed on Google maps) attributes. Removed `lastupdate`, `latitude`, `long` and `longitude` (duplicates). You can calculate original `lastupdate` from `lastupdateepoch` by calling `new Date(lastupdateepoch)` or `new Date(new Date(0).setUTCSeconds(data[1][2].toString().substring(0,10)))`.
- Updated for 2FA. After confirmation on your phone you can continue and get shared location data. See more in [2FA section](#2FA).
- Credentials object modification. Password for google account is write only.
