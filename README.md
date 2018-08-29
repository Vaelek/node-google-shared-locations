# Google Shared Locations

Google Shared Locations provides a NodeJS interface to reading location information from people that share theirs with you. It is a workaround for official Google maps API for Shared Locations that does not exist.

_Warning: As there is no API, you can not use the API key. You must enter your Google Account login, so be careful._

Based on [ioBroker.google-sharedlocation](<https://github.com/t4qjXH8N/ioBroker.google-sharedlocation>)

## Installation

```npm install google-location-sharing```

or

```yarn add google-location-sharing```

## Sample Usage

```js
const GoogleSharedLocations = require('google-location-sharing');

GoogleSharedLocations.credentials = {
    username: 'YourEmail@gmail.com',
    password: 'supersecretPassword'
}

GoogleSharedLocations.getLocations()
    .then(result => {
        console.log(result);
    })

    .catch(err => {
        console.log(`There was an error! ${err}`);
    });
```

### Example Return Data

```json
[{
  "id": 5481211564887755445,
  "photoURL": "https://lh5.googleusercontent.com/-vEAEVdfwF/BBAACEE/EEASEASERR/6484EWAF/photo.jpg",
  "name": "Bob Jones",
  "lat": 0.68282,
  "lng": 73.9388,
  "locationname": "Brooklyn, NY 11206, USA",
  "shortname": "Bob",
  "lastupdateepoch": 53105728779,
  "lastupdate": "018-07-08T13:41:27.00Z"
}, {
  "id": 456458852120012354697,
  "photoURL": "https://lh3.googleusercontent.com/-eafwef-F4/EWEFAF/VVVVVVAWE/fewa_3482f/photo.jpg",
  "name": "Eric Draven",
  "lat": 7.65748,
  "lng": 122.32904,
  "locationname": "4100-4198 Eastern Ave, Seattle, WA 98103, USA",
  "shortname": "Eric",
  "lastupdateepoch": 53105474219,
  "lastupdate": "018-07-08T12:59:02.00Z"
}]
```

### Note

On first run, a full login will be performed to establish the cookie.  
After this, subsequent calls to getLocations() will use the cookie.

## Testing

### Unit and integration testing

`npm run test`

### Functional test for real use case

Run from project root directory: `node tests/check.js YourEmail@gmail.com supersecretPassword`

This command runs the script twice, initially with authentication, and then uses cookies to obtain shared location without full authentication. It returns output with times and shared locations for selected user.
