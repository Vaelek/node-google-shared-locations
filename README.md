# Google Shared Locations

Google Shared Locations provides a NodeJS interface to reading location information from people that share theirs with you. It is a workaround for official Google maps API for Shared Locations that does not exist.

_Warning: As there is no API, you can not use the API key. You must enter your Google Account login, so be careful._

Based on [ioBroker.google-sharedlocation](<https://github.com/t4qjXH8N/ioBroker.google-sharedlocation>)

## Installation

`npm install google-location-sharing`

or

`yarn add google-location-sharing`

## Sample Usage

Minimal example of usage:

```js
const GoogleSharedLocations = require('google-location-sharing');

GoogleSharedLocations.credentials = {
    username: 'googleAccountEmail',
    password: 'googleAccountPassword'
}

GoogleSharedLocations.getLocations()
    .then(result => {
        console.log(result);
    })

    .catch(err => {
        console.log(`There was an error! ${err}`);
    });
```

_For a complete example of how to use this library, save and re-load cookies, see file `check.js` in the `tests` directory._

### Return data

Array of objects with localization data.

```javascript
[{
  id: "5481211564887755445",
  photoURL: "https://lh5.googleusercontent.com/-vEAEVdfwF/BBAACEE/EEASEASERR/6484EWAF/photo.jpg",
  name: "Bob Jones",
  lat: 40.682825,
  lng: -73.93883,
  locationname: "Brooklyn, NY 11206, USA",
  shortname: "Bob",
  lastupdateepoch: 1531057287792,
  lastupdate: "2018-07-08T13:41:27.000Z"
}, {
  id: "456458852120012354697",
  photoURL: "https://lh3.googleusercontent.com/-eafwef-F4/EWEFAF/VVVVVVAWE/fewa_3482f/photo.jpg",
  name: "Eric Draven",
  lat: 47.657484,
  lng: -122.329041,
  locationname: "4100-4198 Eastern Ave, Seattle, WA 98103, USA",
  shortname: "Eric",
  lastupdateepoch: 1531054742192,
  lastupdate: "2018-07-08T12:59:02.000Z"
}]
```

### Note

On first run, a full login will be performed to establish the cookie.  
After this, subsequent calls to `getLocations()` (within the same run) will use the cookie.  
You can save and load cookies in your own code to be persistent, an example of how to do it is in the `check.js` file.

## Testing

### Unit and integration testing

`npm run test`

### Functional test for real use case

To test this library with real account you need to call this script from project root directory: `node check.js <googleAccountEmail> [googleAccountPassword] [--options]`

This command runs authentication, to obtain shared location. It returns time logs, cookies and shared locations for user on input. If you use `--save-cookies` parameter, you can next time use `--load-cookies` and reduce time for get location data (skip authentication).
