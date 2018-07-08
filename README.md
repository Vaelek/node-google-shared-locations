# Google Shared Locations

Google Shared Locations provides a NodeJS interface to reading location information from people that share theirs with you.

Based on https://github.com/t4qjXH8N/ioBroker.google-sharedlocation

## Installation
```npm install google-shared-locations```

or

```yarn add google-shared-locations```

## Sample Usage

```js
const GoogleSharedLocations = require('/google-shared-locations');

GoogleSharedLocations.credentials = {
    username: 'YourEmail@gmail.com',
    password: 'supersecret'
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
```js
[ 
    { 
        id: '5481211564887755445',
        photoURL: 'https://lh5.googleusercontent.com/-vEAEVdfwF/BBAACEE/EEASEASERR/6484EWAF/photo.jpg',
        name: 'Bob Jones',
        lat: 40.682825,
        long: -73.93883,
        locationname: 'Brooklyn, NY 11206, USA',
        shortname: 'Bob',
        lastupdateepoch: 1531057287792,
        lastupdate: 2018-07-08T13:41:27.000Z },
    { 
        id: '456458852120012354697',
        photoURL: 'https://lh3.googleusercontent.com/-eafwef-F4/EWEFAF/VVVVVVAWE/fewa_3482f/photo.jpg',
        name: 'Eric Draven',
        lat: 47.657484,
        long: -122.329041,
        locationname: '4100-4198 Eastern Ave, Seattle, WA 98103, USA',
        shortname: 'Eric',
        lastupdateepoch: 1531054742192,
        lastupdate: 2018-07-08T12:59:02.000Z 
    } 
]
```
